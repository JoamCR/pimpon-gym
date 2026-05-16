const service = require('./notifications.service');
const schema = require('./notifications.schema');

/**
 * Rutas del módulo de Notificaciones
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 */
async function notificationRoutes(fastify, options) {
  
  // TODO: Agregar hooks de autenticación y autorización aquí.
  // Ejemplo futuro: fastify.addHook('onRequest', fastify.authenticate)
  //                 fastify.addHook('preHandler', roleGuard(['receptionist', 'admin', 'owner']))

  /**
   * POST /api/notifications/send
   * Envía una notificación a un cliente (3day_warning, expiry_day, etc)
   */
  fastify.post('/send', async (request, reply) => {
    // 1. Validación con Zod
    const validation = schema.sendNotificationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos de la notificación',
        details: validation.error.format()
      });
    }

    // TODO: En el futuro esto vendrá del token de auth: request.user.id
    const sentBy = request.user?.id || null;

    // 2. Llamar al servicio
    const notification = await service.send(validation.data, sentBy);
    
    return reply.status(201).send({ data: notification });
  });
}

module.exports = notificationRoutes;
