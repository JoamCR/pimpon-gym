const service = require('./users.service');
const schema = require('./users.schema');
const { requireAuth } = require('../../middleware/auth.middleware');

async function usersRoutes(fastify, options) {
  // Aplicar middleware de autenticación a todas las rutas de usuarios
  fastify.addHook('onRequest', requireAuth);

  // GET /api/users - Listar usuarios
  fastify.get('/', async (request, reply) => {
    const users = await service.getAllUsers();
    return { data: users };
  });

  // GET /api/users/:id - Obtener usuario por ID
  fastify.get('/:id', async (request, reply) => {
    const user = await service.getUserById(request.params.id);
    return { data: user };
  });

  // POST /api/users - Crear nuevo usuario
  fastify.post('/', async (request, reply) => {
    const validation = schema.createUserSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación',
        details: validation.error.format()
      });
    }

    const user = await service.createUser(validation.data);
    return reply.status(201).send({
      message: 'Usuario creado exitosamente',
      data: user
    });
  });

  // PUT /api/users/:id - Actualizar usuario
  fastify.put('/:id', async (request, reply) => {
    const validation = schema.updateUserSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación',
        details: validation.error.format()
      });
    }

    const user = await service.updateUser(request.params.id, validation.data);
    return reply.send({
      message: 'Usuario actualizado exitosamente',
      data: user
    });
  });

  // DELETE /api/users/:id - Eliminar usuario
  fastify.delete('/:id', async (request, reply) => {
    const user = await service.deleteUser(request.params.id);
    return reply.send({
      message: 'Usuario eliminado exitosamente',
      data: user
    });
  });
}

module.exports = usersRoutes;
