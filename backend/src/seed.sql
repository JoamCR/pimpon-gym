-- -----------------------------------------------------------------------------
-- PIMPON GYM - SCRIPT DE POBLACIÓN (SEED)
-- -----------------------------------------------------------------------------

-- Crear la extensión pgcrypto si no está disponible para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear la tabla de pacientes si aún no existe
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    rfc VARCHAR(13),
    age INT,
    birth_date DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(100),
    referred_by VARCHAR(100),
    notes TEXT,
    quick_weight_kg NUMERIC(5,2),
    quick_height_cm NUMERIC(5,2),
    quick_goal VARCHAR(255),
    quick_health_notes TEXT,
    quick_assessed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    first_consult_used BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Añadir la columna birth_date si no existe, para asegurar compatibilidad en re-ejecuciones
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Asegurar columnas de assessment rápido y fecha de nacimiento en tabla clients para v2.0
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quick_weight_kg NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quick_height_cm NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quick_assessed_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quick_goal VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quick_health_notes TEXT;

-- Ajustar schema de nutrition_records para clientes y pacientes
ALTER TABLE nutrition_records
    ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE nutrition_records
    ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE nutrition_records
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NOT NULL DEFAULT 'gym';
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'nutrition_records_entity_type_check'
    ) THEN
      ALTER TABLE nutrition_records ADD CONSTRAINT nutrition_records_entity_type_check CHECK (entity_type IN ('gym', 'consultorio'));
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'nutrition_records_entity_link_check'
    ) THEN
      ALTER TABLE nutrition_records ADD CONSTRAINT nutrition_records_entity_link_check CHECK (
        (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
        (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
      );
    END IF;
END$$;

-- Ajustar schema de payments para clientes y pacientes
ALTER TABLE payments
    ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NOT NULL DEFAULT 'gym';
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'payments_entity_type_check'
    ) THEN
      ALTER TABLE payments ADD CONSTRAINT payments_entity_type_check CHECK (entity_type IN ('gym', 'consultorio'));
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'payments_entity_link_check'
    ) THEN
      ALTER TABLE payments ADD CONSTRAINT payments_entity_link_check CHECK (
        (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
        (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
      );
    END IF;
END$$;

-- Ajustar la restricción de payment_type si es necesario
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('enrollment', 'monthly', 'visit', 'nutrition_consult', 'nutrition_followup'));

-- Ajustar tabla de exercise_plans para soportar consultorio y planes nuevos
ALTER TABLE exercise_plans
    ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE exercise_plans
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NOT NULL DEFAULT 'gym';
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'exercise_plans_entity_type_check'
    ) THEN
      ALTER TABLE exercise_plans ADD CONSTRAINT exercise_plans_entity_type_check CHECK (entity_type IN ('gym', 'consultorio'));
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'exercise_plans_entity_link_check'
    ) THEN
      ALTER TABLE exercise_plans ADD CONSTRAINT exercise_plans_entity_link_check CHECK (
        (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
        (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
      );
    END IF;
END$$;

-- Crear la tabla de agenda si aún no existe
CREATE TABLE IF NOT EXISTS agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('cita','reunion','videollamada','otro')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    status VARCHAR(50) NOT NULL CHECK (status IN ('programada','confirmada','en_cita','realizada','cancelada','ausente','espera','en_curso')) DEFAULT 'programada',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Limpiar las tablas antes de insertar para que el seed sea repetible
TRUNCATE audit_log, notifications, exercise_plans, nutrition_records, attendance, transfer_control, payments, subscriptions, agenda, patients, clients, plans, app_users RESTART IDENTITY CASCADE;

-- 2. Planes disponibles
INSERT INTO plans 
(name, description, price_monthly, price_enrollment, includes_nutrition, requires_enrollment, is_visit_based, duration_days) 
VALUES
('GYMBRO (2 personas)', 'Paquete para dos personas con acceso completo al gimnasio.', 1100.00, 500.00, TRUE, TRUE, FALSE, 30),
('Mensualidad Individual', 'Membresía individual con acceso mensual al gimnasio.', 700.00, 500.00, FALSE, TRUE, FALSE, 30),
('Estudiante', 'Membresía para estudiantes con credencial vigente.', 500.00, 500.00, FALSE, TRUE, FALSE, 30),
('Visita 1 Día', 'Pase de visita por un día.', 80.00, 0.00, FALSE, FALSE, TRUE, 1),
('Visita 1 Semana', 'Pase de visita por una semana.', 150.00, 0.00, FALSE, FALSE, TRUE, 7);
