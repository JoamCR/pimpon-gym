# PIMPON GYM SYSTEM — CONTEXTO PERMANENTE v2.0
# Pega este archivo COMPLETO al inicio de cada sesión en Gemini
# Última actualización: Mayo 2026 — Cambios del cliente aplicados

---

## ¿QUÉ ES ESTE PROYECTO?
Sistema de gestión para "Pimpon Gym", un gimnasio en México con consultorio de
nutriología independiente. El sistema maneja DOS entidades de negocio separadas:

  1. GYM — Clientes que pagan membresía para usar las instalaciones del gimnasio
  2. CONSULTORIO — Pacientes que SOLO van con el nutriólogo (no usan el gym)

Ambas entidades comparten la plataforma pero tienen flujos, estadísticas y
reportes COMPLETAMENTE SEPARADOS.

---

## STACK TECNOLÓGICO — NO CAMBIAR NUNCA
- Frontend:    React 18 + Vite + Tailwind CSS + Framer Motion + React Router v6
- Backend:     Node.js 20 + Fastify + Zod (validaciones)
- Base datos:  PostgreSQL local (desarrollo) → Supabase producción
- BD Client:   pg (node-postgres) en dev / @supabase/supabase-js en prod
- Estado:      TanStack Query (servidor) + Zustand (cliente local)
- PDF:         pdf-lib (Node.js, sin microservicios externos)
- WhatsApp:    whatsapp-web.js en puerto 3001
- Automatiz:   n8n self-hosted puerto 5678
- Testing:     Vitest + Supertest

---

## ESTRUCTURA DE CARPETAS (YA CREADA)
```
pimpon-gym/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/           ← GymCard, GymModal, GymButton (REUTILIZAR SIEMPRE)
│       │   └── modules/      ← componentes por módulo
│       ├── pages/
│       │   ├── gym/          ← páginas del módulo gym
│       │   └── consultorio/  ← páginas del módulo consultorio
│       ├── hooks/            ← custom hooks con TanStack Query
│       ├── stores/           ← Zustand (authStore, configStore)
│       ├── lib/              ← dbClient.js
│       └── styles/           ← tokens.css
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── clients/          ← clientes del GYM
│       │   ├── patients/         ← pacientes del CONSULTORIO
│       │   ├── payments/
│       │   ├── subscriptions/
│       │   ├── attendance/
│       │   ├── nutrition/        ← compartido: gym + consultorio
│       │   ├── notifications/    ← WA + promociones
│       │   ├── statistics-gym/   ← estadísticas solo del gym
│       │   ├── statistics-consultorio/ ← estadísticas solo del consultorio
│       │   └── config/
│       ├── middleware/       ← auth.middleware.js, role.guard.js
│       ├── cron/             ← vencimientos + recordatorios + promociones
│       ├── services/         ← pdfService.js, whatsappService.js
│       └── lib/              ← database.js, appError.js
└── services/
    └── whatsapp/             ← microservicio whatsapp-web.js
```

---

## REGLA DE ORO DEL BACKEND
Cada módulo tiene EXACTAMENTE 4 archivos:
1. [modulo].routes.js       → rutas Fastify, aplica middleware
2. [modulo].service.js      → lógica de negocio ÚNICAMENTE
3. [modulo].repository.js   → queries SQL ÚNICAMENTE
4. [modulo].schema.js       → validaciones Zod

NUNCA lógica de negocio en routes.js
NUNCA queries en service.js
NUNCA sin validación Zod antes del service

---

## ROLES DEL SISTEMA
- owner:        TODO el sistema + gestión de usuarios + todas las estadísticas
- admin:        TODO excepto gestión de usuarios del sistema
- receptionist: clientes gym, pagos, asistencia, notificaciones WA
- nutritionist: expedientes, evaluaciones, planes — TANTO gym como consultorio

---

## DOS TIPOS DE PERSONA EN EL SISTEMA

### TIPO 1 — GYM CLIENT (tabla: clients)
Persona que paga membresía para usar las instalaciones del gimnasio.
Puede TAMBIÉN tener consulta con el nutriólogo (si su plan lo incluye).
Flujo: Recepción → Alta → Pago → [Evaluación rápida] → [Consulta nutriólogo]

