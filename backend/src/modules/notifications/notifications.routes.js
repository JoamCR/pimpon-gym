const service = require('./notifications.service');
const schema = require('./notifications.schema');

/**
 * Rutas del módulo de Notificaciones de WhatsApp
 * REGLA: Nunca incluir lógica de negocio aquí.
 */
async function notificationRoutes(fastify, options) {

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
    const { phone } = request.body || {};
    const result = await service.sendTest(phone);
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
}

module.exports = notificationRoutes;
