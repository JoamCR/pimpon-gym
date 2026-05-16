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
  plans: {}
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