### TIPO 2 — CONSULTORIO PATIENT (tabla: patients)
Persona que SOLO va con el nutriólogo. NO usa el gym.
No paga membresía. Paga por consulta nutricional directamente.
Flujo: Recepción/Nutriólogo → Alta como paciente → Consulta → Plan

AMBOS tipos pueden tener:
- Evaluación rápida (quick_assessment) — datos físicos básicos en el registro
- Consulta nutricional completa (nutrition_records) — expediente detallado
- Plan de ejercicio (exercise_plans)

---

## BASE DE DATOS — TABLAS COMPLETAS v2.0

### plans (sin cambios)
id, name, description, price_monthly, price_enrollment,
includes_nutrition, requires_enrollment, is_visit_based,
duration_days, is_active, created_at

### app_users (sin cambios)
id, email, password_hash, full_name, role, is_active, created_at

### clients — CLIENTES DEL GYM (actualizado)
id                    UUID PK
first_name            VARCHAR(100) NOT NULL
last_name             VARCHAR(100) NOT NULL
rfc                   VARCHAR(13) UNIQUE          ← NUEVO: RFC fiscal del cliente
age                   SMALLINT NOT NULL
phone                 VARCHAR(20) NOT NULL UNIQUE
email                 VARCHAR(150)
client_type           VARCHAR(20) CHECK IN (monthly, student, senior, daily, hourly, weekly)
plan_id               UUID FK → plans
enrollment_date       DATE
enrollment_expires_at DATE
first_consult_used    BOOLEAN DEFAULT false
consecutive_months    SMALLINT DEFAULT 0
is_active             BOOLEAN DEFAULT true
qr_code               VARCHAR(255) UNIQUE
notes                 TEXT

-- Evaluación rápida al registro (NUEVO — separada de la consulta formal)
quick_weight_kg       NUMERIC(5,2)               ← NUEVO
quick_height_cm       NUMERIC(5,2)               ← NUEVO
quick_goal            VARCHAR(50)                ← NUEVO: objetivo principal
quick_health_notes    TEXT                       ← NUEVO: condiciones relevantes
quick_assessed_at     TIMESTAMPTZ                ← NUEVO: cuándo se hizo

-- Encuesta del coach (se mantiene)
coach_fitness_level   VARCHAR(20)
coach_health_notes    TEXT
coach_goal            VARCHAR(50)

created_at            TIMESTAMPTZ DEFAULT now()
created_by            UUID FK → app_users

NOTA: La evaluación rápida (quick_*) se llena en el momento del registro
en recepción. Es diferente a la consulta formal del nutriólogo (nutrition_records).
La consulta formal es más profunda y genera un expediente completo.

### patients — PACIENTES DEL CONSULTORIO (NUEVA TABLA)
id                    UUID PK
first_name            VARCHAR(100) NOT NULL
last_name             VARCHAR(100) NOT NULL
rfc                   VARCHAR(13) UNIQUE          ← RFC fiscal
age                   SMALLINT NOT NULL
phone                 VARCHAR(20) NOT NULL UNIQUE
email                 VARCHAR(150)
occupation            VARCHAR(100)               ← ocupación del paciente
referred_by           VARCHAR(100)               ← quién lo refirió
is_active             BOOLEAN DEFAULT true
notes                 TEXT

-- Evaluación rápida también para pacientes del consultorio
quick_weight_kg       NUMERIC(5,2)
quick_height_cm       NUMERIC(5,2)
quick_goal            VARCHAR(100)
quick_health_notes    TEXT
quick_assessed_at     TIMESTAMPTZ

created_at            TIMESTAMPTZ DEFAULT now()
created_by            UUID FK → app_users

### subscriptions (sin cambios estructurales)
id, client_id(FK clients), plan_id(FK), start_date, end_date,
status(active|expired|cancelled|pending),
notified_3days, notified_expiry, created_at

