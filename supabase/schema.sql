-- =============================================================================
-- JM PROQUEST V1 - ESQUEMA DE BASE DE DATOS Y FUNCIONES RPC (SUPABASE / POSTGRESQL)
-- =============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLA: EMPLOYEES (Personal de planta y accesos por PIN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(10) UNIQUE NOT NULL, -- 'E-01', 'E-02', etc.
    full_name VARCHAR(100) NOT NULL,
    pin VARCHAR(10) NOT NULL,                  -- PIN numérico de acceso rápido
    role VARCHAR(20) NOT NULL CHECK (role IN ('operator', 'supervisor', 'admin')),
    segment INT CHECK (segment BETWEEN 1 AND 4), -- Asignado para operadores (legacy)
    segments INT[] DEFAULT '{}',                 -- Secciones / Segmentos a los que puede trabajar
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: PROFILES (Vínculo con Supabase Auth si se requiere)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'operator',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: PRODUCTION_RECORDS (Almacenamiento atómico unificado por Etapa)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_records (
    id VARCHAR(50) PRIMARY KEY,                  -- Ej: 'P-2026-0001', 'I-2026-0001'
    stage VARCHAR(30) NOT NULL CHECK (stage IN (
        'posture', 'incubation', 'transfer', 
        'sowing', 'harvest', 'cleaning', 
        'washing_load', 'washing_lot', 'drying_run', 'milling_run'
    )),
    segment INT NOT NULL CHECK (segment BETWEEN 1 AND 4),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_code VARCHAR(10) NOT NULL,
    payload JSONB NOT NULL,                      -- Datos completos estructurados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_records_stage ON production_records(stage);
CREATE INDEX IF NOT EXISTS idx_prod_records_segment ON production_records(segment);
CREATE INDEX IF NOT EXISTS idx_prod_records_date ON production_records(date);
CREATE INDEX IF NOT EXISTS idx_prod_records_payload ON production_records USING gin (payload);

-- -----------------------------------------------------------------------------
-- 4. TABLA: CORRECTIONS (Historial y Auditoría de Supervisión)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id VARCHAR(50) NOT NULL REFERENCES production_records(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL,
    supervisor_code VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    old_payload JSONB NOT NULL,
    new_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_record ON corrections(record_id);

-- -----------------------------------------------------------------------------
-- 5. TABLA: LOGIN_LOGS (Auditoría de accesos por PIN en tablets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(10) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_employee ON login_logs(employee_code);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);

-- -----------------------------------------------------------------------------
-- 6. TABLA: SYSTEM_SETTINGS (Parámetros técnicos de planta)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserción de configuración por defecto
INSERT INTO system_settings (key, value) VALUES 
('plant_parameters', '{
    "eggsPerNest": 60000,
    "processTargetMinKg": 90,
    "processTargetMaxKg": 150,
    "bagCapacityKg": 9
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Inserción de empleados y credenciales PIN predeterminadas
INSERT INTO employees (employee_code, full_name, pin, role, segment, segments, active) VALUES
('E-01', 'Deyker (Operador Seg 1)', '1001', 'operator', 1, ARRAY[1], true),
('E-02', 'José (Administrador)', '9999', 'admin', NULL, ARRAY[1, 2, 3, 4], true),
('E-06', 'Amalia (Operador Seg 2)', '2001', 'operator', 2, ARRAY[2], true),
('E-07', 'Luis (Supervisor)', '9001', 'supervisor', NULL, ARRAY[1, 2, 3, 4], true),
('E-08', 'Carlos (Operador Seg 3-4)', '3001', 'operator', 3, ARRAY[3, 4], true),
('E-09', 'Operador Segmento 4', '4001', 'operator', 4, ARRAY[4], true)
ON CONFLICT (employee_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- POLÍTICAS RLS (Row Level Security)
-- -----------------------------------------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura anónimas controladas para intranet operativa
CREATE POLICY "Permitir lectura de empleados activos" ON employees
    FOR SELECT USING (active = true);

CREATE POLICY "Permitir inserción de logs de login" ON login_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura de producción" ON production_records
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserción y actualización de producción" ON production_records
    FOR ALL USING (true);

CREATE POLICY "Permitir lectura de configuraciones" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Permitir gestión de correcciones" ON corrections
    FOR ALL USING (true);

-- =============================================================================
-- FUNCIONES RPC ATÓMICAS (PL/pgSQL)
-- =============================================================================

-- 1. Verificación de PIN de acceso rápido
CREATE OR REPLACE FUNCTION verify_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_emp RECORD;
BEGIN
    SELECT * INTO v_emp FROM employees WHERE pin = p_pin AND active = true LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto o empleado inactivo');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'employee', jsonb_build_object(
            'id', v_emp.id,
            'employee_code', v_emp.employee_code,
            'full_name', v_emp.full_name,
            'role', v_emp.role,
            'segment', v_emp.segment,
            'segments', v_emp.segments
        )
    );
END;
$$;

-- 2. Guardar Postura (Etapa 1 · Segmento 1)
CREATE OR REPLACE FUNCTION save_posture(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
    v_nests INT;
    v_eggs_per_nest INT;
    v_egg_ceiling INT;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'date')::DATE;
    v_nests := (p_payload->>'nests')::INT;
    
    SELECT (value->>'eggsPerNest')::INT INTO v_eggs_per_nest 
    FROM system_settings WHERE key = 'plant_parameters';
    IF v_eggs_per_nest IS NULL THEN v_eggs_per_nest := 60000; END IF;

    v_egg_ceiling := v_nests * v_eggs_per_nest;
    p_payload := p_payload || jsonb_build_object(
        'eggsPerNestAtRecord', v_eggs_per_nest,
        'eggCeiling', v_egg_ceiling
    );

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'posture', 1, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id, 'payload', p_payload);
END;
$$;

-- 3. Guardar Incubación (Etapa 2 · Segmento 1)
CREATE OR REPLACE FUNCTION save_incubation(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := COALESCE((p_payload->>'actualBirth')::DATE, (p_payload->>'entryDate')::DATE, CURRENT_DATE);

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'incubation', 1, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 4. Guardar Salida a Cajas (Etapa 3 · Segmento 1)
CREATE OR REPLACE FUNCTION save_transfer(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'date')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'transfer', 1, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 5. Guardar Siembra en Cajones (Etapa 4 · Segmento 2)
CREATE OR REPLACE FUNCTION save_sowing(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'date')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'sowing', 2, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 6. Guardar Cosecha y Congelamiento (Etapa 5 · Segmento 2)
CREATE OR REPLACE FUNCTION save_harvest(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'date')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'harvest', 2, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 7. Guardar Limpieza y Preparación (Etapa 6 · Segmento 2)
CREATE OR REPLACE FUNCTION save_cleaning(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := COALESCE((p_payload->>'cleanDate')::DATE, CURRENT_DATE);

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'cleaning', 2, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 8. Guardar Lavado, Centrifugado y Desinfección (Etapa 7 · Segmento 3)
CREATE OR REPLACE FUNCTION save_washing_load(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'dateTime')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'washing_load', 3, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 9. Guardar Deshidratación (Etapa 8 · Segmento 4)
CREATE OR REPLACE FUNCTION save_drying_run(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'startAt')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'drying_run', 4, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 10. Guardar Molienda y Empaque (Etapa 9 · Segmento 4)
CREATE OR REPLACE FUNCTION save_milling_run(p_payload JSONB, p_employee_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_date DATE;
BEGIN
    v_id := p_payload->>'id';
    v_date := (p_payload->>'dateTime')::DATE;

    INSERT INTO production_records (id, stage, segment, date, employee_code, payload, updated_at)
    VALUES (v_id, 'milling_run', 4, v_date, p_employee_code, p_payload, NOW())
    ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        employee_code = EXCLUDED.employee_code,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 11. Corrección Supervisor/Admin con Auditoría
CREATE OR REPLACE FUNCTION save_correction(
    p_record_id TEXT,
    p_stage TEXT,
    p_new_payload JSONB,
    p_reason TEXT,
    p_supervisor_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_payload JSONB;
BEGIN
    SELECT payload INTO v_old_payload FROM production_records WHERE id = p_record_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registro no encontrado');
    END IF;

    -- Registrar auditoría
    INSERT INTO corrections (record_id, stage, supervisor_code, reason, old_payload, new_payload)
    VALUES (p_record_id, p_stage, p_supervisor_code, p_reason, v_old_payload, p_new_payload);

    -- Actualizar el registro original
    UPDATE production_records 
    SET payload = p_new_payload, updated_at = NOW()
    WHERE id = p_record_id;

    RETURN jsonb_build_object('success', true, 'record_id', p_record_id);
END;
$$;

-- 12. Consulta de KPIs Operativos (Dashboard)
CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_live_kg NUMERIC := 0;
    v_washed_kg NUMERIC := 0;
    v_dry_kg NUMERIC := 0;
    v_dry_input_kg NUMERIC := 0;
    v_flour_kg NUMERIC := 0;
    v_packed_kg NUMERIC := 0;
    v_dry_used_kg NUMERIC := 0;
    v_loose_flour_kg NUMERIC := 0;
    v_drying_yield NUMERIC := NULL;
    v_milling_yield NUMERIC := NULL;
    v_live_to_pack_yield NUMERIC := NULL;
BEGIN
    -- Sumar peso vivo cosechado
    SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM((b->>'weightKg')::NUMERIC), 0) FROM jsonb_array_elements(payload->'bags') b)
    ), 0) INTO v_live_kg
    FROM production_records WHERE stage = 'harvest';

    -- Sumar peso deshidratado obtenido
    SELECT COALESCE(SUM((payload->>'dryWeightKg')::NUMERIC), 0) INTO v_dry_kg
    FROM production_records WHERE stage = 'drying_run';

    -- Sumar harina obtenida y empacada
    SELECT 
        COALESCE(SUM((payload->>'flourKg')::NUMERIC), 0),
        COALESCE(SUM((payload->>'packedKg')::NUMERIC), 0),
        COALESCE(SUM((payload->>'dryUsedKg')::NUMERIC), 0),
        COALESCE(SUM((payload->>'looseFlourKg')::NUMERIC), 0)
    INTO v_flour_kg, v_packed_kg, v_dry_used_kg, v_loose_flour_kg
    FROM production_records WHERE stage = 'milling_run';

    -- Rendimientos
    IF v_dry_used_kg > 0 THEN
        v_milling_yield := ROUND((v_flour_kg / v_dry_used_kg) * 100, 2);
    END IF;

    RETURN jsonb_build_object(
        'liveHarvestedKg', v_live_kg,
        'dryCricketKg', v_dry_kg,
        'flourKg', v_flour_kg,
        'packedKg', v_packed_kg,
        'dryUsedKg', v_dry_used_kg,
        'looseFlourPendingKg', v_loose_flour_kg,
        'millingYieldPct', v_milling_yield
    );
END;
$$;
