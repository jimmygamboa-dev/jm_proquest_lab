# JM PROQUEST V1 - Sistema Web Operativo, Trazabilidad y Dashboard

Sistema web progresivo (PWA/Responsive) para trazabilidad operativa, gestión de producción e indicadores de rendimiento de planta de harina de grillo dividida en 4 segmentos productivos. Diseñado para tabletas en planta, monitores en oficina (modo TV) y computadoras de escritorio.

---

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14+ (App Router, TypeScript).
- **Estilos y UI**: Tailwind CSS, Lucide React e interfaces táctiles con sliders, steppers (`+`/`-`) y selectores de alta ergonomía para tabletas.
- **Base de Datos & Backend**: Supabase (PostgreSQL) con almacenamiento y validaciones mediante **Database Functions / RPC (`supabase.rpc()`)**.
- **Resiliencia Offline**: Almacenamiento local reactivo (`localStorage`) con fallback transparente ante pérdida de conexión y precarga de datos de prueba realistas.

---

## 👥 Roles y Credenciales de Acceso (PIN Numérico)

El sistema cuenta con autenticación ligera mediante PIN de 4 dígitos:

| Código | Empleado | Rol | Segmento Asignado | PIN |
|---|---|---|---|---|
| **E-01** | Deyker | Operador | Segmento 1 (Etapas 1 a 3) | `1001` |
| **E-06** | Amalia | Operadora | Segmento 2 (Etapas 4 a 6) | `2001` |
| **E-08** | Carlos | Operador | Segmento 3 (Etapa 7) | `3001` |
| **E-09** | Miguel | Operador | Segmento 4 (Etapas 8 y 9) | `4001` |
| **E-07** | Luis | Supervisor | Todas las etapas + Correcciones | `9001` |
| **E-02** | José | Administrador | Acceso Total + Dashboard + Personal | `9999` |

> *Nota: La pantalla de login incluye botones de acceso rápido de prueba para entrar con un solo toque como cualquier rol sin necesidad de teclear el PIN.*

---

## 🏭 Estructura de las 9 Etapas en 4 Segmentos

### Segmento 1 · Reproducción e Inicio
- **1 · Postura**: Cálculo automático de huevos teóricos (`nests × 60.000`), fecha calculada de retiro y escenarios de mortalidad favorable (20%) y conservador (60%).
- **2 · Incubación**: Registro de temperatura (°C), humedad (%), peso de ninfas nacidas, edad biológica con factor de conversión de ninfas (`AGE_GRILLERS`), y vigilancia de presencia de mosquitos.
- **3 · Salida a Cajas (60 L)**: Distribución física a cajas `CJ-xxx`, control de tope máximo de 60.000 ninfas por caja y saldo de ninfas pendientes.

### Segmento 2 · Engorde y Cosecha
- **4 · Siembra en Cajones**: Apertura de ciclo de engorde `C-CE...`, recepción de cajas o siembra directa y cálculo de edad biológica al sembrar.
- **5 · Cosecha y Congelamiento**: Registro de ciclo cosechado, desglose táctil de bolsas individuales, pesaje individual y asignación a congeladores (`Congelador 1` a `7`).
- **6 · Limpieza y Preparación de Cajón**: Control sanitario, fecha de rearmado con cartones y control de reparaciones para habilitación del cajón.

### Segmento 3 · Lavado y Desinfección
- **7 · Lavado, Centrifugado y Desinfección**: Agrupación de bolsas de congelador en lotes `LP-xxx`, checklist de inocuidad en 3 zonas sanitarias (Sucia, Intermedia, Limpia) y **alerta de calidad cuando una bolsa supera 168 horas congelada**.

### Segmento 4 · Proceso Final
- **8 · Deshidratación**: Tratamiento térmico en deshidratador, cálculo de rendimiento seco (`%`) y merma de evaporación de humedad en kg.
- **9 · Molienda y Empaque**: Molienda de lotes secos, control de humedad final (`%`), desglose de bolsas empacadas, rendimiento de molienda y **rendimiento vivo a empaque trazado (`%`)**.

---

## 📊 Módulo Administrador (`/admin`)

- **Modo TV / Pantalla de Oficina**: Vista de alto contraste y monitoreo a pantalla completa para televisores de planta y oficina.
- **Panel Prioritario de Alertas de Calidad**:
  - Exceso de ninfas sobre máximo teórico.
  - Alerta de bajo nacimiento (<40% del máximo teórico).
  - Alerta fitosanitaria de mosquitos detectados en incubadoras.
  - Inconsistencias en salidas a cajas que superen lo nacido.
  - Bolsas acumuladas en congeladores por más de 168 horas sin lavar.
- **Indicadores y Rendimientos en Tiempo Real**:
  - Total vivo cosechado (kg), grillo seco (kg) y harina empacada (kg).
  - **Rendimiento Deshidratación (%)**: `(Seco Obtenido ÷ Vivo Entrada) × 100`
  - **Rendimiento Molienda (%)**: `(Harina Obtenida ÷ Seco Usado) × 100`
  - **Rendimiento Vivo a Empaque Trazado (%)**: `(Harina Empacada ÷ Vivo Trazado DH) × 100`
  - Mermas y saldos sueltos no empacados.
- **Historial y Auditoría de Supervisión**: Filtros dinámicos por fecha, etapa y empleado. Modal de corrección exclusiva para supervisores que registra motivo obligatorio, responsable y fecha.
- **Respaldo y Exportación**: Descarga directa de respaldo en JSON y exportación estructurada en CSV para Microsoft Excel.

---

## 🗄️ Entregable SQL Supabase (`supabase/schema.sql`)

El script de base de datos incluye:
- Tablas `employees`, `profiles`, `production_records`, `corrections`, `system_settings`.
- Funciones PostgreSQL (RPC atómicas):
  - `verify_pin(p_pin)`
  - `save_posture(p_payload, p_employee_code)`
  - `save_incubation(p_payload, p_employee_code)`
  - `save_transfer(p_payload, p_employee_code)`
  - `save_sowing(p_payload, p_employee_code)`
  - `save_harvest(p_payload, p_employee_code)`
  - `save_cleaning(p_payload, p_employee_code)`
  - `save_washing_load(p_payload, p_employee_code)`
  - `save_drying_run(p_payload, p_employee_code)`
  - `save_milling_run(p_payload, p_employee_code)`
  - `save_correction(p_record_id, p_stage, p_new_payload, p_reason, p_supervisor_code)`
  - `get_dashboard_kpis()`

---

## 🚀 Puesta en Marcha Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

Abra [http://localhost:3000](http://localhost:3000) en su navegador o tableta.
