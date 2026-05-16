const service = require('./subscriptions.service');
const schema = require('./subscriptions.schema');

/**
 * Rutas del módulo de Suscripciones
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 */
async function subscriptionRoutes(fastify, options) {
  
  // TODO: Agregar hooks de autenticación y autorización aquí.
  // Ejemplo futuro: fastify.addHook('onRequest', fastify.authenticate)
  //                 fastify.addHook('preHandler', roleGuard(['receptionist', 'admin', 'owner']))

  /**
   * GET /api/dashboard
   * Obtiene todos los datos del dashboard en una sola llamada optimizada
   * Incluye: clientes por vencer, control de transferencias, asistencia del día
   */
  fastify.get('/dashboard', async (request, reply) => {
    const dashboardData = await service.getDashboardData();
    return { data: dashboardData };
  });
}

module.exports = subscriptionRoutes;
