const service = require('./expenses.service');
const schema = require('./expenses.schema');

/**
 * Rutas del módulo de Egresos
 */
async function expenseRoutes(fastify, options) {

  // POST /api/expenses -> Crear un nuevo egreso
  fastify.post('/', async (request, reply) => {
    const validation = schema.createExpenseSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos del egreso',
        details: validation.error.format()
      });
    }

    const createdBy = request.user?.id || null;
    const result = await service.createExpense(validation.data, createdBy);
    return reply.status(201).send({ data: result });
  });

  // GET /api/expenses -> Listar egresos con filtros de fecha
  fastify.get('/', async (request, reply) => {
    const { from, to } = request.query;
    const expenses = await service.getExpenses(from, to);
    return { data: expenses };
  });

  // GET /api/expenses/:id -> Obtener un egreso por ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const expense = await service.getExpenseById(id);
    return { data: expense };
  });

  // PUT /api/expenses/:id -> Actualizar un egreso
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const validation = schema.updateExpenseSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación al actualizar el egreso',
        details: validation.error.format()
      });
    }

    const userId = request.user?.id || null;
    const updated = await service.updateExpense(id, validation.data, userId);
    return reply.send({ data: updated });
  });

  // DELETE /api/expenses/:id -> Eliminar un egreso
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.id || null;
    const deleted = await service.deleteExpense(id, userId);
    return reply.send({ message: 'El egreso ha sido eliminado correctamente.', data: deleted });
  });
}

module.exports = expenseRoutes;
