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

-- 1. Usuarios del sistema
INSERT INTO app_users (email, password_hash, full_name, role, is_active)
VALUES
('admin@pimpongym.com', 'pendiente_de_hashear', 'Administrador Principal', 'owner', TRUE),
('recepcion@pimpongym.com', 'pendiente_de_hashear', 'Recepción Pimpon', 'receptionist', TRUE),
('nutri@pimpongym.com', 'pendiente_de_hashear', 'Nutrióloga Carolina', 'nutritionist', TRUE);

-- 2. Planes disponibles
INSERT INTO plans 
(name, description, price_monthly, price_enrollment, includes_nutrition, requires_enrollment, is_visit_based, duration_days) 
VALUES
('GYMBRO (2 personas)', 'Paquete para dos personas con acceso completo al gimnasio.', 1100.00, 500.00, TRUE, TRUE, FALSE, 30),
('Mensualidad Individual', 'Membresía individual con acceso mensual al gimnasio.', 700.00, 500.00, FALSE, TRUE, FALSE, 30),
('Estudiante', 'Membresía para estudiantes con credencial vigente.', 500.00, 500.00, FALSE, TRUE, FALSE, 30),
('Visita 1 Día', 'Pase de visita por un día.', 80.00, 0.00, FALSE, FALSE, TRUE, 1),
('Visita 1 Semana', 'Pase de visita por una semana.', 150.00, 0.00, FALSE, FALSE, TRUE, 7);