### payments — PAGOS (actualizado)
id                UUID PK
client_id         UUID FK → clients     (NULL si es pago de consultorio)
patient_id        UUID FK → patients    (NULL si es pago de gym)
subscription_id   UUID FK → subscriptions (NULL para pagos directos)
amount            NUMERIC(10,2) NOT NULL
payment_method    VARCHAR(20) CHECK IN (cash, transfer, card)
payment_type      VARCHAR(30) CHECK IN (
                    enrollment,         ← inscripción anual GYM
                    monthly,            ← mensualidad GYM
                    visit,              ← visita sin membresía GYM
                    nutrition_consult,  ← consulta nutriólogo (gym o consultorio)
                    nutrition_followup  ← seguimiento nutriólogo
                  )
entity_type       VARCHAR(20) CHECK IN (gym, consultorio)  ← NUEVO: separa finanzas
paid_at           TIMESTAMPTZ DEFAULT now()
registered_by     UUID FK → app_users
notes             TEXT
is_voided         BOOLEAN DEFAULT false
voided_at         TIMESTAMPTZ
voided_by         UUID FK → app_users

NOTA: entity_type='gym' para todo lo del gimnasio.
      entity_type='consultorio' para pagos de pacientes del consultorio.
      Esto permite estadísticas financieras completamente separadas.

### transfer_control (sin cambios)
id, month(DATE único), total_received, monthly_limit(30000), updated_at

### attendance (sin cambios — solo gym)
id, client_id(FK clients), checked_in_at, checked_out_at,
method(qr|manual|code), registered_by(FK)

### nutrition_records — EXPEDIENTES (actualizado — sirve para gym Y consultorio)
id                      UUID PK
client_id               UUID FK → clients    (NULL si es paciente de consultorio)
patient_id              UUID FK → patients   (NULL si es cliente de gym)
entity_type             VARCHAR(20) CHECK IN (gym, consultorio)  ← NUEVO
evaluation_date         DATE NOT NULL DEFAULT CURRENT_DATE
weight_kg               NUMERIC(5,2)
height_cm               NUMERIC(5,2)
body_fat_pct            NUMERIC(5,2)
visceral_fat_pct        NUMERIC(5,2)
muscle_mass_kg          NUMERIC(5,2)
waist_cm                NUMERIC(5,2)
family_history          TEXT
pathological_history    TEXT
personal_history        TEXT
body_composition_notes  TEXT
-- Plan nutricional (NUEVO en expediente)
diet_plan               TEXT                 ← plan de alimentación/dieta
caloric_target          NUMERIC(6,1)         ← calorías objetivo
protein_target_g        NUMERIC(5,1)         ← proteína objetivo en gramos
carbs_target_g          NUMERIC(5,1)         ← carbohidratos objetivo
fat_target_g            NUMERIC(5,1)         ← grasa objetivo
is_free_consult         BOOLEAN DEFAULT false
created_by              UUID FK → app_users
created_at              TIMESTAMPTZ DEFAULT now()

### exercise_plans (actualizado — sirve para gym Y consultorio)
id                   UUID PK
client_id            UUID FK → clients    (NULL si es paciente)
patient_id           UUID FK → patients   (NULL si es cliente gym)
entity_type          VARCHAR(20) CHECK IN (gym, consultorio)  ← NUEVO
nutrition_record_id  UUID FK → nutrition_records
month_year           DATE NOT NULL
content              JSONB NOT NULL DEFAULT '{}'
pdf_url              TEXT
sent_at              TIMESTAMPTZ
created_by           UUID FK → app_users
created_at           TIMESTAMPTZ DEFAULT now()

### notifications (actualizado — incluye promociones)
id           UUID PK
client_id    UUID FK → clients   (NULL si es paciente o es masivo)
patient_id   UUID FK → patients  (NULL si es cliente gym)
type         VARCHAR(40) CHECK IN (
               3day_warning,     ← membresía vence en 3 días
               expiry_day,       ← membresía vence hoy
               manager_alert,    ← alerta al gerente
               plan_sent,        ← plan de ejercicio enviado
               promotion         ← NUEVO: promoción especial
             )
channel      VARCHAR(20) DEFAULT 'whatsapp'
message      TEXT NOT NULL
promotion_id UUID FK → promotions  (NUEVO: NULL si no es promoción)
sent_at      TIMESTAMPTZ DEFAULT now()
sent_by      UUID FK → app_users
status       VARCHAR(20) DEFAULT 'sent' CHECK IN (sent, failed, pending)

