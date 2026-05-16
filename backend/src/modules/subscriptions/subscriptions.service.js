const repository = require('./subscriptions.repository');
const { createError } = require('../../lib/appError');
const { isConfigured } = require('../../lib/database');

/**
 * Servicio de suscripciones
 * REGLA: Lógica de negocio ÚNICAMENTE. Nunca queries SQL aquí.
 */

/**
 * Obtiene todos los datos del dashboard en UNA sola llamada optimizada
 * Retorna:
 * {
 *   expiring3Days: [...clientes con end_date entre hoy+1 y hoy+3, status=active],
 *   expiringToday: [...clientes con end_date = hoy, status=active],
 *   transferControl: { used, limit, remaining, percentage },
 *   activeCount: número de clientes con subscripción activa,
 *   todayAttendance: número de asistencias del día
 * }
 */
const getDashboardData = async () => {
  try {
    // Si no hay base de datos configurada, devolvemos defaults para evitar 500
    if (!isConfigured) {
      return {
        expiring3Days: [],
        expiringToday: [],
        transferControl: {
          used: 0,
          limit: parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
          remaining: parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
          percentage: 0
        },
        activeCount: 0,
        todayAttendance: { total: 0, recent: [] }
      };
    }

    // Ejecutar todas las queries en paralelo para optimizar rendimiento
    const [
      expiring3Days,
      expiringToday,
      transferControl,
      activeCount,
      todayAttendanceCount,
      todayAttendanceRecent,
      activeClientsList,
      expiredClients,
      todayAttendanceAll
    ] = await Promise.all([
      repository.findExpiringIn3Days(),
      repository.findExpiringToday(),
      repository.getTransferControlCurrentMonth(),
      repository.countActiveClients(),
      repository.countTodayAttendance(),
      repository.getTodayAttendanceLastFour(),
      repository.findActiveClients(),
      repository.findExpiredClients(),
      repository.getTodayAttendanceAll()
    ]);

    // Calcular porcentaje de transferencias
    const transferPercentage = transferControl.monthly_limit > 0
      ? Math.round((transferControl.total_received / transferControl.monthly_limit) * 100)
      : 0;

    return {
      expiring3Days: expiring3Days || [],
      expiringToday: expiringToday || [],
      expiredClients: expiredClients || [],
      transferControl: {
        used: transferControl.total_received || 0,
        limit: transferControl.monthly_limit || parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
        remaining: Math.max(0, (transferControl.monthly_limit || parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000)) - (transferControl.total_received || 0)),
        percentage: transferPercentage
      },
      activeCount: activeCount || 0,
      activeClientsList: activeClientsList || [],
      todayAttendance: {
        total: todayAttendanceCount || 0,
        recent: todayAttendanceRecent || [],
        all: todayAttendanceAll || []
      }
    };
  } catch (error) {
    console.error('Error en getDashboardData:', error);
    // Si es un error operativo de nuestro sistema, relanzarlo
    if (error.isOperational) throw error;
    // Si no, convertir a error operativo
    throw createError(500, 'Error al obtener datos del dashboard');
  }
};

module.exports = {
  getDashboardData,
};
