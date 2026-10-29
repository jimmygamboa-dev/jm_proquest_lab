// =============================================================================
// EDGE FUNCTION: auth-login
// Autenticación por PIN táctil para tablets y personal de planta JM Proquest
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface LoginPayload {
  pin?: string;
  employee_code?: string;
}

serve(async (req: Request) => {
  // Manejo de preflight CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno de Supabase en la Edge Function');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: LoginPayload = await req.json();

    const { pin, employee_code } = body;

    if (!pin && !employee_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Debe ingresar un PIN o código de empleado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Consulta de empleado activo
    let query = supabase.from('employees').select('*').eq('active', true);

    if (pin) {
      query = query.eq('pin', pin.trim());
    } else if (employee_code) {
      query = query.eq('employee_code', employee_code.trim().toUpperCase());
    }

    const { data: employees, error: dbError } = await query.limit(1);

    if (dbError) {
      console.error('Error consultando base de datos:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error interno validando credenciales' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employee = employees && employees[0];

    if (!employee) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN incorrecto o empleado inactivo en planta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar log de acceso en tablet (auditoría)
    const userAgent = req.headers.get('user-agent') || 'Tablet/Browser';
    const clientIp = req.headers.get('x-forwarded-for') || 'local';

    try {
      await supabase.from('login_logs').insert({
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        role: employee.role,
        user_agent: userAgent,
        ip_address: clientIp,
      });
    } catch (logErr) {
      console.warn('No se pudo registrar log de acceso:', logErr);
    }

    // Normalizar segmentos
    const segments = Array.isArray(employee.segments) && employee.segments.length > 0
      ? employee.segments
      : (employee.segment ? [employee.segment] : [1, 2, 3, 4]);

    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          id: employee.id,
          employee_code: employee.employee_code,
          full_name: employee.full_name,
          role: employee.role,
          segment: employee.segment || segments[0] || 1,
          segments,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Excepción en auth-login:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error en el servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
