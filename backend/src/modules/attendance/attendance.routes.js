const service = require('./attendance.service');
const schema = require('./attendance.schema');

async function attendanceRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const attendance = await service.getAll();
    return { data: attendance };
  });

  fastify.get('/today', async (request, reply) => {
    const attendance = await service.getTodayAttendance();
    return { data: attendance };
  });

  fastify.get('/client/:clientId', async (request, reply) => {
    const { clientId } = request.params;
    const attendance = await service.getByClient(clientId);
    return { data: attendance };
  });

  fastify.post('/checkin', async (request, reply) => {
    const validation = schema.createAttendanceSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en el registro de asistencia',
        details: validation.error.format()
      });
    }

    const registeredBy = request.user?.id || null;
    const record = await service.createAttendance(validation.data, registeredBy);
    return reply.status(201).send({ data: record });
  });

  fastify.put('/:id/checkout', async (request, reply) => {
    const { id } = request.params;
    const validation = schema.checkoutAttendanceSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación al cerrar la asistencia',
        details: validation.error.format()
      });
    }

    const updated = await service.checkoutAttendance(id, validation.data.checked_out_at);
    return { data: updated };
  });
}

module.exports = attendanceRoutes;
