const repository = require('./statistics.repository');
const { createError } = require('../../lib/appError');

/**
 * Servicio de Estadísticas
 * REGLA: Lógica de negocio ÚNICAMENTE.
 */

const getDashboardStats = async (year, month) => {
  try {
    // Current year and month fallback
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);

    const [
      monthlyIncome,
      activeClients,
      clientsByPlan,
      enrollments,
      consistentClients
    ] = await Promise.all([
      repository.getMonthlyIncome(y),
      repository.getActiveClientsReal(),
      repository.getClientsByPlan(),
      repository.getEnrollmentCutoff(m, y),
      repository.getConsistentClients(6) // 6 meses es el incentivo default
    ]);

    // Filtrar los ingresos para el mes actual y sumar el total
    const currentMonthIncomeList = monthlyIncome.filter(inc => parseInt(inc.month) === parseInt(m));
    const currentMonthIncome = currentMonthIncomeList.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
    const totalEnrollments = enrollments.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    return {
      kpis: {
        currentMonthIncome,
        activeClients: parseInt(activeClients) || 0,
        newEnrollments: enrollments.length,
        eligibleIncentives: consistentClients.length
      },
      charts: {
        monthlyIncome,
        clientsByPlan
      }
    };
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener las estadísticas del dashboard');
  }
};

const getExpiredClients = async () => {
  try {
    return await repository.getExpiredClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes vencidos');
  }
};

const getEnrollments = async (month, year) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getEnrollmentCutoff(m, y);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener inscripciones');
  }
};

const getClientsWithoutAttendance = async (month, year) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getClientsWithoutAttendance(m, y);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener inasistencias');
  }
};

const getConsistentClients = async (minMonths) => {
  try {
    return await repository.getConsistentClients(minMonths);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes consistentes');
  }
};

const getCashCutoffHistory = async (from, to) => {
  try {
    if (!from || !to) {
      throw createError(400, 'Se requieren fechas "from" y "to"');
    }
    return await repository.getCashCutoffHistory(from, to);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener cortes de caja');
  }
};

module.exports = {
  getDashboardStats,
  getExpiredClients,
  getEnrollments,
  getClientsWithoutAttendance,
  getConsistentClients,
  getCashCutoffHistory
};
