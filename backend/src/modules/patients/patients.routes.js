const service = require('./patients.service');
const schema = require('./patients.schema');
const { requireAuth } = require('../../middleware/auth.middleware');

/**
 * Rutas del módulo de Pacientes (consultorio)
 */
async function patientRoutes(fastify, options) {
  // Hook de autenticación JWT estricto
  fastify.addHook('onRequest', requireAuth);

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

  fastify.post('/:id/enroll-gym', async (request, reply) => {
    const { id } = request.params;
    const registeredBy = request.user?.id || null;
    const result = await service.enrollPatientToGym(id, request.body, registeredBy);
    return reply.status(200).send({ data: result });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    await service.remove(id);
    return { success: true, message: 'Paciente eliminado correctamente' };
  });
}

module.exports = patientRoutes;
