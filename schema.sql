-- -----------------------------------------------------------------------------
-- PIMPON GYM - SCRIPT DE CREACIÓN DE BASE DE DATOS
-- -----------------------------------------------------------------------------

-- 1. TABLA DE USUARIOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'receptionist', 'nutritionist')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PLANES
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_enrollment NUMERIC(10, 2) NOT NULL DEFAULT 0,
    includes_nutrition BOOLEAN DEFAULT FALSE,
    requires_enrollment BOOLEAN DEFAULT TRUE,
    is_visit_based BOOLEAN DEFAULT FALSE,
    duration_days INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INT,
    phone VARCHAR(20),
    email VARCHAR(255),
    rfc VARCHAR(13),
    gender VARCHAR(20),
    client_type VARCHAR(50),
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    enrollment_date DATE,
    enrollment_expires_at DATE,
    first_consult_used BOOLEAN DEFAULT FALSE,
    consecutive_months INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    qr_code VARCHAR(255),
    notes TEXT,
    coach_fitness_level VARCHAR(50),
    coach_health_notes TEXT,
    coach_goal TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- 4. TABLA DE PACIENTES
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
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

-- 5. TABLA DE SUSCRIPCIONES
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    notified_3days BOOLEAN DEFAULT FALSE,
    notified_expiry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE PAGOS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'gym' CHECK (entity_type IN ('gym', 'consultorio')),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card')),
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('enrollment', 'monthly', 'visit', 'nutrition_consult', 'nutrition_followup')),
    paid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    registered_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    notes TEXT,
    is_voided BOOLEAN DEFAULT FALSE,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    CONSTRAINT chk_payments_entity_type CHECK (
        (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
        (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
    )
);

-- 6. CONTROL DE TRANSFERENCIAS MENSULARES (Tope 30k)
CREATE TABLE IF NOT EXISTS transfer_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE UNIQUE NOT NULL,
    total_received NUMERIC(10, 2) DEFAULT 0,
    monthly_limit NUMERIC(10, 2) DEFAULT 30000.00,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE ASISTENCIA
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMPTZ,
    method VARCHAR(50) NOT NULL CHECK (method IN ('qr', 'manual', 'code')),
    registered_by UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- 8. EXPEDIENTES NUTRICIONALES
CREATE TABLE IF NOT EXISTS nutrition_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'gym' CHECK (entity_type IN ('gym', 'consultorio')),
    evaluation_date DATE NOT NULL,
    weight_kg NUMERIC(5, 2),
    height_cm NUMERIC(5, 2),
    body_fat_pct NUMERIC(5, 2),
    visceral_fat_pct NUMERIC(5, 2),
    muscle_mass_kg NUMERIC(5, 2),
    waist_cm NUMERIC(5, 2),
    family_history TEXT,
    pathological_history TEXT,
    personal_history TEXT,
    body_composition_notes TEXT,
    
    -- Historia clinica / Health indicators
    smokes BOOLEAN DEFAULT false,
    drinks_alcohol BOOLEAN DEFAULT false,
    uses_drugs BOOLEAN DEFAULT false,
    drugs_description TEXT,
    drinks_soda BOOLEAN DEFAULT false,
    eats_junk_food BOOLEAN DEFAULT false,
    junk_food_description TEXT,
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    bowel_movements TEXT,
    hunger_level INTEGER CHECK (hunger_level >= 1 AND hunger_level <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    concentration_level INTEGER CHECK (concentration_level >= 1 AND concentration_level <= 10),
    mood_level INTEGER CHECK (mood_level >= 1 AND mood_level <= 10),
    sp_notes TEXT,

    -- Plan nutricional
    diet_plan TEXT,
    caloric_target NUMERIC(6,1),
    protein_target_g NUMERIC(5,1),
    carbs_target_g NUMERIC(5,1),
    fat_target_g NUMERIC(5,1),

    is_free_consult BOOLEAN DEFAULT false,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
      (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
    )
);

-- 9. PLANES DE EJERCICIO
CREATE TABLE IF NOT EXISTS exercise_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nutrition_record_id UUID REFERENCES nutrition_records(id) ON DELETE SET NULL,
    month_year VARCHAR(20) NOT NULL,
    content JSONB NOT NULL,
    pdf_url VARCHAR(255),
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('3day_warning', 'expiry_day', 'manager_alert', 'plan_sent')),
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed', 'pending'))
);

-- 11. AUDIT LOG (Obligatorio para payments según requerimiento)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. AGENDA / EVENTOS (Citas, Reuniones, Videollamadas, Otros)
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