### promotions — NUEVA TABLA para promociones de WhatsApp
id              UUID PK
name            VARCHAR(100) NOT NULL        ← "Día de las Madres 2026"
description     TEXT
message_template TEXT NOT NULL              ← texto del WA con {nombre} como variable
discount_pct    NUMERIC(5,2)                ← % de descuento si aplica
discount_amount NUMERIC(10,2)              ← monto fijo de descuento si aplica
valid_from      DATE NOT NULL
valid_to        DATE NOT NULL
target_audience VARCHAR(20) CHECK IN (
                  all,          ← todos (gym + consultorio)
                  gym_only,     ← solo clientes del gym
                  consultorio_only, ← solo pacientes del consultorio
                  active_only,  ← solo con membresía activa
                  consistent    ← solo con fidelidad (6+ meses)
                )
is_sent         BOOLEAN DEFAULT false
sent_at         TIMESTAMPTZ
sent_by         UUID FK → app_users
created_at      TIMESTAMPTZ DEFAULT now()

PROMOCIONES PRECARGADAS EN EL SISTEMA:
- Día de las Madres (segunda semana de mayo)
- Día del Estudiante (23 de mayo)
- Día del Padre (tercer domingo de junio)
- Regreso a Clases (agosto)
- Día de la Independencia (septiembre)
- Día del Amor y la Amistad (14 de febrero)
- Buen Fin (noviembre)
- Black Friday (noviembre)
- Navidad / Año Nuevo (diciembre)

### audit_log (sin cambios)
id, table_name, record_id, action(INSERT|UPDATE|DELETE),
old_values(JSONB), new_values(JSONB), performed_by(FK), performed_at

---

## EVALUACIÓN RÁPIDA vs CONSULTA FORMAL — DIFERENCIA CRÍTICA

### Evaluación Rápida (quick_assessment)
- Se llena EN EL MOMENTO del registro del cliente/paciente en recepción
- Campos: peso, estatura, objetivo, notas de salud relevantes
- Propósito: tener datos básicos inmediatos para orientar al cliente
- Se guarda directamente en la tabla clients o patients (campos quick_*)
- NO genera un expediente separado
- La puede llenar la recepcionista o el nutriólogo en el momento del alta

### Consulta Formal (nutrition_records)
- Se realiza en el consultorio con el nutriólogo
- Incluye: composición corporal completa, antecedentes familiares/patológicos/
  personales, % grasa, % grasa visceral, masa muscular, cintura, plan de dieta,
  metas calóricas y de macronutrientes
- Genera un expediente completo con fecha
- Sin límite de evaluaciones por persona
- Primera consulta: GRATIS solo para clientes gym con plan Pro (clients.first_consult_used)
- Para pacientes del consultorio: SIEMPRE de pago desde la primera

---

## ESTADÍSTICAS — SEPARACIÓN GYM vs CONSULTORIO

### Estadísticas del GYM (módulo statistics-gym)
- Ingresos del gym: enrollment + monthly + visit (entity_type='gym')
  → Desglosado por: método de pago, tipo de pago, mes, año
- Desglose de INSCRIPCIONES ANUALES:
  → Total recaudado por inscripciones en el mes
  → Inscripciones nuevas vs renovaciones
  → Proyección de vencimientos de inscripciones anuales
- Desglose de SUSCRIPCIONES MENSUALES:
  → Total recaudado por mensualidades
  → Clientes activos con pago vigente (no histórico)
  → Clientes vencidos sin renovar
- Clientes por plan (distribución)
- Clientes consistentes: consecutive_months >= 6 (fidelidad)
- Clientes inscritos sin asistencia en el mes
- Asistencia: promedio diario, hora pico, día más concurrido
- Cortes de caja históricos del gym

### Estadísticas del CONSULTORIO (módulo statistics-consultorio)
- Ingresos del consultorio: nutrition_consult + nutrition_followup (entity_type='consultorio')
  → Desglosado por: método de pago, mes, año
- Pacientes nuevos por mes
- Total de consultas realizadas por mes (gym + consultorio separados)
- Consultas por nutriólogo (si hay más de uno en el futuro)
- Pacientes activos del consultorio (con consulta en los últimos 30 días)
- Pacientes recurrentes vs nuevos
- Promedio de consultas por paciente
- Cortes de caja históricos del consultorio

