const service = require('./statistics.service');
const schema = require('./statistics.schema');
const { requireRole } = require('../../middleware/role.guard');

/**
 * Rutas del módulo de Estadísticas
 */
async function statisticsRoutes(fastify, options) {
  // Solo el owner y admin pueden ver estadísticas en principio
  fastify.addHook('preHandler', requireRole(['owner', 'admin']));

  fastify.get('/dashboard', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getDashboardStats(year, month);
    return { data };
  });

  fastify.get('/expired-clients', async (request, reply) => {
    const data = await service.getExpiredClients();
    return { data };
  });

  fastify.get('/enrollments', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getEnrollments(month, year);
    return { data };
  });

  fastify.get('/absent-clients', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getClientsWithoutAttendance(month, year);
    return { data };
  });

  fastify.get('/consistent-clients', async (request, reply) => {
    const validation = schema.minMonthsSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { minMonths } = validation.data;
    const data = await service.getConsistentClients(minMonths);
    return { data };
  });

  fastify.get('/cash-cutoff', async (request, reply) => {
    const validation = schema.dateRangeSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { from, to } = validation.data;
    const data = await service.getCashCutoffHistory(from, to);
    return { data };
  });
}

module.exports = statisticsRoutes;
