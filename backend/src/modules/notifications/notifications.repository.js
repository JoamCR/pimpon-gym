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
    INSERT INTO notifications (client_id, patient_id, phone, entity_type, type, channel, message, sent_by, status, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [
      data.client_id || null,
      data.patient_id || null,
      data.phone || null,
      data.entity_type || 'gym',
      data.type,
      data.channel || 'whatsapp',
      data.message || `Notificación: ${data.type}`,
      data.sent_by || null,
      data.status || 'sent',
      JSON.stringify(data.metadata || {}),
    ]);
    
    return result.rows[0];
  } catch (err) {
    console.error('Error en create notificación:', err.message);
    throw createError(500, 'Error al registrar notificación');
  }
};

/**
 * Obtiene el último registro de notificación para un cliente o paciente de un tipo específico
 */
const findLastByTargetAndType = async ({ clientId, patientId, type }) => {
  let query = '';
  let params = [];

  if (clientId) {
    query = `
      SELECT * FROM notifications
      WHERE client_id = $1 AND type = $2
      ORDER BY sent_at DESC
      LIMIT 1;
    `;
    params = [clientId, type];
  } else if (patientId) {
    query = `
      SELECT * FROM notifications
      WHERE patient_id = $1 AND type = $2
      ORDER BY sent_at DESC
      LIMIT 1;
    `;
    params = [patientId, type];
  } else {
    return null;
  }
  
  try {
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error en findLastByTargetAndType:', err.message);
    return null;
  }
};

/**
 * Revisa si ya existe una notificación enviada en una fecha específica (o dentro de las últimas N horas)
 */
const hasNotificationBeenSent = async ({ clientId, patientId, type, dateStr, hoursThreshold = 20 }) => {
  try {
    let query = '';
    let params = [];

    if (clientId) {
      query = `
        SELECT id FROM notifications
        WHERE client_id = $1 AND type = $2
          AND sent_at >= NOW() - INTERVAL '${parseInt(hoursThreshold, 10)} hours'
        LIMIT 1;
      `;
      params = [clientId, type];
    } else if (patientId) {
      query = `
        SELECT id FROM notifications
        WHERE patient_id = $1 AND type = $2
          AND sent_at >= NOW() - INTERVAL '${parseInt(hoursThreshold, 10)} hours'
        LIMIT 1;
      `;
      params = [patientId, type];
    } else {
      return false;
    }

    const res = await pool.query(query, params);
    return (res.rows.length > 0);
  } catch (err) {
    console.error('Error en hasNotificationBeenSent:', err.message);
    return false;
  }
};

/**
 * Obtiene la lista completa de notificaciones con información complementaria de cliente/paciente
 */
const findAll = async (limit = 100, offset = 0, typeFilter = null) => {
  let query = `
    SELECT 
      n.*,
      COALESCE(c.first_name || ' ' || c.last_name, p.first_name || ' ' || p.last_name, 'Desconocido') as recipient_name,
      COALESCE(c.phone, p.phone, n.phone) as target_phone
    FROM notifications n
    LEFT JOIN clients c ON n.client_id = c.id
    LEFT JOIN patients p ON n.patient_id = p.id
  `;
  
  const params = [];
  if (typeFilter) {
    query += ` WHERE n.type = $1 `;
    params.push(typeFilter);
  }

  query += ` ORDER BY n.sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Error en findAll notificaciones:', err.message);
    return [];
  }
};

const findLastByClientAndType = async (clientId, type) => {
  return await findLastByTargetAndType({ clientId, type });
};

module.exports = {
  create,
  findLastByClientAndType,
  findLastByTargetAndType,
  hasNotificationBeenSent,
  findAll,
};
