const repository = require('./subscriptions.repository');
const { createError } = require('../../lib/appError');
const { isConfigured } = require('../../lib/database');

/**
 * Servicio de suscripciones
 * REGLA: Lógica de negocio ÚNICAMENTE. Nunca queries SQL aquí.
 */

const DASHBOARD_CACHE_TTL_MS = 5 * 1000;
const STATUS_SYNC_TTL_MS = 5 * 60 * 1000;
let dashboardCache = { timestamp: 0, data: null };
let lastStatusSyncTimestamp = 0;
let inFlightDashboardPromise = null;

const runInBatches = async (taskFns, batchSize = 2) => {
  const results = new Array(taskFns.length);
  for (let i = 0; i < taskFns.length; i += batchSize) {
    const batch = taskFns.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }
  return results;
};

/**
 * Obtiene todos los datos del dashboard en UNA sola llamada optimizada y controlada por lotes
 * para no saturar el límite de conexiones de Supabase (Session Mode pool_size: 15).
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

    if (dashboardCache.data && Date.now() - dashboardCache.timestamp < DASHBOARD_CACHE_TTL_MS) {
      return dashboardCache.data;
    }

    if (inFlightDashboardPromise) {
      return await inFlightDashboardPromise;
    }

    inFlightDashboardPromise = (async () => {
      if (Date.now() - lastStatusSyncTimestamp > STATUS_SYNC_TTL_MS) {
        await repository.syncSubscriptionStatuses();
        lastStatusSyncTimestamp = Date.now();
      }

      // Ejecutar las queries en lotes de 2 para respetar el límite de Supabase Session Mode
      const [
        expiring3Days,
        expiringToday,
        transferControl,
        activeClientsList,
        expiredClients,
        todayAttendanceAll,
        totalClientsCount,
        todayVisitorsCount,
        monthVisitorsCount,
        renewalsThisMonthCount,
        cancellationsThisMonthCount,
        newClientsThisMonthCount,
        activeAnnualList,
        annualExpiring3DaysList,
        annualExpiringTodayList,
        annualExpiredThisMonthList,
        newAnnualThisMonthList,
        annualRenewalsThisMonthList,
        allAnnualExpiredList
      ] = await runInBatches([
        () => repository.findExpiringIn3Days(),
        () => repository.findExpiringToday(),
        () => repository.getTransferControlCurrentMonth(),
        () => repository.findActiveClients(),
        () => repository.findExpiredClients(),
        () => repository.getTodayAttendanceAll(),
        () => repository.countTotalClients(),
        () => repository.countTodayVisitors(),
        () => repository.countMonthVisitors(),
        () => repository.countRenewalsThisMonth(),
        () => repository.countCancellationsThisMonth(),
        () => repository.countNewClientsThisMonth(),
        () => repository.findActiveAnnual(),
        () => repository.findAnnualExpiringIn3Days(),
        () => repository.findAnnualExpiringToday(),
        () => repository.findAnnualExpiredThisMonth(),
        () => repository.findNewAnnualThisMonth(),
        () => repository.findAnnualRenewalsThisMonth(),
        () => repository.findAllAnnualExpired()
      ], 2);

      const safeActiveClientsList = activeClientsList || [];
      const safeTodayAttendanceAll = todayAttendanceAll || [];

      const activeCount = safeActiveClientsList.length;
      const todayAttendanceCount = safeTodayAttendanceAll.length;
      const todayAttendanceRecent = safeTodayAttendanceAll.slice(0, 4);

      // Calcular porcentaje de transferencias
      const transferPercentage = transferControl.monthly_limit > 0
        ? Math.round((transferControl.total_received / transferControl.monthly_limit) * 100)
        : 0;

      const payload = {
        expiring3Days: expiring3Days || [],
        expiringToday: expiringToday || [],
        expiredClients: expiredClients || [],
        transferControl: {
          used: transferControl.total_received || 0,
          limit: transferControl.monthly_limit || parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
          remaining: Math.max(0, (transferControl.monthly_limit || parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000)) - (transferControl.total_received || 0)),
          percentage: transferPercentage
        },
        activeCount,
        activeClientsList: safeActiveClientsList,
        todayAttendance: {
          total: todayAttendanceCount,
          recent: todayAttendanceRecent,
          all: safeTodayAttendanceAll
        },
        totalClients: totalClientsCount ? totalClientsCount.length : 0,
        totalClientsList: totalClientsCount || [],
        todayVisitors: todayVisitorsCount ? todayVisitorsCount.length : 0,
        todayVisitorsList: todayVisitorsCount || [],
        monthVisitorsCount: monthVisitorsCount ? monthVisitorsCount.length : 0,
        monthVisitorsList: monthVisitorsCount || [],
        renewalsThisMonth: renewalsThisMonthCount ? renewalsThisMonthCount.length : 0,
        renewalsThisMonthList: renewalsThisMonthCount || [],
        cancellationsThisMonth: cancellationsThisMonthCount ? cancellationsThisMonthCount.length : 0,
        cancellationsThisMonthList: cancellationsThisMonthCount || [],
        newClientsThisMonth: newClientsThisMonthCount ? newClientsThisMonthCount.length : 0,
        newClientsThisMonthList: newClientsThisMonthCount || [],

        // Anualidades
        activeAnnualCount: activeAnnualList ? activeAnnualList.length : 0,
        activeAnnualList: activeAnnualList || [],
        annualExpiring3DaysCount: annualExpiring3DaysList ? annualExpiring3DaysList.length : 0,
        annualExpiring3DaysList: annualExpiring3DaysList || [],
        annualExpiringTodayCount: annualExpiringTodayList ? annualExpiringTodayList.length : 0,
        annualExpiringTodayList: annualExpiringTodayList || [],
        annualExpiredThisMonthCount: annualExpiredThisMonthList ? annualExpiredThisMonthList.length : 0,
        annualExpiredThisMonthList: annualExpiredThisMonthList || [],
        newAnnualThisMonthCount: newAnnualThisMonthList ? newAnnualThisMonthList.length : 0,
        newAnnualThisMonthList: newAnnualThisMonthList || [],
        annualRenewalsThisMonthCount: annualRenewalsThisMonthList ? annualRenewalsThisMonthList.length : 0,
        annualRenewalsThisMonthList: annualRenewalsThisMonthList || [],
        allAnnualExpiredCount: allAnnualExpiredList ? allAnnualExpiredList.length : 0,
        allAnnualExpiredList: allAnnualExpiredList || [],

        // Retrocompatibilidad
        annualCancellationsCount: annualExpiredThisMonthList ? annualExpiredThisMonthList.length : 0,
        annualCancellationsList: annualExpiredThisMonthList || [],
        annualExpiringCount: annualExpiring3DaysList ? annualExpiring3DaysList.length : 0,
        annualExpiringList: annualExpiring3DaysList || []
      };

      dashboardCache = { timestamp: Date.now(), data: payload };
      return payload;
    })();

    try {
      return await inFlightDashboardPromise;
    } finally {
      inFlightDashboardPromise = null;
    }
  } catch (error) {
    console.error('Error en getDashboardData:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener datos del dashboard');
  }
};

module.exports = {
  getDashboardData,
};
