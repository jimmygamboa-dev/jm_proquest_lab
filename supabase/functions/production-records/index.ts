// =============================================================================
// EDGE FUNCTION: production-records
// Almacenamiento y consulta de las 9 etapas operativas JM Proquest V1
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface SaveRecordRequest {
  action?: 'save' | 'correct';
  stage:
    | 'posture'
    | 'incubation'
    | 'transfer'
    | 'sowing'
    | 'harvest'
    | 'cleaning'
    | 'washing_load'
    | 'washing_lot'
    | 'drying_run'
    | 'milling_run';
  payload: Record<string, any>;
  employee_code: string;
  // Campos en caso de corrección
  record_id?: string;
  reason?: string;
  supervisor_code?: string;
}

const STAGE_SEGMENTS: Record<string, number> = {
  posture: 1,
  incubation: 1,
  transfer: 1,
  sowing: 2,
  harvest: 2,
  cleaning: 2,
  washing_load: 3,
  washing_lot: 3,
  drying_run: 4,
  milling_run: 4,
};

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Configuración de Supabase incompleta' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ---------------------------------------------------------------------------
  // GET: Consultar registros por etapa o lote
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const stage = url.searchParams.get('stage');
    const segment = url.searchParams.get('segment');
    const limit = Number(url.searchParams.get('limit') || '50');

    let query = supabase.from('production_records').select('*').order('created_at', { ascending: false }).limit(limit);

    if (stage) query = query.eq('stage', stage);
    if (segment) query = query.eq('segment', Number(segment));

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ---------------------------------------------------------------------------
  // POST: Guardar o Corregir registros
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const body: SaveRecordRequest = await req.json();
      const { action = 'save', stage, payload, employee_code } = body;

      if (!stage || !payload) {
        return new Response(
          JSON.stringify({ success: false, error: 'Faltan parámetros obligatorios (stage o payload)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar empleado
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('employee_code, active, role')
        .eq('employee_code', employee_code)
        .single();

      if (empErr || !emp || !emp.active) {
        return new Response(
          JSON.stringify({ success: false, error: `Empleado ${employee_code} no existe o está inactivo` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ACCIÓN: CORRECCIÓN POR SUPERVISOR
      if (action === 'correct') {
        const { record_id, reason, supervisor_code } = body;
        if (!record_id || !reason) {
          return new Response(
            JSON.stringify({ success: false, error: 'Faltan datos de auditoría (record_id o reason)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Obtener payload anterior
        const { data: currentRec, error: curErr } = await supabase
          .from('production_records')
          .select('payload')
          .eq('id', record_id)
          .single();

        if (curErr || !currentRec) {
          return new Response(
            JSON.stringify({ success: false, error: 'Registro original no encontrado para corrección' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Registrar auditoría inmutable
        await supabase.from('corrections').insert({
          record_id,
          stage,
          supervisor_code: supervisor_code || employee_code,
          reason,
          old_payload: currentRec.payload,
          new_payload: payload,
        });

        // Actualizar registro original
        const { error: updErr } = await supabase
          .from('production_records')
          .update({
            payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record_id);

        if (updErr) {
          return new Response(
            JSON.stringify({ success: false, error: updErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Corrección registrada en auditoría', record_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ACCIÓN: GUARDADO REGULAR DE ETAPA
      const recordId = payload.id;
      if (!recordId) {
        return new Response(
          JSON.stringify({ success: false, error: 'El registro debe incluir un ID identificador único' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const segment = STAGE_SEGMENTS[stage] || 1;
      const recordDate = payload.date || payload.dateTime?.slice(0, 10) || new Date().toISOString().slice(0, 10);

      // Inserción atómica en tabla unificada
      const { data: savedData, error: saveErr } = await supabase
        .from('production_records')
        .upsert(
          {
            id: recordId,
            stage,
            segment,
            date: recordDate,
            employee_code,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (saveErr) {
        console.error('Error guardando registro:', saveErr);
        return new Response(
          JSON.stringify({ success: false, error: saveErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          id: recordId,
          stage,
          segment,
          data: savedData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err: any) {
      console.error('Excepción en production-records:', err);
      return new Response(
        JSON.stringify({ success: false, error: err.message || 'Error interno procesando registro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Método no soportado' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
