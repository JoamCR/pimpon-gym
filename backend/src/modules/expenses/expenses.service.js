const repository = require('./expenses.repository');
const { createError } = require('../../lib/appError');

/**
 * Crea un nuevo egreso.
 */
const createExpense = async (data, userId) => {
  return repository.create(data, userId);
};

/**
 * Obtiene la lista de egresos con filtro de fechas opcional.
 */
const getExpenses = async (from, to) => {
  return repository.findAll(from, to);
};

/**
 * Obtiene un egreso por su ID.
 */
const getExpenseById = async (id) => {
  const expense = await repository.findById(id);
  if (!expense) {
    throw createError(404, 'Egreso no encontrado.');
  }
  return expense;
};

/**
 * Actualiza un egreso existente.
 */
const updateExpense = async (id, data, userId) => {
  const updated = await repository.update(id, data, userId);
  if (!updated) {
    throw createError(404, 'Egreso no encontrado para actualizar.');
  }
  return updated;
};

/**
 * Elimina un egreso permanentemente.
 */
const deleteExpense = async (id, userId) => {
  const deleted = await repository.remove(id, userId);
  if (!deleted) {
    throw createError(404, 'Egreso no encontrado para eliminar.');
  }
  return deleted;
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
