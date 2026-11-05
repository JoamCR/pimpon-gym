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

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_records' AND column_name = 'is_paid'
      ) THEN
        ALTER TABLE nutrition_records ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
      END IF;

      WITH ranked_evals AS (
        SELECT 
          id, 
          COALESCE(patient_id, client_id) as target_id,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(patient_id, client_id) 
            ORDER BY evaluation_date ASC, created_at ASC
          ) as eval_rank
        FROM nutrition_records
      ),
      payment_counts AS (
        SELECT 
          COALESCE(patient_id, client_id) as target_id, 
          COUNT(*) as paid_count
        FROM payments
        WHERE payment_type IN ('nutrition_consult', 'nutrition_followup')
          AND (is_voided IS NULL OR is_voided = false)
        GROUP BY COALESCE(patient_id, client_id)
      )
      UPDATE nutrition_records nr
      SET is_paid = (re.eval_rank <= COALESCE(pc.paid_count, 0))
      FROM ranked_evals re
      LEFT JOIN payment_counts pc ON re.target_id = pc.target_id
      WHERE nr.id = re.id
        AND nr.is_paid IS DISTINCT FROM (re.eval_rank <= COALESCE(pc.paid_count, 0));
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
    // Migración: Tabla de egresos
    `
    CREATE TABLE IF NOT EXISTS expenses (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      concept       VARCHAR(255) NOT NULL,
      amount        NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
      expense_date  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      notes         TEXT,
      created_by    UUID REFERENCES app_users(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    `,
    // Migración: Ampliar tabla de notificaciones para WhatsApp y Consultorio
    `
    DO $$
    BEGIN
      ALTER TABLE notifications ALTER COLUMN client_id DROP NOT NULL;
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'patient_id'
      ) THEN
        ALTER TABLE notifications ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'phone'
      ) THEN
        ALTER TABLE notifications ADD COLUMN phone VARCHAR(20);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'entity_type'
      ) THEN
        ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(50) DEFAULT 'gym';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata'
      ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      END IF;

      ALTER TABLE notifications ALTER COLUMN sent_at SET DEFAULT CURRENT_TIMESTAMP;
      UPDATE notifications SET sent_at = CURRENT_TIMESTAMP WHERE sent_at IS NULL;
    END $$;
    `,
    // Migración: Tabla de mensajes interactivos de WhatsApp (Chats bidireccionales)
    `
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(30) NOT NULL,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
      entity_type VARCHAR(50) DEFAULT 'gym',
      direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
      message_type VARCHAR(50) DEFAULT 'text',
      message TEXT NOT NULL,
      media_url TEXT,
      caption TEXT,
      status VARCHAR(50) DEFAULT 'sent',
      wa_message_id VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
    `,
    // Migración: Garantizar que payments cumpla con chk_payments_entity_type y payments_entity_link_check de Supabase
    `
    DO $$
    BEGIN
      UPDATE payments
      SET entity_type = 'gym'
      WHERE client_id IS NOT NULL AND patient_id IS NULL AND entity_type != 'gym';

      UPDATE payments
      SET entity_type = 'consultorio'
      WHERE patient_id IS NOT NULL AND client_id IS NULL AND entity_type != 'consultorio';

      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_entity_link_check'
      ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_entity_link_check;
      END IF;

      ALTER TABLE payments
        ADD CONSTRAINT payments_entity_link_check CHECK (
          (entity_type = 'gym' AND client_id IS NOT NULL AND patient_id IS NULL) OR
          (entity_type = 'consultorio' AND patient_id IS NOT NULL AND client_id IS NULL)
        );
    END $$;
    `,
    // Migración: Actualizar suscripciones vencidas que seguían con status = 'active'
    `
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date < CURRENT_DATE;
    `,
    // Migración: Inicializar consecutive_months = 1 para clientes que ya pagaron mensualidad pero quedaron en 0 al inscribirse
    `
    UPDATE clients c
    SET consecutive_months = 1
    WHERE COALESCE(c.consecutive_months, 0) = 0
      AND EXISTS (
        SELECT 1 FROM payments p
        WHERE p.client_id = c.id
          AND p.payment_type = 'monthly'
          AND (p.is_voided IS NULL OR p.is_voided = false)
      );
    `,
    // Migración: Vincular perfiles de la misma persona entre Gimnasio (clients) y Consultorio (patients)
    // Excluye familiares que comparten teléfono pero tienen distinto nombre
    `
    DO $$
    DECLARE
      pair RECORD;
      orig VARCHAR(50);
      flow VARCHAR(50);
    BEGIN
      FOR pair IN
        SELECT * FROM (VALUES
          ('1a2f8a92-9f81-4f6c-9d68-b20768763967'::uuid, '80451758-81af-49c6-8cd5-8cbae5da241e'::uuid),
          ('b6a15b64-37c8-46c1-a09f-550a2c1a114b'::uuid, '7288b4b5-b05e-46db-bdc9-c25fd35661fb'::uuid),
          ('94ee67b4-af65-452f-a352-d2720d3084d7'::uuid, 'd56993be-7350-4c6f-a27b-765ebfb45da2'::uuid),
          ('77a6006b-7f45-4014-93c7-2ab1d76c60b4'::uuid, '54d15029-6f25-438d-a1a9-955039cf7c53'::uuid),
          ('f2710c40-680e-40f8-a9ab-fa4bbbf4f59a'::uuid, '9370750f-8eb5-44d2-a7dd-081fc0960a3e'::uuid),
          ('8e807668-d5e8-47a9-bfbc-00cdb5760bc7'::uuid, '7fb596ae-ab38-4936-b021-21be2ca7ac3c'::uuid),
          ('db0dee8c-72dc-491f-9164-0c3949f4dca8'::uuid, 'a4ccda85-8aaa-449d-84f5-698dd17c7e64'::uuid),
          ('2aeeab74-0bed-494d-8ecb-aca36dee3ac7'::uuid, '73058a8a-a30e-4e39-8ca4-8c84da10f52c'::uuid),
          ('326c9e6e-a063-482b-a640-b8ed7fbf22d3'::uuid, '5fbc44ee-3806-40c0-ae99-a7af0d7efa0e'::uuid),
          ('978117aa-9b96-44e7-8d8c-47d175ac1bfc'::uuid, '5233bba6-e87b-4f9a-8a20-a6db7cd891c7'::uuid),
          ('31e0292d-9471-45a8-9a85-a65d502fef04'::uuid, 'd827968a-a743-4559-869c-ab6b9ee5dc6c'::uuid),
          ('d33da0b5-a9a0-4707-a9de-602d2aabf927'::uuid, 'a6cdeae7-58c7-4c9d-95a5-2ebea79d960e'::uuid),
          ('9f5a2ab5-1a4d-4ec4-965a-ff663a8c1d9d'::uuid, 'd080af39-abcb-4549-a34a-fd58c78e32fc'::uuid),
          ('95551ec2-ee94-4c58-9692-c37ab0bea021'::uuid, '1c5d86d9-2aa4-4d84-bff9-5bac78a5ba16'::uuid),
          ('40c9bcdd-9d0c-40cb-9842-0028b99be9ab'::uuid, '1e392e71-2d5b-4599-a943-ebe0801282f7'::uuid),
          ('c6d8cd87-bbbc-40b1-b41b-41a5f8f37cd1'::uuid, 'ba32ac4e-e7bd-439f-9ff9-ad018f96d4be'::uuid),
          ('73e908df-fb2e-4220-a2cb-19216785668a'::uuid, '857957ce-d99f-4195-970e-7389c4854a72'::uuid),
          ('e35f1ed0-5a37-48b8-8c95-6e9de411737f'::uuid, 'd13e9287-2a3c-4ce3-b573-8bda6b2c4ecf'::uuid),
          ('d25318e6-b828-45d7-b2f4-905903b1a5c7'::uuid, '5a574000-3314-4034-acb0-c92dd8814ee9'::uuid),
          ('55316925-ead1-497f-834b-3a4a78b4945c'::uuid, '06ccc25a-8ae4-47d9-bdb5-02ecc7c3edb0'::uuid),
          ('c7d3ddc4-5668-4b37-86a2-598a0434822d'::uuid, '9ba27245-cc75-4705-9336-7916cf8443b8'::uuid),
          ('c081df62-d78f-4f4a-9800-7853b25bb007'::uuid, 'e8b847b8-23c3-4933-a98d-1cba9ce42839'::uuid),
          ('01dd309e-e929-44ba-a592-37b51dfe867c'::uuid, 'ab092580-11e9-441f-844e-0f83817917f3'::uuid),
          ('a1373d7b-19f4-4a26-948f-2fe2e17affb5'::uuid, 'b6e193ed-9249-4dfd-9d98-bdabba35d7ba'::uuid),
          ('556d41d4-74b4-4d5d-ace8-d681535575ad'::uuid, '96a1ad10-5d47-4e6c-b5da-bc2160f90c53'::uuid),
          ('cb99047d-545b-4948-8ebe-32fa8d29b842'::uuid, 'a3f67989-6556-41cc-965e-78fd416fe2d0'::uuid),
          ('92e336ba-3106-4f5a-8d25-aea7b41dcc4c'::uuid, '443f26c7-d5ea-4cb1-9cd4-24a0e71126c2'::uuid),
          ('508accf5-34e0-4bbd-bdaf-ce7abc01a850'::uuid, 'aceba89c-29c3-4493-a64b-22797aae4a13'::uuid),
          ('1ae70849-e771-4f03-a02e-31612efc593a'::uuid, '25e48720-011f-4fe0-b962-d0c17eefdb1f'::uuid),
          ('6e8bd2ac-e283-4e35-9afe-3dae9d54b519'::uuid, 'eae9fd9c-52c6-4a7f-8698-b225e08db1bd'::uuid),
          ('523fd498-c76a-4cbf-b53a-7eaeceb7ea97'::uuid, 'acd292c4-13e5-4d09-9500-6265f8f3bdee'::uuid),
          ('a75b287c-fc06-45b1-9cdf-567d4139faaa'::uuid, '1dd0c422-8a86-444e-90b9-bedc713b7d42'::uuid),
          ('4296c447-4200-4c62-adb3-9a457013a6ea'::uuid, '83d8029e-9fbe-4e70-b789-025d8aebf0e0'::uuid),
          ('007b5e3e-f3c5-4469-bd93-7b3aed71c9b0'::uuid, '1ff0ba87-7050-41ae-9cc8-deb480deada8'::uuid),
          ('e8ed30c9-9852-4ce0-8f16-db20295097f9'::uuid, '25cbe04f-48b0-4022-ad90-c9019ed673fd'::uuid),
          ('162d3c44-192c-43f4-9ad1-3485ce697b1d'::uuid, 'b16379e7-1e6f-4728-b364-a35b835fb8c6'::uuid),
          ('939bc85d-25ce-42ce-a881-6fb1eef9bbdb'::uuid, '54cb3633-45f6-4d8d-8317-48fff6e939f5'::uuid),
          ('75bbe677-5d58-47ce-a010-7d3679810ad7'::uuid, '260d297e-5ddf-4879-9769-d52f4482b459'::uuid),
          ('7ccbd60a-20a6-411c-8312-56d8513ec779'::uuid, 'df989eae-4a15-446f-9525-bbd87862119f'::uuid),
          ('cc0f3fad-5e48-4812-b7d5-c5be41a5d306'::uuid, '663362a3-d171-4d86-8eb4-1a6bba469ace'::uuid),
          ('9fb621e6-8010-4a75-8908-2ab9706a13fc'::uuid, '3baae4ad-2937-48bf-a9b9-717cfdfc521d'::uuid),
          ('bd3f6d74-f216-46a1-8d1f-6882fe75b219'::uuid, 'f4758034-b5e1-4d75-8721-25aaeedd3e89'::uuid),
          ('766a3005-f1b4-4599-b359-e05ec6e9f557'::uuid, '15685f7d-8a93-4604-8cf6-88d8010e9605'::uuid),
          ('e9de80d6-52a7-4be3-9479-3eb8e5f6a5c6'::uuid, 'ae9f44bf-3f52-4991-b088-e57cb14e9b25'::uuid),
          ('7cff9d22-329a-4761-ad4f-287c13334450'::uuid, '8b353098-2271-4f49-bb48-ab33e58e796d'::uuid),
          ('ed90d323-534e-40bb-933c-8713ab5a078b'::uuid, '408195b2-020b-4909-9e4c-88da4b6b76d3'::uuid),
          ('a77f58f1-dc0b-44e1-b150-e6aaf0242d5e'::uuid, 'f8dae56f-97d2-4378-adb8-e287ba738cac'::uuid),
          ('785bba49-aea9-48a3-b6cc-d7ce970a07a4'::uuid, '73d9f2ce-4002-49aa-8b29-029ac9bc9e39'::uuid),
          ('43c23d5c-2a07-4dff-84a2-dcdfbee1e0d6'::uuid, '187e4613-7da5-4182-a747-4b57fe8d453c'::uuid),
          ('255bffd8-9ef3-4ccb-9e6f-014b3ff196f6'::uuid, '86abbd56-9cac-4706-b934-e5a53f866a68'::uuid),
          ('4b7d070a-e551-4dd3-9e55-d179b35e8026'::uuid, '7c26bff7-8bc1-45b7-ab03-0466a9ce104c'::uuid),
          ('62cdf52d-88d5-473a-a3b7-63fbff4c9c3b'::uuid, 'b5a7935f-92bc-4ad9-9b01-337b230dc85f'::uuid),
          ('a77cd288-aadf-433f-9590-8dd5b4ea2314'::uuid, '1c729136-abe5-4965-bb62-8e37c83ac4da'::uuid),
          ('c885c235-9b5e-47c4-9eef-14edfd24ca07'::uuid, 'ca6da9bb-f06b-4c0e-88b2-229a113ada71'::uuid),
          ('f02f4322-be95-49b8-9953-c2d7cff01dbc'::uuid, '21650081-e339-4bb4-8a47-3150ee211eff'::uuid),
          ('99cfb8de-a2c9-4161-abe2-4f081c4d670e'::uuid, '5cbb86e7-b16d-4baa-a998-5ff8a52a4759'::uuid)
        ) AS t(c_id, p_id)
      LOOP
        SELECT
          CASE WHEN c.created_at <= p.created_at THEN 'gimnasio' ELSE 'nutricion' END,
          CASE WHEN c.created_at <= p.created_at THEN 'gimnasio_y_nutricion' ELSE 'nutricion_y_gimnasio' END
        INTO orig, flow
        FROM clients c, patients p
        WHERE c.id = pair.c_id AND p.id = pair.p_id;

        IF orig IS NOT NULL THEN
          UPDATE clients
          SET patient_id = pair.p_id,
              initial_origin = orig,
              current_flow = flow
          WHERE id = pair.c_id;

          UPDATE patients
          SET client_id = pair.c_id,
              initial_origin = orig,
              current_flow = flow
          WHERE id = pair.p_id;
        END IF;
      END LOOP;
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
