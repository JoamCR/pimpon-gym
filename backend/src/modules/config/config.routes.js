const service = require('./config.service');
const schema = require('./config.schema');

async function configRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const config = await service.getConfig();
    return { data: config };
  });

  fastify.put('/', async (request, reply) => {
    const validation = schema.updateConfigSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en la configuración',
        details: validation.error.format()
      });
    }

    const updated = await service.updateConfig(validation.data);
    return { data: updated };
  });
}

module.exports = configRoutes;
