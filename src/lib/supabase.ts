// =============================================================================
// JM PROQUEST V1 - CLIENTE SUPABASE Y EJECUCIÓN RPC
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// -----------------------------------------------------------------------------
// WRAPPERS EDGE FUNCTIONS (DENO / SERVERLESS HTTP)
// -----------------------------------------------------------------------------

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no está configurado en las variables de entorno'),
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });
    if (error) {
      console.error(`Error en Edge Function ${functionName}:`, error);
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error(`Excepción en Edge Function ${functionName}:`, err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function edgeAuthLogin(pinOrCode: { pin?: string; employee_code?: string }) {
  return invokeEdgeFunction('auth-login', pinOrCode);
}

export async function edgeSaveRecord(
  stage: string,
  payload: any,
  employeeCode: string,
  action: 'save' | 'correct' = 'save',
  audit?: { record_id?: string; reason?: string; supervisor_code?: string }
) {
  return invokeEdgeFunction('production-records', {
    action,
    stage,
    payload,
    employee_code: employeeCode,
    ...audit,
  });
}

// -----------------------------------------------------------------------------
// WRAPPERS RPC CON MANEJO DE ERRORES Y ATOMICIDAD
// -----------------------------------------------------------------------------

export async function rpcCall<T = any>(
  fnName: string,
  params: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no está configurado en las variables de entorno'),
    };
  }

  try {
    const { data, error } = await supabase.rpc(fnName, params);
    if (error) {
      console.error(`Error en rpc.${fnName}:`, error);
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error(`Excepción en rpc.${fnName}:`, err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function rpcVerifyPin(pin: string) {
  return rpcCall('verify_pin', { p_pin: pin });
}

export async function rpcSavePosture(payload: any, employeeCode: string) {
  return rpcCall('save_posture', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveIncubation(payload: any, employeeCode: string) {
  return rpcCall('save_incubation', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveTransfer(payload: any, employeeCode: string) {
  return rpcCall('save_transfer', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveSowing(payload: any, employeeCode: string) {
  return rpcCall('save_sowing', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveHarvest(payload: any, employeeCode: string) {
  return rpcCall('save_harvest', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveCleaning(payload: any, employeeCode: string) {
  return rpcCall('save_cleaning', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveWashingLoad(payload: any, employeeCode: string) {
  return rpcCall('save_washing_load', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveDryingRun(payload: any, employeeCode: string) {
  return rpcCall('save_drying_run', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveMillingRun(payload: any, employeeCode: string) {
  return rpcCall('save_milling_run', { p_payload: payload, p_employee_code: employeeCode });
}

export async function rpcSaveCorrection(
  recordId: string,
  stage: string,
  newPayload: any,
  reason: string,
  supervisorCode: string
) {
  return rpcCall('save_correction', {
    p_record_id: recordId,
    p_stage: stage,
    p_new_payload: newPayload,
    p_reason: reason,
    p_supervisor_code: supervisorCode,
  });
}
