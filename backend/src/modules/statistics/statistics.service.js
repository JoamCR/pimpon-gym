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

const getRetentionRate = async () => {
  try {
    return await repository.getRetentionRate();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener tasa de retención');
  }
};

const getAttendanceHeatmap = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getAttendanceHeatmap(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener mapa de asistencia');
  }
};

const getDailyAttendance = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getDailyAttendance(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener asistencia diaria');
  }
};

const getGhostClients = async () => {
  try {
    return await repository.getGhostClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes fantasma');
  }
};

const getPaymentMethodsDistribution = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getPaymentMethodsDistribution(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener distribución de pagos');
  }
};

const getAverageTicketPerClient = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getAverageTicketPerClient(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener ticket promedio');
  }
};

const getRecurringVsNewIncome = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getRecurringVsNewIncome(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener ingresos');
  }
};

const getProjectedDebt = async (daysOut) => {
  try {
    const days = daysOut || 30;
    return await repository.getProjectedDebt(days);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener deuda proyectada');
  }
};

const getNutritionConversionRate = async () => {
  try {
    return await repository.getNutritionConversionRate();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener conversión a nutrición');
  }
};

const getSixMonthEligible = async () => {
  try {
    return await repository.getSixMonthEligible();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes elegibles');
  }
};

const getNutritionStats = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getNutritionStats(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener estadísticas de nutriología');
  }
};

const getComprehensiveStats = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);

    const [
      retentionData,
      paymentMethods,
      avgTicket,
      recurringVsNew,
      nutritionConversion,
      sixMonthEligible,
      nutritionStats,
      ageDistribution,
      sexDistribution,
      nutritionRetention,
      dailyAttendance,
      ghostClients,
      clientsByPlan,
      activeClients,
      monthlyIncome
    ] = await Promise.all([
      repository.getRetentionRate(),
      repository.getPaymentMethodsDistribution(y, m),
      repository.getAverageTicketPerClient(y, m),
      repository.getRecurringVsNewIncome(y, m),
      repository.getNutritionConversionRate(),
      repository.getSixMonthEligible(),
      repository.getNutritionStats(y, m),
      repository.getAgeDistribution(),
      repository.getSexDistribution(),
      repository.getNutritionRetention(),
      repository.getDailyAttendance(y, m),
      repository.getGhostClients(),
      repository.getClientsByPlan(),
      repository.getActiveClientsReal(),
      repository.getMonthlyIncome(y)
    ]);

    return {
      kpis: {
        retention: retentionData,
        avgTicket: avgTicket,
        recurringVsNew: recurringVsNew,
        nutritionConversion: nutritionConversion,
        nutritionStats: nutritionStats,
        activeClients: activeClients,
        sixMonthEligible: sixMonthEligible?.length || 0,
        ghostClients: ghostClients?.length || 0
      },
      charts: {
        paymentMethods,
        clientsByPlan,
        dailyAttendance,
        monthlyIncome,
        ageDistribution,
        sexDistribution,
        nutritionRetention
      },
      clients: {
        ghostClients,
        sixMonthEligible
      }
    };
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener estadísticas comprehensivas');
  }
};

// === Nuevas funciones de servicio ===

const getMonthlyIncomeByMethod = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getMonthlyIncomeByMethod(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener ingresos por método');
  }
};

const getRetainedClients = async () => {
  try {
    return await repository.getRetainedClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes retenidos');
  }
};

const getMonthlyIncomeDetails = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getMonthlyIncomeDetails(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener detalles de ingresos');
  }
};

const getNutritionFreeConsults = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getNutritionFreeConsults(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener consultas gratuitas');
  }
};

const getNutritionPaidConsults = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getNutritionPaidConsults(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener consultas pagadas');
  }
};

const getNutritionConversionPaid = async () => {
  try {
    return await repository.getNutritionConversionPaid();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener conversión a nutrición pagada');
  }
};

const getAbsentClients = async () => {
  try {
    return await repository.getAbsentClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes ausentes');
  }
};

const getAlertClients = async () => {
  try {
    return await repository.getAlertClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener clientes en alerta');
  }
};

const getNutritionFreeToConversionClients = async () => {
  try {
    return await repository.getNutritionFreeToConversionClients();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener conversión gratuita a pago');
  }
};

const getNutritionPatientsToClientsConversion = async () => {
  try {
    return await repository.getNutritionPatientsToClientsConversion();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener pacientes convertidos a clientes');
  }
};

const getNutritionRetentionByThreeMonths = async () => {
  try {
    return await repository.getNutritionRetentionByThreeMonths();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener retención de pacientes (3+)');
  }
};

const getNutritionConsultationDurations = async () => {
  try {
    return await repository.getNutritionConsultationDurations();
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener duraciones de consultas');
  }
};

const getNutritionIncomeReal = async (year, month) => {
  try {
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    return await repository.getNutritionIncomeReal(y, m);
  } catch (error) {
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener ingresos del consultorio');
  }
};

module.exports = {
  getDashboardStats,
  getExpiredClients,
  getEnrollments,
  getClientsWithoutAttendance,
  getConsistentClients,
  getCashCutoffHistory,
  getRetentionRate,
  getAttendanceHeatmap,
  getDailyAttendance,
  getGhostClients,
  getPaymentMethodsDistribution,
  getAverageTicketPerClient,
  getRecurringVsNewIncome,
  getProjectedDebt,
  getNutritionConversionRate,
  getSixMonthEligible,
  getNutritionStats,
  getComprehensiveStats,
  getMonthlyIncomeByMethod,
  getRetainedClients,
  getMonthlyIncomeDetails,
  getNutritionFreeConsults,
  getNutritionPaidConsults,
  getNutritionConversionPaid,
  getAbsentClients,
  getAlertClients,
  getNutritionFreeToConversionClients,
  getNutritionPatientsToClientsConversion,
  getNutritionRetentionByThreeMonths,
  getNutritionConsultationDurations,
  getNutritionIncomeReal
};