### Estadísticas del DUEÑO (vista consolidada — solo owner)
- Ingresos TOTALES: gym + consultorio juntos
- Comparativa mensual gym vs consultorio
- Tope de transferencias (aplica a ambas entidades)
- Resumen ejecutivo completo

---

## MÓDULO DE PROMOCIONES WhatsApp

### Tipos de promociones disponibles
El sistema debe tener una sección de "Campañas" en Configuración donde se:
1. Listen las promociones precargadas con sus fechas
2. Edite el mensaje de cada promoción
3. Seleccione el público objetivo
4. Envíe manualmente O programe envío automático

### Flujo de envío de promoción
1. Owner/Admin va a Configuración → Campañas
2. Ve las próximas fechas comerciales con X días de anticipación
3. Edita el mensaje y el descuento si aplica
4. Elige público: todos / solo gym / solo consultorio / activos / consistentes
5. Clic "Enviar ahora" o "Programar para [fecha]"
6. n8n maneja el envío masivo con 2 segundos entre mensajes
7. Sistema registra en notifications con type='promotion' y promotion_id

### Variables disponibles en mensajes de promoción
{nombre}      ← nombre del cliente/paciente
{plan}        ← nombre del plan del cliente
{descuento}   ← porcentaje o monto del descuento
{validez}     ← fecha de vigencia de la promoción
{gym}         ← nombre del gym (Pimpon Gym)

Ejemplo de mensaje:
"¡Hola {nombre}! 🌹 En el Día de las Madres, {gym} te tiene un regalo especial:
{descuento}% de descuento en tu próxima mensualidad.
Válido hasta el {validez}. ¡Ven a celebrar con nosotros! 💪"

---

## REGLAS DE NEGOCIO v2.0 — CRÍTICAS

1. RFC: Campo obligatorio en alta de clientes gym Y pacientes del consultorio.
   Formato: 4 letras + 6 dígitos fecha + 3 alfanumérico (ej: GAMA850101ABC)
   Validación: regex /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i

2. Tope transferencias: $30,000 MXN/mes sobre el TOTAL (gym + consultorio sumados).
   ADVERTIR, nunca bloquear el pago.

3. Primera consulta nutricional:
   - Clientes GYM con Plan Pro: GRATIS (first_consult_used=false)
   - Pacientes CONSULTORIO: siempre de pago desde la primera
   - Segunda consulta gym: requiere pago previo registrado ese día

4. Plan semanal = EXACTAMENTE 6 días (no 7)

5. Cliente/paciente "activo":
   - GYM: subscription.status='active' AND end_date >= NOW()
   - CONSULTORIO: tiene al menos una consulta en los últimos 30 días

6. FIDELIDAD = consecutive_months >= 6 (SEIS meses, no 7 como antes)
   Los meses DEBEN ser consecutivos. Si hay un mes sin pago, el contador
   se reinicia a 0. No se permite intercalado.

7. Evaluación rápida: se llena en recepción al momento del alta.
   Es independiente de la consulta formal del nutriólogo.
   No genera expediente, son campos directos en clients/patients.

8. Estadísticas GYM y CONSULTORIO son COMPLETAMENTE SEPARADAS.
   El campo entity_type en payments, nutrition_records y exercise_plans
   determina a qué entidad pertenece cada registro.

9. Inscripción anual (enrollment) tiene su propia estadística separada
   de la mensualidad (monthly). Nunca mezclarlas en los reportes.

10. Audit log OBLIGATORIO en todo INSERT/UPDATE de payments.

11. Promociones: el sistema debe alertar al dueño 7 días antes de cada
    fecha comercial configurada para preparar el envío.

---

## COMPONENTES UI — REUTILIZAR SIEMPRE, NUNCA DUPLICAR

### GymCard (frontend/src/components/ui/GymCard.jsx)
Props: title, subtitle, children, variant, action, style, noPad, delay
Variantes: "default" | "warning" | "danger" | "success" | "gold"
USO: <GymCard title="Título" variant="warning">contenido</GymCard>

