const { query, isConfigured } = require('../../lib/database');
const { createError } = require('../../lib/appError');

// Valores por defecto que la aplicación espera
const DEFAULT_CONFIG = {
  roles: ['owner', 'admin', 'receptionist', 'nutritionist'],
  paymentMethods: ['cash', 'transfer', 'card'],
  paymentTypes: ['enrollment', 'monthly', 'visit', 'nutrition_consult', 'nutrition_followup'],
  entityTypes: ['gym', 'consultorio'],
  attendanceMethods: ['qr', 'manual', 'code'],
  transferMonthlyLimit: parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000, 10),
  whatsappMessages: {
    '3day_warning': 'Tu membresía vence en 3 días. ¡Renueva para seguir disfrutando!',
    'expiry_day': 'Tu membresía vence hoy. Contáctanos para renovarla.'
  },
  statistics: {
    incentiveMonths: 7
  },
  plans: {},
  whatsapp: {
    enabled: true,
    mode: 'test_mode',
    sendScheduleTime: '08:30',
    metaConfig: {
      accessToken: '',
      phoneNumberId: '',
      wabaId: ''
    },
    rules: {
      CLIENT_EXPIRING_3D_MONTHLY: { enabled: true, name: 'Recordatorio 3 días antes de vencer mensualidad' },
      CLIENT_EXPIRING_3D_ANNUAL: { enabled: true, name: 'Recordatorio 3 días antes de vencer anualidad' },
      CLIENT_EXPIRED_TODAY_MONTHLY: { enabled: true, name: 'Aviso de vencimiento de mensualidad el mismo día' },
      CLIENT_EXPIRED_TODAY_ANNUAL: { enabled: true, name: 'Aviso de vencimiento de anualidad el mismo día' },
      CLIENT_RENEWAL_PROMO: { enabled: true, name: 'Promoción de reenganche para membresías vencidas' },
      CLIENT_STREAK_6M: { enabled: true, name: 'Incentivo por 6 meses consecutivos ininterrumpidos' },
      CLIENT_INACTIVITY_15D: { enabled: true, name: 'Seguimiento por inactividad (>15 días sin asistencias)' },
      CLIENT_BIRTHDAY: { enabled: true, name: 'Felicitación de cumpleaños a clientes del gimnasio' },
      CLIENT_PROMO_EVENT: { enabled: true, name: 'Difusión de promociones y eventos generales' },
      PATIENT_APPOINTMENT_1D: { enabled: true, name: 'Recordatorio de cita de nutrición 1 día antes' },
      PATIENT_APPOINTMENT_TODAY: { enabled: true, name: 'Recordatorio de cita de nutrición el mismo día' },
      PATIENT_NUTRITION_PLAN_JPG: { enabled: true, name: 'Envío de plan nutricional en JPG descargable' },
      PATIENT_EXERCISE_PLAN_JPG: { enabled: true, name: 'Envío de plan de ejercicios en JPG descargable' },
      PATIENT_BIRTHDAY: { enabled: true, name: 'Felicitación de cumpleaños a pacientes del consultorio' },
      PATIENT_PROMO_EVENT: { enabled: true, name: 'Avisos de promociones y eventos para pacientes' }
    }
  }
};

// Asegura que exista la tabla app_config
const ensureTable = async () => {
  if (!isConfigured) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await query(sql);
};

// Recupera todas las claves guardadas y mergea con defaults
const getConfig = async () => {
  try {
    if (!isConfigured) return DEFAULT_CONFIG;
    await ensureTable();

    const res = await query(`SELECT key, value FROM app_config`);
    const rows = res.rows || [];
    const stored = {};
    for (const r of rows) {
      try {
        stored[r.key] = r.value;
      } catch (e) {
        // ignorar valores corruptos
      }
    }

    return {
      ...DEFAULT_CONFIG,
      ...stored
    };
  } catch (err) {
    console.error('Error en config.repository.getConfig:', err);
    // En caso de fallo en la BD devolvemos defaults en lugar de lanzar
    return DEFAULT_CONFIG;
  }
};

// Inserta o actualiza una clave en app_config
const upsertKey = async (key, value) => {
  try {
    if (!isConfigured) return;
    await ensureTable();
    const sql = `INSERT INTO app_config(key, value, updated_at) VALUES($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    await query(sql, [key, value]);
  } catch (err) {
    console.error('Error en config.repository.upsertKey:', err);
    throw createError(500, 'Error al guardar configuración');
  }
};

const updateConfig = async (data) => {
  try {
    // Guardar cada campo individualmente
    const keys = Object.keys(data || {});
    for (const k of keys) {
      await upsertKey(k, data[k]);
    }
    // Retornar la configuración actualizada
    return await getConfig();
  } catch (err) {
    if (err.isOperational) throw err;
    throw createError(500, 'Error al actualizar configuración');
  }
};

module.exports = {
  getConfig,
  updateConfig,
  upsertKey
};
