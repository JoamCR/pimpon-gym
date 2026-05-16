const service = require('./auth.service');
const schema = require('./auth.schema');

async function authRoutes(fastify, options) {
  
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    // Validación estricta Zod
    const validation = schema.loginSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos de ingreso',
        details: validation.error.format()
      });
    }

    const { email, password } = validation.data;
    const result = await service.login(email, password);
    
    return reply.status(200).send({ data: result });
  });
}

module.exports = authRoutes;