### GymModal (frontend/src/components/ui/GymModal.jsx)
Props: isOpen, onClose, title, children, width
Backdrop oscuro rgba(13,27,42,0.65) + blur(3px)
Animación spring de entrada, cierre con Escape y clic en backdrop
USO: <GymModal isOpen={open} onClose={()=>setOpen(false)} title="Título">

### GymButton (frontend/src/components/ui/GymButton.jsx)
Props: children, variant, size, onClick, icon, loading, disabled, style
Variantes: "primary"|"secondary"|"danger"|"warning"|"ghost"|"success"|"gold"
Tamaños: "xs"|"sm"|"md"|"lg"
USO: <GymButton variant="warning" size="sm" icon="💬">Texto</GymButton>

---

## TOKENS DE DISEÑO
Navy:    #0D1B2A   (sidebar, headers de tarjetas)
Teal:    #0F3E60   (botón primary, acentos)
Gold:    #E29A00   (plan Pro, incentivos, fidelidad)
Surface: #F0F5FA   (fondo general)
Card:    #FFFFFF
Border:  #E2EAF2
Green:   #16A34A   (activo, éxito)
Red:     #DC2626   (vencido, error)
Amber:   #D97706   (advertencia, por vencer)
Fuentes: Sora (títulos) + DM Sans (cuerpo)

---

## VARIABLES DE ENTORNO BACKEND (.env)
DATABASE_URL=postgresql://pimpon_dev:pimpon_dev_2026@localhost:5432/pimpon_gym
PORT=4000
NODE_ENV=development
JWT_SECRET=pimpon_jwt_secret_desarrollo_2026
TRANSFER_MONTHLY_LIMIT=30000
MANAGER_PHONE=+521XXXXXXXXXX
GYM_NAME=Pimpon Gym
WA_SERVICE_URL=http://localhost:3001
N8N_WEBHOOK_BASE=http://localhost:5678/webhook

---

## ESTADO ACTUAL DEL PROYECTO
- Estructura de carpetas:    CREADA
- BD tablas (versión v1):    CREADAS (requieren migración para v2.0)
- Componentes UI:            LISTOS (GymCard, GymModal, GymButton en prototipo)
- Backend:                   PENDIENTE
- Frontend:                  PENDIENTE

## MIGRACIÓN PENDIENTE EN BD
Las siguientes tablas requieren ALTER TABLE para v2.0:
1. clients: agregar columnas RFC + quick_assessment (quick_weight_kg, etc.)
2. patients: NUEVA TABLA (crearla completa)
3. payments: agregar columnas patient_id + entity_type
4. nutrition_records: agregar patient_id + entity_type + columnas de dieta
5. exercise_plans: agregar patient_id + entity_type
6. notifications: agregar patient_id + promotion_id
7. promotions: NUEVA TABLA (crearla + insertar fechas precargadas)

---

## ORDEN DE DESARROLLO ACTUALIZADO
Semana 1: Backend base (index.js + auth) + migración BD v2.0
Semana 2: Módulo clients (gym) + patients (consultorio) — backend + frontend
Semana 3: Módulo payments con entity_type + control de transferencias
Semana 4: Dashboard de vencimientos + WhatsApp + n8n
Semana 5: Asistencia (QR + manual)
Semana 6: Nutriología (gym + consultorio, evaluación rápida vs consulta formal)
Semana 7: PDF sobre plantilla + envío por WhatsApp
Semana 8: Estadísticas GYM separadas de CONSULTORIO
Semana 9: Módulo de Promociones/Campañas + Configuración + responsive tablet

---

## LO QUE NUNCA DEBES HACER
- NO cambiar el stack (no Express, no Prisma, no Python para PDF)
- NO crear componentes base de UI nuevos (existen GymCard/GymModal/GymButton)
- NO mezclar estadísticas de gym con consultorio — siempre separadas por entity_type
- NO hacer fetch directo en componentes React — usar custom hooks con TanStack Query
- NO mezclar lógica de negocio en routes.js — va en service.js
- NO omitir validación RFC en alta de clientes o pacientes
- NO calcular fidelidad con meses intercalados — solo consecutivos, si hay gap = reset a 0
- NO mezclar ingresos de inscripción con ingresos de mensualidad en reportes
- NO omitir el campo entity_type en payments, nutrition_records, exercise_plans
