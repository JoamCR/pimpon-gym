const repository = require('./config.repository');
const { createError } = require('../../lib/appError');

const getConfig = async () => {
  try {
    return await repository.getConfig();
  } catch (err) {
    if (err.isOperational) throw err;
    throw createError(500, 'Error al obtener configuración');
  }
};

const updateConfig = async (data) => {
  try {
    // Validaciones de negocio mínimas
    if (data.transferMonthlyLimit !== undefined) {
      const val = Number(data.transferMonthlyLimit);
      if (Number.isNaN(val) || val < 0) throw createError(400, 'transferMonthlyLimit debe ser un número positivo');
      data.transferMonthlyLimit = val;
    }

    return await repository.updateConfig(data);
  } catch (err) {
    if (err.isOperational) throw err;
    throw createError(500, 'Error al actualizar configuración');
  }
};

module.exports = {
  getConfig,
  updateConfig
};
