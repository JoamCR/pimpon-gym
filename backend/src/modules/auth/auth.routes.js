const service = require('./auth.service');
const schema = require('./auth.schema');

/**
 * Rutas para Autenticación y Configuración Inicial
 */
async function authRoutes(fastify, options) {

  // GET /api/auth/setup-status
  // Verifica si la cuenta de administrador ya ha sido creada.
  fastify.get('/setup-status', async (request, reply) => {
    const status = await service.checkSetupStatus();
    return { isAdminSetup: status };
  });

  // POST /api/auth/setup
  // Crea la primera cuenta de Administrador.
  fastify.post('/setup', async (request, reply) => {
    const validation = schema.setupSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación',
        details: validation.error.format()
      });
    }
    const user = await service.setupAdmin(validation.data.password);
    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    return reply.status(201).send({ 
      message: 'Administrador creado exitosamente', 
      user, 
      token 
    });
  });

  // POST /api/auth/login
  // Inicia sesión para un usuario existente.
  fastify.post('/login', async (request, reply) => {
    const validation = schema.loginSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación',
        details: validation.error.format()
      });
    }
    const { username, password } = validation.data;
    const user = await service.login(username, password);
    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    return { 
      message: 'Inicio de sesión exitoso', 
      user, 
      token };
  });

}

module.exports = authRoutes;