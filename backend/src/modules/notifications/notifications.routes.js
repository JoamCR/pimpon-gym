const service = require('./notifications.service');
const schema = require('./notifications.schema');
const { requireAuth } = require('../../middleware/auth.middleware');

/**
 * Rutas del módulo de Notificaciones de WhatsApp
 * REGLA: Autenticación requerida para todas las rutas.
 */
async function notificationRoutes(fastify, options) {

  // Hook de autenticación JWT (excluyendo webhook público de Meta)
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.includes('/webhook')) {
      return;
    }
    return requireAuth(request, reply);
  });

  /**
   * POST /api/notifications/send
   * Envía una notificación manual o automática por WhatsApp
   */
  fastify.post('/send', async (request, reply) => {
    const sentBy = request.user?.id || null;
    const notification = await service.send(request.body, sentBy);
    return reply.status(201).send({ data: notification });
  });

  /**
   * POST /api/notifications/send-bulk
   * Envía notificaciones masivas a una lista de destinatarios seleccionados
   */
  fastify.post('/send-bulk', async (request, reply) => {
    const sentBy = request.user?.id || null;
    const result = await service.sendBulk(request.body || {}, sentBy);
    return reply.send({ data: result });
  });

  /**
   * GET /api/notifications/pending
   * Obtiene la lista clasificada de destinatarios pendientes para WhatsApp
   */
  fastify.get('/pending', async (request, reply) => {
    const result = await service.getPendingTargets();
    return reply.send({ data: result });
  });

  /**
   * POST /api/notifications/test
   * Envía un mensaje de prueba de WhatsApp
   */
  fastify.post('/test', async (request, reply) => {
    const { phone, useTemplate, templateName } = request.body || {};
    const result = await service.sendTest({ phone, useTemplate, templateName });
    return reply.send({ success: true, result });
  });

  /**
   * GET /api/notifications/history
   * Obtiene el historial de notificaciones enviadas
   */
  fastify.get('/history', async (request, reply) => {
    const { limit = 100, offset = 0, type = null } = request.query || {};
    const history = await service.getHistory(parseInt(limit, 10), parseInt(offset, 10), type);
    return reply.send({ data: history });
  });

  /**
   * GET /api/notifications/chats
   * Obtiene la lista de chats/conversaciones activas con último mensaje y estado
   */
  fastify.get('/chats', async (request, reply) => {
    const chats = await service.getChats();
    return reply.send({ data: chats });
  });

  /**
   * GET /api/notifications/chats/:phone/messages
   * Obtiene el historial de mensajes de una conversación
   */
  fastify.get('/chats/:phone/messages', async (request, reply) => {
    const { phone } = request.params;
    const messages = await service.getChatMessages(phone);
    return reply.send({ data: messages });
  });

  /**
   * POST /api/notifications/chats/:phone/send
   * Envía un mensaje en el chat y lo registra en BD
   */
  fastify.post('/chats/:phone/send', async (request, reply) => {
    const { phone } = request.params;
    const sentBy = request.user?.id || null;
    const payload = { ...request.body, phone };
    const result = await service.sendChatMessage(payload, sentBy);
    return reply.status(201).send({ data: result });
  });

  /**
   * POST /api/notifications/chats/simulate-reply
   * Simula una respuesta entrante de cliente para pruebas interactivas
   */
  fastify.post('/chats/simulate-reply', async (request, reply) => {
    const result = await service.simulateIncomingReply(request.body || {});
    return reply.status(201).send({ data: result });
  });

  /**
   * GET /api/notifications/webhook
   * Verificación del Webhook de Meta WhatsApp Cloud API
   */
  fastify.get('/webhook', async (request, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'pimpon_webhook_token_2026';

    if (mode === 'subscribe' && token === verifyToken) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send('Forbidden');
  });

  /**
   * POST /api/notifications/webhook
   * Recepción de eventos y mensajes entrantes de Meta WhatsApp Cloud API
   */
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body;
    if (body?.object === 'whatsapp_business_account') {
      try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
          for (const msg of messages) {
            const fromPhone = msg.from;
            const textBody = msg.text?.body || (msg.type === 'button' ? msg.button?.text : 'Mensaje recibido');
            
            await service.simulateIncomingReply({
              phone: fromPhone,
              message: textBody,
            });
          }
        }
      } catch (err) {
        console.error('Error procesando webhook entrante de Meta:', err);
      }
      return reply.status(200).send({ status: 'EVENT_RECEIVED' });
    }
    return reply.status(404).send();
  });
}

module.exports = notificationRoutes;
