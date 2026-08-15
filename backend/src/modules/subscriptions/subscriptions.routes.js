const service = require('./subscriptions.service');
const schema = require('./subscriptions.schema');
const { requireAuth } = require('../../middleware/auth.middleware');

/**
 * Rutas del módulo de Suscripciones
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 */
async function subscriptionRoutes(fastify, options) {
  
  // SEGURIDAD: Defensa en profundidad — Requiere autenticación JWT
  fastify.addHook('onRequest', requireAuth);

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
