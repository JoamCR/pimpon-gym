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

/**
 * Inserta un mensaje de chat interactivo (inbound u outbound)
 */
const createChatMessage = async (data) => {
  const query = `
    INSERT INTO whatsapp_messages (
      phone, client_id, patient_id, entity_type, direction,
      message_type, message, media_url, caption, status,
      wa_message_id, metadata, created_at, read_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), $14)
    RETURNING *;
  `;
  try {
    const result = await pool.query(query, [
      data.phone,
      data.client_id || null,
      data.patient_id || null,
      data.entity_type || 'gym',
      data.direction || 'outbound',
      data.message_type || 'text',
      data.message,
      data.media_url || null,
      data.caption || null,
      data.status || (data.direction === 'inbound' ? 'received' : 'sent'),
      data.wa_message_id || null,
      JSON.stringify(data.metadata || {}),
      data.created_at || null,
      data.read_at || null
    ]);
    return result.rows[0];
  } catch (err) {
    console.error('Error en createChatMessage:', err.message);
    throw createError(500, 'Error al guardar mensaje de chat');
  }
};

/**
 * Obtiene la lista de conversaciones agrupadas por teléfono con el último mensaje y no leídos
 */
const getChatConversations = async () => {
  await seedSampleChatsIfEmpty();

  const query = `
    WITH latest_msgs AS (
      SELECT DISTINCT ON (phone)
        id, phone, client_id, patient_id, entity_type, direction,
        message_type, message, media_url, status, created_at
      FROM whatsapp_messages
      ORDER BY phone, created_at DESC
    ),
    unread_counts AS (
      SELECT phone, COUNT(*) as unread_count
      FROM whatsapp_messages
      WHERE direction = 'inbound' AND (status = 'received' OR status = 'delivered')
      GROUP BY phone
    )
    SELECT 
      lm.*,
      COALESCE(c.first_name || ' ' || c.last_name, p.first_name || ' ' || p.last_name, 'Contacto WhatsApp') as contact_name,
      COALESCE(c.id, lm.client_id) as resolved_client_id,
      COALESCE(p.id, lm.patient_id) as resolved_patient_id,
      COALESCE(lm.entity_type, CASE WHEN p.id IS NOT NULL THEN 'consultorio' ELSE 'gym' END) as resolved_entity_type,
      COALESCE(uc.unread_count, 0)::int as unread_count
    FROM latest_msgs lm
    LEFT JOIN clients c ON (lm.client_id = c.id OR (lm.client_id IS NULL AND c.phone = lm.phone))
    LEFT JOIN patients p ON (lm.patient_id = p.id OR (lm.patient_id IS NULL AND p.phone = lm.phone))
    LEFT JOIN unread_counts uc ON uc.phone = lm.phone
    ORDER BY lm.created_at DESC;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en getChatConversations:', err.message);
    return [];
  }
};

/**
 * Obtiene los mensajes ordenados cronológicamente de una conversación por teléfono
 */
const getChatMessagesByPhone = async (phone, limit = 100) => {
  const query = `
    SELECT 
      m.*,
      COALESCE(c.first_name || ' ' || c.last_name, p.first_name || ' ' || p.last_name, 'Contacto') as contact_name
    FROM whatsapp_messages m
    LEFT JOIN clients c ON m.client_id = c.id
    LEFT JOIN patients p ON m.patient_id = p.id
    WHERE m.phone = $1
    ORDER BY m.created_at ASC
    LIMIT $2;
  `;

  try {
    const result = await pool.query(query, [phone, limit]);
    return result.rows;
  } catch (err) {
    console.error('Error en getChatMessagesByPhone:', err.message);
    return [];
  }
};

/**
 * Marca los mensajes entrantes de un número como leídos
 */
const markChatAsRead = async (phone) => {
  const query = `
    UPDATE whatsapp_messages
    SET status = 'read', read_at = NOW()
    WHERE phone = $1 AND direction = 'inbound' AND status != 'read';
  `;
  try {
    await pool.query(query, [phone]);
    return true;
  } catch (err) {
    console.error('Error en markChatAsRead:', err.message);
    return false;
  }
};

/**
 * Si la tabla de whatsapp_messages está vacía, genera automáticamente chats de prueba
 * utilizando clientes y pacientes reales de la base de datos o mocks realistas.
 */
const seedSampleChatsIfEmpty = async () => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM whatsapp_messages');
    const count = parseInt(countRes.rows[0].count, 10);
    if (count > 0) return; // Ya contiene mensajes

    // Obtener algunos clientes y pacientes
    const clientsRes = await pool.query("SELECT id, first_name, last_name, phone FROM clients WHERE phone IS NOT NULL AND phone != '' LIMIT 3");
    const patientsRes = await pool.query("SELECT id, first_name, last_name, phone FROM patients WHERE phone IS NOT NULL AND phone != '' AND phone != '0000000000' LIMIT 3");

    const clients = clientsRes.rows;
    const patients = patientsRes.rows;

    const sampleConversations = [];

    // Conversación 1: Gimnasio - Renovación de membresía
    if (clients[0]) {
      const c = clients[0];
      const now = Date.now();
      sampleConversations.push(
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'outbound',
          message: `Hola ${c.first_name}! 🏋️ Te recordamos que tu mensualidad en Pimpon Gym vence pronto. ¡Renueva a tiempo para seguir entrenando!`,
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // ayer
        },
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'inbound',
          message: 'Hola buenas tardes! ¿A qué hora abren mañana para pasar a pagar antes de entrar a trabajar?',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        },
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'outbound',
          message: '¡Hola! Abrimos de lunes a viernes desde las 6:00 AM hasta las 10:00 PM. ¡Te esperamos en recepción! 💪',
          status: 'delivered',
          created_at: new Date(now - 1000 * 60 * 60 * 17).toISOString(),
        },
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'inbound',
          message: 'Excelente, paso mañana temprano. ¡Muchas gracias por avisarme!',
          status: 'received',
          created_at: new Date(now - 1000 * 60 * 35).toISOString(), // hace 35 min
        }
      );
    }

    // Conversación 2: Consultorio - Cita de nutrición
    if (patients[0]) {
      const p = patients[0];
      const now = Date.now();
      sampleConversations.push(
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'outbound',
          message: `Hola ${p.first_name}! ⏰ Recordatorio: Hoy tienes agendada tu consulta de nutrición en Pimpon Consultorio a las 4:30 PM.`,
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'inbound',
          message: 'Buenas tardes Dra., ¿puedo llegar unos 10 minutos antes para registrar el peso con tranquilidad?',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'outbound',
          message: `¡Claro que sí, ${p.first_name}! Te esperamos con gusto para pasar a la báscula y bioimpedancia.`,
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'inbound',
          message: '¡Perfecto, ya voy en camino! Gracias.',
          status: 'received',
          created_at: new Date(now - 1000 * 60 * 15).toISOString(), // hace 15 min
        }
      );
    }

    // Conversación 3: Gimnasio - Inactividad / Reenganche
    if (clients[1]) {
      const c = clients[1];
      const now = Date.now();
      sampleConversations.push(
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'outbound',
          message: `Hola ${c.first_name}! 💪 Te extrañamos en Pimpon Gym. Notamos que hace algunos días no vienes a entrenar. ¡Recuerda que la constancia es la clave del progreso!`,
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 48).toISOString(), // hace 2 días
        },
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'inbound',
          message: 'Hola coach! Sí, anduve con bastante trabajo, pero justo pensaba regresar este lunes sin falta 🔥',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        },
        {
          phone: c.phone,
          client_id: c.id,
          entity_type: 'gym',
          direction: 'outbound',
          message: '¡Esa es la actitud! Ya te tenemos lista la rutina de tren superior para cuando llegues.',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 25).toISOString(),
        }
      );
    }

    // Conversación 4: Consultorio - Plan Nutricional
    if (patients[1]) {
      const p = patients[1];
      const now = Date.now();
      sampleConversations.push(
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'outbound',
          message: `Hola ${p.first_name}! 🍏 Te compartimos tu plan nutricional actualizado con los nuevos requerimientos calóricos. Recuerda beber suficiente agua.`,
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
        },
        {
          phone: p.phone,
          patient_id: p.id,
          entity_type: 'consultorio',
          direction: 'inbound',
          message: '¡Hola! Ya descargué el menú. Me gustaron mucho las opciones de desayuno, muchas gracias!',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
        }
      );
    }

    // Si no había clientes o pacientes suficientes, agregar un par de números muestra
    if (sampleConversations.length === 0) {
      const now = Date.now();
      sampleConversations.push(
        {
          phone: '9811002233',
          entity_type: 'gym',
          direction: 'outbound',
          message: 'Hola Carlos! 🏋️ Te recordamos que tu mensualidad vence pronto. ¡Renueva a tiempo!',
          status: 'read',
          created_at: new Date(now - 1000 * 60 * 60 * 10).toISOString(),
        },
        {
          phone: '9811002233',
          entity_type: 'gym',
          direction: 'inbound',
          message: 'Hola! Paso hoy por la tarde a pagar en recepción, gracias.',
          status: 'received',
          created_at: new Date(now - 1000 * 60 * 20).toISOString(),
        }
      );
    }

    for (const msg of sampleConversations) {
      await createChatMessage(msg);
    }

    console.log(`✅ ${sampleConversations.length} mensajes de prueba inicializados para Chats de WhatsApp.`);
  } catch (err) {
    console.warn('Advertencia en seedSampleChatsIfEmpty:', err.message);
  }
};

module.exports = {
  create,
  findLastByClientAndType,
  findLastByTargetAndType,
  hasNotificationBeenSent,
  findAll,
  createChatMessage,
  getChatConversations,
  getChatMessagesByPhone,
  markChatAsRead,
  seedSampleChatsIfEmpty,
};

