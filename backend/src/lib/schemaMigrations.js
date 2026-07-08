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
    END $$;
    `,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
};

module.exports = {
  runSchemaMigrations,
};
