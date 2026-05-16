const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * Repository del módulo de notificaciones
 * REGLA: Todas las queries SQL van aquí, NUNCA en service.js
 */

/**
 * Crea un registro de notificación en la base de datos
 */
const create = async (data) => {
  const query = `
    INSERT INTO notifications (client_id, type, channel, message, sent_by, status)
    VALUES ($1, $2, $3, $4, $5, 'sent')
    RETURNING id, client_id, type, channel, message, sent_at, status;
  `;
  
  try {
    const result = await pool.query(query, [
      data.client_id,
      data.type,
      data.channel || 'whatsapp',
      data.message || `Notificación de tipo: ${data.type}`,
      data.sent_by || null,
    ]);
    
    return result.rows[0];
  } catch (err) {
    console.error('Error en create notificación:', err.message);
    throw createError(500, 'Error al registrar notificación');
  }
};

/**
 * Obtiene el último registro de notificación para un cliente de un tipo específico
 */
const findLastByClientAndType = async (clientId, type) => {
  const query = `
    SELECT * FROM notifications
    WHERE client_id = $1 AND type = $2
    ORDER BY sent_at DESC
    LIMIT 1;
  `;
  
  try {
    const result = await pool.query(query, [clientId, type]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error en findLastByClientAndType:', err.message);
    throw createError(500, 'Error al obtener notificación anterior');
  }
};

module.exports = {
  create,
  findLastByClientAndType,
};
