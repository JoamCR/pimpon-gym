const service = require('./clients.service');
const schema = require('./clients.schema');
const { requireAuth } = require('../../middleware/auth.middleware');

/**
 * Rutas del módulo de Clientes
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 */
async function clientRoutes(fastify, options) {
  
  // Hook de autenticación JWT estricto para todas las rutas de clientes
  fastify.addHook('onRequest', requireAuth);

  // GET /api/clients
  fastify.get('/', async (request, reply) => {
    const filters = {
      status: request.query.status,
      client_type: request.query.client_type || request.query.type,
      search: request.query.search
    };
    
    const clients = await service.getAll(filters);
    return { data: clients };
  });

  // GET /api/clients/validate
  fastify.get('/validate', async (request, reply) => {
    const { phone, rfc, excludeId } = request.query;
    if (phone || rfc) {
      const repository = require('./clients.repository');
      const existingClient = await repository.findByPhoneOrRfc(phone, rfc);
      if (existingClient && existingClient.id !== excludeId) {
        if (existingClient.phone === phone && phone) {
          return reply.status(400).send({ error: 'Este número de teléfono ya está registrado' });
        }
        if (existingClient.rfc === rfc && rfc) {
          return reply.status(400).send({ error: 'Este RFC ya está registrado' });
        }
      }
    }
    return reply.send({ success: true });
  });

  // GET /api/clients/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const client = await service.getById(id);
    return { data: client };
  });

  // GET /api/clients/:id/history
  fastify.get('/:id/history', async (request, reply) => {
    const { id } = request.params;
    const history = await service.getClientHistory(id);
    return { data: history };
  });

  // POST /api/clients
  fastify.post('/', async (request, reply) => {
    const validation = schema.createClientSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos del cliente',
        details: validation.error.format()
      });
    }
    
    const registeredBy = request.user?.id || null;
    const result = await service.create(validation.data, registeredBy);
    return reply.status(201).send({ data: result });
  });

  // PUT /api/clients/:id
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const validation = schema.updateClientSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación al actualizar',
        details: validation.error.format()
      });
    }

    const updated = await service.update(id, validation.data);
    return { data: updated };
  });

  // DELETE /api/clients/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    await service.remove(id);
    return { success: true, message: 'Cliente eliminado correctamente' };
  });

  // GET /api/clients/dashboard/expiring
  fastify.get('/dashboard/expiring', async (request, reply) => {
    const data = await service.getExpiringClients();
    return { data };
  });
}

module.exports = clientRoutes;