-- 3. Clientes de prueba
INSERT INTO clients (
  first_name, last_name, age, phone, email, client_type, plan_id,
  enrollment_date, enrollment_expires_at, first_consult_used, consecutive_months,
  is_active, qr_code, notes, coach_fitness_level, coach_health_notes, coach_goal, created_by
)
VALUES
('Sofía', 'Ramírez', 24, '5551001001', 'sofia.ramirez@gmail.com', 'gymbro', (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-05-01', '2026-06-01', FALSE, 7, TRUE, 'QR-1001', 'Prefiere clases de fuerza.', 'Intermedio', 'Sin alergias', 'Ganar masa muscular', (SELECT id FROM app_users WHERE email = 'admin@pimpongym.com')),
('Mateo', 'García', 19, '5551001002', 'mateo.garcia@studentes.mx', 'student', (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-02', '2026-06-02', TRUE, 2, TRUE, 'QR-1002', 'Estudia en la UPAEP.', 'Principiante', 'Migrañas leves', 'Mejorar resistencia', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
('Ana', 'López', 68, '5551001003', 'ana.lopez@correo.com', 'individual', (SELECT id FROM plans WHERE name = 'Mensualidad Individual'), '2026-04-20', '2026-05-20', TRUE, 10, TRUE, 'QR-1003', 'Busca estabilidad articular.', 'Básico', 'Hipertensión controlada', 'Mantener movilidad', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
('Diego', 'Pérez', 32, '5551001004', 'diego.perez@empresa.com', 'gymbro', (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-05-01', '2026-05-31', FALSE, 1, TRUE, 'QR-1004', 'Trabaja turnos nocturnos.', 'Intermedio', 'Dolor lumbar ocasional', 'Reducir grasa corporal', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Mariana', 'Vega', 35, '5551001007', 'mariana.vega@mail.com', 'gymbro', (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-04-10', '2026-05-10', FALSE, 5, TRUE, 'QR-1007', 'Entrena 5 veces por semana.', 'Avanzado', 'Sin lesiones recientes', 'Prepararse para evento', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Javier', 'Ortega', 29, '5551001008', 'javier.ortega@correo.com', 'student', (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-03', '2026-06-03', TRUE, 3, TRUE, 'QR-1008', 'Busca perder peso.', 'Principiante', 'Asma leve', 'Bajar % grasa', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
('Anaís', 'Cruz', 51, '5551001009', 'anais.cruz@mail.com', 'individual', (SELECT id FROM plans WHERE name = 'Mensualidad Individual'), '2026-05-01', '2026-05-31', TRUE, 12, TRUE, 'QR-1009', 'Clienta muy constante.', 'Intermedio', 'Diabetes tipo 2', 'Mejorar condición general', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Fernanda', 'Silva', 23, '5551001010', 'fernanda.silva@estudiante.mx', 'student', (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-06', '2026-06-06', FALSE, 1, TRUE, 'QR-1010', 'Participa en clases de spinning.', 'Principiante', 'Sin antecedentes', 'Tonificar piernas', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'));

-- 4. Suscripciones
INSERT INTO subscriptions (client_id, plan_id, start_date, end_date, status, notified_3days, notified_expiry)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-05-01', '2026-05-31', 'active', TRUE, FALSE),
((SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx'), (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-02', '2026-06-02', 'active', FALSE, FALSE),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), (SELECT id FROM plans WHERE name = 'Mensualidad Individual'), '2026-04-20', '2026-05-20', 'active', FALSE, FALSE),
((SELECT id FROM clients WHERE email = 'diego.perez@empresa.com'), (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-05-01', '2026-05-31', 'active', TRUE, FALSE),
((SELECT id FROM clients WHERE email = 'mariana.vega@mail.com'), (SELECT id FROM plans WHERE name = 'GYMBRO (2 personas)'), '2026-04-10', '2026-05-10', 'expired', TRUE, TRUE),
((SELECT id FROM clients WHERE email = 'javier.ortega@correo.com'), (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-03', '2026-06-03', 'pending', TRUE, FALSE),
((SELECT id FROM clients WHERE email = 'anais.cruz@mail.com'), (SELECT id FROM plans WHERE name = 'Mensualidad Individual'), '2026-05-01', '2026-05-31', 'active', TRUE, FALSE),
((SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx'), (SELECT id FROM plans WHERE name = 'Estudiante'), '2026-05-06', '2026-06-06', 'active', FALSE, FALSE);

-- 5. Pagos de prueba
INSERT INTO payments (client_id, subscription_id, amount, payment_method, payment_type, paid_at, registered_by, notes)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com')), 500.00, 'card', 'enrollment', '2026-05-01 09:00:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com')), 1100.00, 'card', 'monthly', '2026-05-01 09:05:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Mensualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx')), 500.00, 'transfer', 'enrollment', '2026-05-02 11:15:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad Estudiante'),
((SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx')), 500.00, 'transfer', 'monthly', '2026-05-02 11:16:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Mensualidad Estudiante'),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'ana.lopez@correo.com')), 500.00, 'cash', 'enrollment', '2026-04-20 14:00:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad Individual'),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'ana.lopez@correo.com')), 700.00, 'cash', 'monthly', '2026-04-20 14:05:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Mensualidad Individual'),
((SELECT id FROM clients WHERE email = 'diego.perez@empresa.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'diego.perez@empresa.com')), 500.00, 'card', 'enrollment', '2026-05-01 16:30:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'diego.perez@empresa.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'diego.perez@empresa.com')), 1100.00, 'card', 'monthly', '2026-05-01 16:31:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Mensualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'mariana.vega@mail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'mariana.vega@mail.com')), 500.00, 'transfer', 'enrollment', '2026-04-10 08:50:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'Anualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'mariana.vega@mail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'mariana.vega@mail.com')), 1100.00, 'transfer', 'monthly', '2026-04-10 08:51:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'Mensualidad GYMBRO'),
((SELECT id FROM clients WHERE email = 'javier.ortega@correo.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'javier.ortega@correo.com')), 500.00, 'card', 'enrollment', '2026-05-03 13:20:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad Estudiante'),
((SELECT id FROM clients WHERE email = 'anais.cruz@mail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'anais.cruz@mail.com')), 500.00, 'transfer', 'enrollment', '2026-05-01 09:00:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'Anualidad Individual'),
((SELECT id FROM clients WHERE email = 'anais.cruz@mail.com'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'anais.cruz@mail.com')), 700.00, 'transfer', 'monthly', '2026-05-01 09:05:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'Mensualidad Individual'),
((SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx')), 500.00, 'cash', 'enrollment', '2026-05-06 15:30:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Anualidad Estudiante'),
((SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx'), (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx')), 500.00, 'cash', 'monthly', '2026-05-06 15:35:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'Mensualidad Estudiante');

-- 6. Pacientes de consulta
INSERT INTO patients (
  first_name, last_name, rfc, age, phone, email, occupation, referred_by, notes,
  quick_weight_kg, quick_height_cm, quick_goal, quick_health_notes, quick_assessed_at,
  is_active, first_consult_used, created_by
)
VALUES
('Valeria', 'López', 'VLLA900101ABC', 28, '5551001021', 'valeria.lopez@mail.com', 'Estudiante', 'Instagram', 'Quiere plan de tonificación.', 58.0, 164.0, 'Tonificar piernas', 'Baja energía al mediodía', '2026-05-01T09:30:00Z', TRUE, TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Ricardo', 'Mendoza', 'RCDO780202DEF', 45, '5551001022', 'ricardo.mendoza@mail.com', 'Abogado', 'Cliente', 'Dolor lumbar y estrés.', 88.0, 178.0, 'Bajar de peso', 'Sedentario por trabajo de oficina', '2026-05-02T10:15:00Z', TRUE, FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Paola', 'Reyes', 'PLRE850303GHI', 34, '5551001023', 'paola.reyes@mail.com', 'Diseñadora', 'Web', 'Busca definición abdominal.', 65.0, 168.0, 'Definir abdomen', 'Estrés laboral', '2026-05-03T11:00:00Z', TRUE, FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('Jorge', 'Torres', 'JGTR690404JKL', 55, '5551001024', 'jorge.torres@mail.com', 'Maestro', 'Amigo', 'Control de diabetes y movilidad.', 92.0, 172.0, 'Mejorar movilidad', 'Diabetes tipo 2', '2026-05-04T12:20:00Z', TRUE, FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'));

-- 7. Expedientes nutricionales
INSERT INTO nutrition_records (
  patient_id, entity_type, evaluation_date, weight_kg, height_cm, body_fat_pct, visceral_fat_pct,
  muscle_mass_kg, waist_cm, family_history, pathological_history, personal_history,
  body_composition_notes, is_free_consult, created_by
)
VALUES
((SELECT id FROM patients WHERE email = 'valeria.lopez@mail.com'), 'consultorio', '2026-05-01', 58.0, 164.0, 21.0, 5.5, 24.0, 73.0, 'Antecedentes de hipertensión', 'Sin patologías graves', 'Hace menos de 7 horas de sueño', 'Recomendación de comidas más frecuentes', TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM patients WHERE email = 'ricardo.mendoza@mail.com'), 'consultorio', '2026-05-02', 88.0, 178.0, 28.0, 9.2, 38.0, 98.0, 'Antecedentes de obesidad', 'Lumbalgia leve', 'Fuma ocasionalmente', 'Añadir ejercicios de movilidad', TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM patients WHERE email = 'paola.reyes@mail.com'), 'consultorio', '2026-05-03', 65.0, 168.0, 26.0, 7.0, 30.0, 79.0, 'Diabetes en familia', 'Migrañas', 'Estrés laboral', 'Plan de hidratación y descanso', TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM patients WHERE email = 'jorge.torres@mail.com'), 'consultorio', '2026-05-04', 92.0, 172.0, 32.0, 11.0, 36.0, 104.0, 'Diabetes tipo 2', 'Diabetes tipo 2', 'Camina 30 min diarios', 'Enfocar en movilidad y cuerpo completo', TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'));

-- 8. Control de transferencias mensuales
INSERT INTO transfer_control (month, total_received, monthly_limit)
VALUES
('2026-01-01', 18000.00, 30000.00),
('2026-02-01', 23000.00, 30000.00),
('2026-03-01', 27500.00, 30000.00),
('2026-04-01', 29250.00, 30000.00),
('2026-05-01', 12500.00, 30000.00);

-- 9. Asistencias
INSERT INTO attendance (client_id, checked_in_at, checked_out_at, method, registered_by)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), '2026-05-05 08:20:00', '2026-05-05 10:05:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx'), '2026-05-09 18:30:00', '2026-05-09 20:00:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), '2026-05-10 09:10:00', '2026-05-10 10:15:00', 'manual', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'diego.perez@empresa.com'), '2026-05-11 07:45:00', '2026-05-11 09:00:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'mariana.vega@mail.com'), '2026-05-12 17:15:00', '2026-05-12 18:45:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'javier.ortega@correo.com'), '2026-05-11 10:00:00', '2026-05-11 11:20:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'anais.cruz@mail.com'), '2026-05-13 08:30:00', '2026-05-13 09:50:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'fernanda.silva@estudiante.mx'), '2026-05-14 16:00:00', '2026-05-14 17:30:00', 'qr', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'));

-- 10. Expedientes nutricionales
INSERT INTO nutrition_records (
  client_id, evaluation_date, weight_kg, height_cm, body_fat_pct, visceral_fat_pct,
  muscle_mass_kg, waist_cm, family_history, pathological_history, personal_history,
  body_composition_notes, is_free_consult, created_by
)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), '2026-05-06', 62.4, 165.0, 24.5, 6.5, 28.0, 78.0, 'Antecedentes de diabetes', 'Sin enfermedades crónicas', 'Vida activa, no fuma', 'Buen progreso en fuerza', FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), '2026-05-10', 68.0, 158.0, 32.0, 9.8, 24.0, 92.0, 'Hipertensión en familia', 'Hipertensión controlada', 'Caminatas diarias', 'Monitorear presión arterial', FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'javier.ortega@correo.com'), '2026-05-09', 83.5, 175.0, 22.8, 7.4, 34.0, 88.0, 'Asma en familia', 'Asma leve', 'Fuma ocasionalmente', 'Mejorar capacidad pulmonar', TRUE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'anais.cruz@mail.com'), '2026-05-04', 70.2, 170.0, 31.5, 10.2, 30.0, 94.0, 'Diabetes tipo 2', 'Diabetes', 'Sedentaria antes de inscribirse', 'Reducir glucosa', FALSE, (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'));

-- 9. Planes de ejercicio
INSERT INTO exercise_plans (
  client_id, nutrition_record_id, month_year, content, pdf_url, sent_at, created_by
)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'),
 (SELECT id FROM nutrition_records WHERE client_id = (SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com') ORDER BY evaluation_date DESC LIMIT 1),
 'Mayo 2026',
 '{"weeks":[{"day":"Lunes","routine":["Calentamiento","Circuito full body","Estiramiento"]},{"day":"Miércoles","routine":["Cardio","Fuerza piernas","Core"]},{"day":"Viernes","routine":["HIIT","Espalda","Estiramiento"]}]}',
 'https://example.com/plan-sofia.pdf', '2026-05-07 09:30:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'),
 (SELECT id FROM nutrition_records WHERE client_id = (SELECT id FROM clients WHERE email = 'ana.lopez@correo.com') ORDER BY evaluation_date DESC LIMIT 1),
 'Mayo 2026',
 '{"weeks":[{"day":"Martes","routine":["Caminata suave","Movilidad articular","Estiramiento"]},{"day":"Jueves","routine":["Bicicleta estacionaria","Fuerza ligera","Respiración"]}]}',
 'https://example.com/plan-ana-lopez.pdf', '2026-05-11 10:20:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'));

-- 10. Notificaciones de prueba
INSERT INTO notifications (client_id, type, channel, message, sent_at, sent_by, status)
VALUES
((SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com'), 'plan_sent', 'whatsapp', 'Tu plan de entrenamiento ya está disponible. Revisa tu perfil.', '2026-05-07 09:35:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'sent'),
((SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx'), '3day_warning', 'whatsapp', 'Tu suscripción vence en 3 días. Renueva para seguir entrenando.', '2026-05-30 18:00:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'pending'),
((SELECT id FROM clients WHERE email = 'ana.lopez@correo.com'), 'expiry_day', 'whatsapp', 'Tu plan expira hoy. Ven a la recepción para renovarlo.', '2026-05-20 09:00:00', (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'), 'sent'),
((SELECT id FROM clients WHERE email = 'diego.perez@empresa.com'), 'manager_alert', 'whatsapp', 'Cliente con dolor lumbar detectado. Verificar plan de entrenamiento.', '2026-05-11 15:30:00', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'), 'sent');

-- 11. Auditoría de cambios
INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, performed_by)
VALUES
('payments', (SELECT id FROM payments WHERE client_id = (SELECT id FROM clients WHERE email = 'sofia.ramirez@gmail.com') LIMIT 1), 'INSERT', NULL, '{"amount":650.00,"payment_method":"card","payment_type":"enrollment"}'::jsonb, (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com')),
('subscriptions', (SELECT id FROM subscriptions WHERE client_id = (SELECT id FROM clients WHERE email = 'mateo.garcia@studentes.mx') LIMIT 1), 'INSERT', NULL, '{"status":"active"}'::jsonb, (SELECT id FROM app_users WHERE email = 'recepcion@pimpongym.com'));

-- 12. Agenda / Eventos de prueba
INSERT INTO agenda (event_type, title, description, patient_id, phone, status, start_at, end_at, metadata, created_by)
VALUES
('cita', 'Cita Nutricional Inicial', 'Primera cita de evaluación.', (SELECT id FROM patients WHERE email = 'valeria.lopez@mail.com'), '5551001021', 'realizada', '2026-05-01T09:30:00Z', '2026-05-01T10:30:00Z', '{"reason": "Evaluación general"}', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('cita', 'Revisión Mensual', 'Cita de seguimiento.', (SELECT id FROM patients WHERE email = 'ricardo.mendoza@mail.com'), '5551001022', 'programada', '2026-05-15T10:00:00Z', '2026-05-15T11:00:00Z', '{"reason": "Seguimiento dolor lumbar"}', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com')),
('reunion', 'Junta de Staff', 'Reunión mensual para revisar métricas.', NULL, NULL, 'programada', '2026-05-20T14:00:00Z', '2026-05-20T15:00:00Z', '{"with_whom": "Todo el equipo", "location": "Oficina"}', (SELECT id FROM app_users WHERE email = 'admin@pimpongym.com')),
('videollamada', 'Asesoría Online', 'Consulta express sobre suplementos.', (SELECT id FROM patients WHERE email = 'paola.reyes@mail.com'), '5551001023', 'confirmada', '2026-05-18T16:00:00Z', '2026-05-18T16:30:00Z', '{"medium": "Google Meet", "reason": "Dudas dieta"}', (SELECT id FROM app_users WHERE email = 'nutri@pimpongym.com'));
