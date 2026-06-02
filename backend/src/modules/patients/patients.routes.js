const service = require('./patients.service');
const schema = require('./patients.schema');

/**
 * Rutas del módulo de Pacientes (consultorio)
 */
async function patientRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const filters = {
      status: request.query.status,
      search: request.query.search
    };

    const patients = await service.getAll(filters);
    return { data: patients };
  });

  fastify.get('/validate', async (request, reply) => {
    const { phone, rfc } = request.query;
    if (phone || rfc) {
      const repository = require('./patients.repository');
      const existingPatient = await repository.findByPhoneOrRfc(phone, rfc);
      if (existingPatient) {
        if (existingPatient.phone === phone && phone) {
          return reply.status(400).send({ error: 'Este número de teléfono ya está registrado' });
        }
        if (existingPatient.rfc === rfc && rfc) {
          return reply.status(400).send({ error: 'Este RFC ya está registrado' });
        }
      }
    }
    return { valid: true };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const patient = await service.getById(id);
    return { data: patient };
  });

  fastify.post('/', async (request, reply) => {
    const validation = schema.createPatientSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos del paciente',
        details: validation.error.format()
      });
    }

    const registeredBy = request.user?.id || null;
    const result = await service.create(validation.data, registeredBy);
    return reply.status(201).send({ data: result });
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const validation = schema.updatePatientSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación al actualizar paciente',
        details: validation.error.format()
      });
    }

    const updated = await service.update(id, validation.data);
    return { data: updated };
  });
}

module.exports = patientRoutes;
