const service = require('./statistics.service');
const schema = require('./statistics.schema');
const { requireRole } = require('../../middleware/role.guard');

/**
 * Rutas del módulo de Estadísticas
 */
async function statisticsRoutes(fastify, options) {
  // TODO: Deshabilitar autenticación en desarrollo local. Habilitar en producción.
  // fastify.addHook('preHandler', requireRole(['owner', 'admin']));

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
    const data = await service.getAbsentClients();
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

  fastify.get('/retention-rate', async (request, reply) => {
    const data = await service.getRetentionRate();
    return { data };
  });

  fastify.get('/attendance-heatmap', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getAttendanceHeatmap(year, month);
    return { data };
  });

  fastify.get('/daily-attendance', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getDailyAttendance(year, month);
    return { data };
  });

  fastify.get('/ghost-clients', async (request, reply) => {
    const data = await service.getGhostClients();
    return { data };
  });

  fastify.get('/payment-methods', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getPaymentMethodsDistribution(year, month);
    return { data };
  });

  fastify.get('/average-ticket', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getAverageTicketPerClient(year, month);
    return { data };
  });

  fastify.get('/income-analysis', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getRecurringVsNewIncome(year, month);
    return { data };
  });

  fastify.get('/projected-debt', async (request, reply) => {
    const validation = schema.daysOutSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { daysOut } = validation.data;
    const data = await service.getProjectedDebt(daysOut);
    return { data };
  });

  fastify.get('/nutrition-conversion', async (request, reply) => {
    const data = await service.getNutritionConversionRate();
    return { data };
  });

  fastify.get('/six-month-eligible', async (request, reply) => {
    const data = await service.getSixMonthEligible();
    return { data };
  });

  fastify.get('/nutrition-stats', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getNutritionStats(year, month);
    return { data };
  });

  fastify.get('/comprehensive', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getComprehensiveStats(year, month);
    return { data };
  });

  // === Nuevos endpoints ===

  fastify.get('/monthly-income-by-method', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getMonthlyIncomeByMethod(year, month);
    return { data };
  });

  fastify.get('/nutrition-conversion-paid', async (request, reply) => {
    const data = await service.getNutritionConversionPaid();
    return { data };
  });

  fastify.get('/alert-clients', async (request, reply) => {
    const data = await service.getAlertClients();
    return { data };
  });

  fastify.get('/nutrition-free-to-conversion', async (request, reply) => {
    const data = await service.getNutritionFreeToConversionClients();
    return { data };
  });

  fastify.get('/nutrition-patients-to-clients', async (request, reply) => {
    const data = await service.getNutritionPatientsToClientsConversion();
    return { data };
  });

  fastify.get('/nutrition-retention-3months', async (request, reply) => {
    const data = await service.getNutritionRetentionByThreeMonths();
    return { data };
  });

  fastify.get('/nutrition-consultation-durations', async (request, reply) => {
    const data = await service.getNutritionConsultationDurations();
    return { data };
  });

  fastify.get('/nutrition-income-real', async (request, reply) => {
    const validation = schema.monthYearSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: validation.error.format() });
    }
    const { year, month } = validation.data;
    const data = await service.getNutritionIncomeReal(year, month);
    return { data };
  });
}

module.exports = statisticsRoutes;
