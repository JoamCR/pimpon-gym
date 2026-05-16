const repository = require('./patients.repository');
const { createError } = require('../../lib/appError');

const getAll = async (filters) => {
  return await repository.findAll(filters);
};

const getById = async (id) => {
  const patient = await repository.findById(id);
  if (!patient) {
    throw createError(404, 'Paciente no encontrado');
  }
  return patient;
};

const create = async (data, registeredBy) => {
  const patientData = { ...data, created_by: registeredBy };
  return await repository.create(patientData);
};

const update = async (id, data) => {
  const exists = await repository.findById(id);
  if (!exists) {
    throw createError(404, 'Paciente no encontrado para actualizar');
  }
  return await repository.update(id, data);
};

module.exports = {
  getAll,
  getById,
  create,
  update
};
