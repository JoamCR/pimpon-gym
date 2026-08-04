const { pool } = require('./database');

/**
 * Ajustes automáticos de esquema para compatibilidad con los módulos de nutrición.
 * Se ejecutan al arrancar la API para que entornos existentes se actualicen sin intervención manual.
 */
const runSchemaMigrations = async () => {
  if (!pool) return;

  const statements = [
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'client_id'
      ) THEN
        ALTER TABLE exercise_plans ALTER COLUMN client_id DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'patient_id'
      ) THEN
        ALTER TABLE exercise_plans ALTER COLUMN patient_id DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'entity_type'
      ) THEN
        ALTER TABLE exercise_plans ALTER COLUMN entity_type SET DEFAULT 'gym';
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exercise_plans' AND column_name = 'entity_type'
      ) THEN
        UPDATE exercise_plans
        SET entity_type = COALESCE(entity_type, 'gym')
        WHERE entity_type IS NULL;
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercise_plans_entity_type_check'
      ) THEN
        ALTER TABLE exercise_plans
          ADD CONSTRAINT exercise_plans_entity_type_check CHECK (entity_type IN ('gym', 'consultorio'));
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercise_plans_entity_link_check'
      ) THEN
        ALTER TABLE exercise_plans
          ADD CONSTRAINT exercise_plans_entity_link_check CHECK (
            (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
            (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
          );
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'client_id'
      ) THEN
        ALTER TABLE nutrition_records ALTER COLUMN client_id DROP NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'smokes_description'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN smokes_description TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'drinks_alcohol_description'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN drinks_alcohol_description TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'drinks_soda_description'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN drinks_soda_description TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'routine_adherence'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN routine_adherence INTEGER CHECK (routine_adherence >= 1 AND routine_adherence <= 10);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'diet_adherence'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN diet_adherence INTEGER CHECK (diet_adherence >= 1 AND diet_adherence <= 10);
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'client_id'
      ) THEN
        ALTER TABLE payments ALTER COLUMN client_id DROP NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'patient_id'
      ) THEN
        ALTER TABLE clients ADD COLUMN patient_id UUID;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'initial_origin'
      ) THEN
        ALTER TABLE clients ADD COLUMN initial_origin VARCHAR(50) DEFAULT 'gimnasio';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'current_flow'
      ) THEN
        ALTER TABLE clients ADD COLUMN current_flow VARCHAR(50) DEFAULT 'gimnasio';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'client_id'
      ) THEN
        ALTER TABLE patients ADD COLUMN client_id UUID;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'initial_origin'
      ) THEN
        ALTER TABLE patients ADD COLUMN initial_origin VARCHAR(50) DEFAULT 'nutricion';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'current_flow'
      ) THEN
        ALTER TABLE patients ADD COLUMN current_flow VARCHAR(50) DEFAULT 'nutricion';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda' AND column_name = 'client_id'
      ) THEN
        ALTER TABLE agenda ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_records' AND column_name = 'target_weight_kg'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN target_weight_kg NUMERIC(5,2);
        ALTER TABLE nutrition_records ADD COLUMN target_waist_cm NUMERIC(5,2);
        ALTER TABLE nutrition_records ADD COLUMN target_body_fat_pct NUMERIC(5,2);
        ALTER TABLE nutrition_records ADD COLUMN target_muscle_mass_kg NUMERIC(5,2);
        ALTER TABLE nutrition_records ADD COLUMN target_visceral_fat_pct NUMERIC(5,2);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'allowed_pages'
      ) THEN
        ALTER TABLE app_users ADD COLUMN allowed_pages JSONB DEFAULT '[]'::jsonb;
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      UPDATE clients c
      SET 
        enrollment_date = COALESCE(c.enrollment_date, p.paid_at::date, CURRENT_DATE),
        enrollment_expires_at = COALESCE(c.enrollment_expires_at, (COALESCE(c.enrollment_date, p.paid_at::date, CURRENT_DATE) + INTERVAL '1 year')::date)
      FROM payments p
      WHERE p.client_id = c.id
        AND p.payment_type = 'enrollment'
        AND c.enrollment_expires_at IS NULL;
    END $$;
    `,
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.warn('Advertencia en migración de esquema:', err.message);
    }
  }
};

module.exports = {
  runSchemaMigrations,
};
