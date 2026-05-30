const service = require('./payments.service');
const schema = require('./payments.schema');

/**
 * Rutas del módulo de Pagos
 */
async function paymentRoutes(fastify, options) {

  // POST /api/payments -> Registrar un nuevo pago
  fastify.post('/', async (request, reply) => {
    const validation = schema.registerPaymentSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos del pago',
        details: validation.error.format()
      });
    }

    const registeredBy = request.user?.id || null;
    const result = await service.registerPayment(validation.data, registeredBy);
    return reply.status(201).send({ data: result });
  });

  // GET /api/payments/client/:id -> Historial de pagos de un cliente
  fastify.get('/client/:id', async (request, reply) => {
    const { id } = request.params;
    const history = await service.getClientHistory(id);
    return { data: history };
  });

  fastify.get('/patient/:id', async (request, reply) => {
    const { id } = request.params;
    const history = await service.getPatientHistory(id);
    return { data: history };
  });

  // GET /api/payments/history -> Historial general de pagos (?entity_type=gym&from=YYYY-MM-DD&to=YYYY-MM-DD)
  fastify.get('/history', async (request, reply) => {
    const { entity_type, from, to } = request.query;
    const history = await service.getPaymentsHistory(entity_type, from, to);
    return { data: history };
  });

  // GET /api/payments/cutoff -> Corte de caja por fechas (?from=YYYY-MM-DD&to=YYYY-MM-DD)
  fastify.get('/cutoff', async (request, reply) => {
    const { from, to } = request.query;
    if (!from || !to) {
      return reply.status(400).send({ error: 'Parámetros from y to son requeridos en la URL' });
    }
    const cutoff = await service.getCutoff(from, to);
    return { data: cutoff };
  });

  // GET /api/payments/transfer-control -> Estado de límite de transferencias del mes actual
  fastify.get('/transfer-control', async (request, reply) => {
    const control = await service.getCurrentTransferControl();
    return { data: control };
  });
}

module.exports = paymentRoutes;
