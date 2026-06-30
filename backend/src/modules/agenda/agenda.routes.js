const { createError } = require('../../lib/appError');
const svc = require('./agenda.service');
const { createSchema } = require('./agenda.schema');

module.exports = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    const { start_at, end_at, patient_id, search } = request.query;
    const filters = {};
    if (start_at) filters.start_at = start_at;
    if (end_at) filters.end_at = end_at;
    if (patient_id) filters.patient_id = patient_id;
    if (search) filters.search = search;
    const rows = await svc.list(filters);
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    const ev = await svc.getById(request.params.id);
    return ev;
  });

  fastify.post('/', async (request, reply) => {
    try {
      const parsed = createSchema.parse(request.body);
      const created = await svc.create({ ...parsed, created_by: request.user?.id || null });
      return created;
    } catch (err) {
      if (err.name === 'ZodError') {
        console.error('Zod Validation Error:', err.errors);
        const issues = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw createError(400, `Payload inválido: ${issues}`);
      }
      throw err;
    }
  });

  fastify.put('/:id', async (request, reply) => {
    const updated = await svc.update(request.params.id, request.body);
    return updated;
  });

  fastify.delete('/:id', async (request, reply) => {
    await svc.remove(request.params.id);
    return { success: true };
  });
};
