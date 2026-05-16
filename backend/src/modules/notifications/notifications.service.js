const repository = require('./notifications.repository');
const { createError } = require('../../lib/appError');

/**
 * Servicio de notificaciones
 * REGLA: Lógica de negocio ÚNICAMENTE. Nunca queries SQL aquí.
 */

/**
 * Envía una notificación a un cliente
 * En una implementación completa, esto se integraría con WhatsApp/n8n
 */
const send = async (data, sentBy) => {
  try {
    // Validación básica
    if (!data.client_id) {
      throw createError(400, 'El client_id es requerido');
    }

    // Crear el registro de notificación en BD
    const notification = await repository.create({
      client_id: data.client_id,
      type: data.type,
      channel: 'whatsapp',
      message: `Notificación enviada: ${data.type}`,
      sent_by: sentBy,
    });

    // TODO: Integrar con WhatsApp service (POST a :3001)
    // TODO: Integrar con n8n webhook si es necesario

    return notification;
  } catch (error) {
    console.error('Error en send notification:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al enviar notificación');
  }
};

module.exports = {
  send,
};
