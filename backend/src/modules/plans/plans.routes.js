const { query } = require('../../lib/database');
const { requireAuth } = require('../../middleware/auth.middleware');

async function plansRoutes(fastify, options) {
  // SEGURIDAD: Defensa en profundidad — Requiere autenticación JWT
  fastify.addHook('onRequest', requireAuth);
  fastify.get('/', async (request, reply) => {
    try {
      const { rows } = await query('SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_monthly DESC');
      return { data: rows };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Error al obtener los planes' });
    }
  });
}

module.exports = plansRoutes;
