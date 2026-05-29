const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * 1. getMonthlyIncome(year): ingresos por mes agrupados por método de pago
 */
const getMonthlyIncome = async (year) => {
  const sql = `
    SELECT 
      EXTRACT(MONTH FROM paid_at) as month, 
      payment_method, 
      SUM(amount) as total 
    FROM payments 
    WHERE EXTRACT(YEAR FROM paid_at) = $1 
      AND is_voided = false 
    GROUP BY month, payment_method
    ORDER BY month ASC
  `;
  try {
    const result = await pool.query(sql, [year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo ingresos mensuales');
  }
};

/**
 * 2. getActiveClientsReal(): clientes con subscription activa HOY (no histórico)
 */
const getActiveClientsReal = async () => {
  const sql = `
    SELECT COUNT(DISTINCT c.id) as active_count
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql);
    return result.rows[0].active_count;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes activos');
  }
};

/**
 * 3. getClientsByPlan(): distribución de clientes por plan, con conteo
 */
const getClientsByPlan = async () => {
  const sql = `
    SELECT 
      p.id, 
      p.name, 
      COUNT(DISTINCT c.id) as client_count
    FROM plans p
    LEFT JOIN clients c ON c.plan_id = p.id 
    LEFT JOIN subscriptions s ON c.id = s.client_id 
      AND s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
    GROUP BY p.id, p.name
    ORDER BY client_count DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes por plan');
  }
};

/**
 * 4. getAgeDistribution(): distribución de clientes activos por rango de edad
 */
const getAgeDistribution = async () => {
  const sql = `
    SELECT age_range, count
    FROM (
      SELECT
        CASE
          WHEN age IS NULL THEN 'Sin edad'
          WHEN age < 18 THEN '<18'
          WHEN age BETWEEN 18 AND 24 THEN '18-24'
          WHEN age BETWEEN 25 AND 34 THEN '25-34'
          WHEN age BETWEEN 35 AND 44 THEN '35-44'
          WHEN age BETWEEN 45 AND 54 THEN '45-54'
          ELSE '55+' END AS age_range,
        COUNT(*) as count
      FROM clients
      WHERE is_active = true
      GROUP BY 1
    ) AS age_sub
    ORDER BY
      CASE age_range
        WHEN 'Sin edad' THEN 1
        WHEN '<18' THEN 2
        WHEN '18-24' THEN 3
        WHEN '25-34' THEN 4
        WHEN '35-44' THEN 5
        WHEN '45-54' THEN 6
        ELSE 7 END
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo distribución por edad');
  }
};

/**
 * 5. getSexDistribution(): distribución de clientes por sexo derivada de client_type cuando esté disponible
 */
const getSexDistribution = async () => {
  const sql = `
    SELECT 
      CASE
        WHEN LOWER(client_type) IN ('male','m','hombre','h') THEN 'Hombre'
        WHEN LOWER(client_type) IN ('female','f','mujer','f') THEN 'Mujer'
        ELSE 'Otro / No especificado'
      END as sex,
      COUNT(*) as count
    FROM clients
    WHERE is_active = true
    GROUP BY sex
    ORDER BY count DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo distribución por sexo');
  }
};

/**
 * 6. getExpiredClients(): lista de clientes con suscripción vencida sin renovar
 */
const getExpiredClients = async () => {
  const sql = `
    WITH LastSubs AS (
      SELECT client_id, MAX(end_date) as last_end_date
      FROM subscriptions
      GROUP BY client_id
    )
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name, ls.last_end_date
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN LastSubs ls ON c.id = ls.client_id
    WHERE ls.last_end_date < CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes con suscripción vencida');
  }
};

/**
 * 5. getEnrollmentCutoff(month, year): inscripciones anuales del mes dado
 */
const getEnrollmentCutoff = async (month, year) => {
  const sql = `
    SELECT 
      p.id, p.amount, p.paid_at, c.first_name, c.last_name
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    WHERE p.payment_type = 'enrollment' 
      AND EXTRACT(MONTH FROM p.paid_at) = $1
      AND EXTRACT(YEAR FROM p.paid_at) = $2
      AND p.is_voided = false
  `;
  try {
    const result = await pool.query(sql, [month, year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo inscripciones del mes');
  }
};

/**
 * 6. getClientsWithoutAttendance(month, year): clientes con inscripción activa
 *    que no tienen ningún registro en attendance en el mes dado
 */
const getClientsWithoutAttendance = async (month, year) => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name,
      (SELECT MAX(checked_in_at) FROM attendance a2 WHERE a2.client_id = c.id) as last_attendance
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 
        FROM attendance a 
        WHERE a.client_id = c.id 
          AND EXTRACT(MONTH FROM a.checked_in_at) = $1
          AND EXTRACT(YEAR FROM a.checked_in_at) = $2
      )
  `;
  try {
    const result = await pool.query(sql, [month, year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo inasistencias');
  }
};

/**
 * 7. getConsistentClients(minMonths): clientes con consecutive_months >= minMonths
 */
const getConsistentClients = async (minMonths) => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.consecutive_months, p.name as plan_name
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE c.consecutive_months >= $1
      AND s.status = 'active'
      AND s.end_date >= CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql, [minMonths]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes consistentes');
  }
};

/**
 * 8. getCashCutoffHistory(from, to): cortes de caja agrupados por fecha
 */
const getCashCutoffHistory = async (fromDate, toDate) => {
  const sql = `
    SELECT 
      paid_at::date as cutoff_date, 
      payment_method, 
      SUM(amount) as total,
      COUNT(id) as transaction_count
    FROM payments 
    WHERE paid_at >= $1::timestamp 
      AND paid_at < ($2::timestamp + interval '1 day')
      AND is_voided = false 
    GROUP BY cutoff_date, payment_method
    ORDER BY cutoff_date DESC
  `;
  try {
    const result = await pool.query(sql, [fromDate, toDate]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo historial de cortes de caja');
  }
};

/**
 * 9. getRetentionRate(): tasa de retención (clientes con 6+ meses consecutivos respecto al total)
 */
const getRetentionRate = async () => {
  const sql = `
    SELECT 
      COUNT(DISTINCT CASE WHEN c.consecutive_months >= 6 THEN c.id END) as retained_clients,
      COUNT(DISTINCT c.id) as total_clients,
      ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN c.consecutive_months >= 6 THEN c.id END) / 
        NULLIF(COUNT(DISTINCT c.id), 0), 2
      ) as retention_percentage
    FROM clients c
    WHERE c.is_active = true
  `;
  try {
    const result = await pool.query(sql);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo tasa de retención');
  }
};

/**
 * 10. getAttendanceHeatmap(year, month): asistencias por día de la semana y hora
 */
const getAttendanceHeatmap = async (year, month) => {
  const sql = `
    SELECT 
      TO_CHAR(checked_in_at, 'Day') as day_name,
      EXTRACT(DOW FROM checked_in_at)::INT as day_number,
      EXTRACT(HOUR FROM checked_in_at)::INT as hour,
      COUNT(*) as attendance_count
    FROM attendance
    WHERE EXTRACT(YEAR FROM checked_in_at) = $1
      AND EXTRACT(MONTH FROM checked_in_at) = $2
    GROUP BY day_name, day_number, hour
    ORDER BY day_number, hour
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo mapa de calor de asistencia');
  }
};

/**
 * 11. getDailyAttendance(year, month): asistencias por día (visitantes)
 */
const getDailyAttendance = async (year, month) => {
  const sql = `
    SELECT 
      checked_in_at::date as date,
      COUNT(*) as daily_count,
      COUNT(DISTINCT client_id) as unique_clients
    FROM attendance
    WHERE EXTRACT(YEAR FROM checked_in_at) = $1
      AND EXTRACT(MONTH FROM checked_in_at) = $2
    GROUP BY date
    ORDER BY date ASC
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo asistencia diaria');
  }
};

/**
 * 12. getGhostClients(): clientes pagados pero sin asistencia en 15+ días
 */
const getGhostClients = async () => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name,
      (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id) as last_attendance,
      EXTRACT(DAY FROM (NOW() - (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id)))::INT as days_without_attendance
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
      AND (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id) < (NOW() - INTERVAL '15 days')
    ORDER BY days_without_attendance DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes inactivos');
  }
};

/**
 * 13. getPaymentMethodsDistribution(year, month): % efectivo vs transferencia
 */
const getPaymentMethodsDistribution = async (year, month) => {
  const sql = `
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as transaction_count,
      ROUND(100.0 * SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0), 2) as percentage
    FROM payments
    WHERE EXTRACT(YEAR FROM paid_at) = $1
      AND EXTRACT(MONTH FROM paid_at) = $2
      AND is_voided = false
    GROUP BY payment_method
    ORDER BY total DESC
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo distribución de métodos de pago');
  }
};

/**
 * 14. getAverageTicketPerClient(): ticket promedio (ingresos / clientes activos)
 */
const getAverageTicketPerClient = async (year, month) => {
  const sql = `
    SELECT 
      ROUND(SUM(amount) / NULLIF(COUNT(DISTINCT client_id), 0), 2) as avg_ticket,
      SUM(amount) as total_income,
      COUNT(DISTINCT client_id) as unique_payers,
      COUNT(*) as total_transactions
    FROM payments
    WHERE EXTRACT(YEAR FROM paid_at) = $1
      AND EXTRACT(MONTH FROM paid_at) = $2
      AND is_voided = false
      AND entity_type = 'gym'
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo ticket promedio');
  }
};

/**
 * 15. getRecurringVsNewIncome(year, month): ingresos recurrentes vs nuevos
 */
const getRecurringVsNewIncome = async (year, month) => {
  const sql = `
    WITH monthly_payments AS (
      SELECT 
        p.client_id,
        SUM(CASE WHEN p.payment_type = 'monthly' THEN p.amount ELSE 0 END) as monthly_total,
        SUM(CASE WHEN p.payment_type = 'enrollment' THEN p.amount ELSE 0 END) as enrollment_total,
        SUM(CASE WHEN p.payment_type IN ('monthly', 'enrollment') THEN p.amount ELSE 0 END) as total_income
      FROM payments p
      WHERE EXTRACT(YEAR FROM p.paid_at) = $1
        AND EXTRACT(MONTH FROM p.paid_at) = $2
        AND p.is_voided = false
      GROUP BY p.client_id
    )
    SELECT 
      ROUND(SUM(monthly_total), 2) as recurring_income,
      ROUND(SUM(enrollment_total), 2) as new_income,
      ROUND(SUM(total_income), 2) as total_income,
      ROUND(100.0 * SUM(monthly_total) / NULLIF(SUM(total_income), 0), 2) as recurring_percentage
    FROM monthly_payments
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo ingresos recurrentes vs nuevos');
  }
};

/**
 * 16. getProjectedDebt(daysOut): dinero en riesgo (clientes venciendo en X días)
 */
const getProjectedDebt = async (daysOut) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT c.id) as clients_expiring,
      ROUND(SUM(p.price_monthly), 2) as projected_debt,
      s.end_date as expiry_date
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active'
      AND s.end_date > CURRENT_DATE
      AND s.end_date <= (CURRENT_DATE + INTERVAL '1 day' * $1)
    GROUP BY s.end_date
    ORDER BY s.end_date ASC
  `;
  try {
    const result = await pool.query(sql, [daysOut]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo deuda proyectada');
  }
};

/**
 * 17. getNutritionConversionRate(): % de clientes gym con consulta de nutrición
 */
const getNutritionConversionRate = async () => {
  const sql = `
    SELECT 
      COUNT(DISTINCT c.id) as total_gym_clients,
      COUNT(DISTINCT CASE WHEN nr.id IS NOT NULL THEN c.id END) as with_nutrition,
      ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN nr.id IS NOT NULL THEN c.id END) / 
        NULLIF(COUNT(DISTINCT c.id), 0), 2
      ) as conversion_rate
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    LEFT JOIN nutrition_records nr ON c.id = nr.client_id AND nr.entity_type = 'gym'
    WHERE s.status = 'active' AND s.end_date >= CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo tasa de conversión a nutrición');
  }
};

/**
 * 18. getSixMonthEligible(): clientes con 6+ meses pagados que pueden ser incentivados
 */
const getSixMonthEligible = async () => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.consecutive_months, p.name as plan_name,
      p.price_monthly * 12 as annual_price,
      ROUND(p.price_monthly * 0.85, 2) as price_with_discount
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE c.consecutive_months >= 6
      AND s.status = 'active'
      AND s.end_date >= CURRENT_DATE
    ORDER BY c.consecutive_months DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes elegibles para anualidad');
  }
};

/**
 * 19. getNutritionStats(): estadísticas del consultorio de nutriología
 */
const getNutritionStats = async (year, month) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT p.id) as total_patients,
      COUNT(DISTINCT CASE WHEN nr.is_free_consult = true THEN nr.id END) as free_consults,
      COUNT(DISTINCT CASE WHEN nr.is_free_consult = false THEN nr.id END) as paid_consults,
      ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN nr.is_free_consult = false THEN nr.id END) / 
        NULLIF(COUNT(DISTINCT CASE WHEN nr.is_free_consult = true THEN nr.id END), 0), 2
      ) as free_to_paid_conversion
    FROM patients p
    LEFT JOIN nutrition_records nr ON p.id = nr.patient_id 
      AND nr.entity_type = 'consultorio'
      AND EXTRACT(YEAR FROM nr.created_at) = $1
      AND EXTRACT(MONTH FROM nr.created_at) = $2
    WHERE p.is_active = true
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo estadísticas de nutriología');
  }
};

/**
 * getNutritionRetention(): pacientes de consultorio con consultas en meses consecutivos
 */
const getNutritionRetention = async () => {
  const sql = `
    WITH patient_months AS (
      SELECT patient_id, date_trunc('month', evaluation_date)::date AS month
      FROM nutrition_records
      WHERE entity_type = 'consultorio'
        AND patient_id IS NOT NULL
      GROUP BY patient_id, date_trunc('month', evaluation_date)
    ),
    numbered AS (
      SELECT
        patient_id,
        month,
        ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY month) AS rn
      FROM patient_months
    ),
    grouped AS (
      SELECT
        patient_id,
        month,
        rn,
        month - ((rn - 1) * interval '1 month') AS grp
      FROM numbered
    )
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      COUNT(*) AS consecutive_months,
      MIN(month) AS start_month,
      MAX(month) AS end_month
    FROM grouped g
    JOIN patients p ON p.id = g.patient_id
    GROUP BY p.id, p.first_name, p.last_name
    HAVING COUNT(*) >= 2
    ORDER BY consecutive_months DESC, p.last_name ASC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo retención de consultorio');
  }
};

/**
 * 20. getMonthlyIncomeByMethod(year, month): ingresos totales del mes desglosado por método de pago
 */
const getMonthlyIncomeByMethod = async (year, month) => {
  const sql = `
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as transaction_count
    FROM payments
    WHERE EXTRACT(YEAR FROM paid_at) = $1
      AND EXTRACT(MONTH FROM paid_at) = $2
      AND is_voided = false
    GROUP BY payment_method
    ORDER BY total DESC
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    return {
      payment_breakdown: result.rows,
      total: result.rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0)
    };
  } catch (err) {
    throw createError(500, 'Error obteniendo ingresos por método');
  }
};

/**
 * 21. getNutritionConversionPaid(): clientes gym que han pagado por segunda consulta (conversión real)
 */
const getNutritionConversionPaid = async () => {
  const sql = `
    WITH gym_clients AS (
      SELECT DISTINCT c.id, c.first_name, c.last_name
      FROM clients c
      JOIN subscriptions s ON c.id = s.client_id
      WHERE s.status = 'active' AND s.end_date >= CURRENT_DATE
    )
    SELECT 
      COUNT(DISTINCT gc.id) as total_gym_clients,
      COUNT(DISTINCT CASE WHEN nr.id IS NOT NULL AND nr.is_free_consult = false THEN gc.id END) as with_paid_nutrition,
      ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN nr.id IS NOT NULL AND nr.is_free_consult = false THEN gc.id END) / 
        NULLIF(COUNT(DISTINCT gc.id), 0), 2
      ) as conversion_rate
    FROM gym_clients gc
    LEFT JOIN nutrition_records nr ON gc.id = nr.client_id 
      AND nr.entity_type = 'gym'
      AND nr.is_free_consult = false
  `;
  try {
    const result = await pool.query(sql);
    return result.rows[0];
  } catch (err) {
    throw createError(500, 'Error obteniendo conversión a nutrición pagada');
  }
};

/**
 * 22. getAbsentClients(): clientes en riesgo (con anualidad pero sin renovación de plan mensual)
 */
const getAbsentClients = async () => {
  const sql = `
    SELECT 
      c.id,
      c.first_name,
      c.last_name,
      c.phone,
      p.name as plan_name,
      s.start_date,
      s.end_date,
      (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id) as last_attendance,
      EXTRACT(DAY FROM (NOW() - COALESCE((SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id), NOW())))::INT as days_without_attendance
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active'
      AND s.end_date >= CURRENT_DATE
      AND EXISTS (
        SELECT 1
        FROM payments pay
        WHERE pay.client_id = c.id
          AND pay.payment_type = 'enrollment'
          AND pay.is_voided = false
          AND pay.paid_at >= (CURRENT_DATE - INTERVAL '12 months')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM payments pay
        WHERE pay.client_id = c.id
          AND pay.payment_type = 'monthly'
          AND pay.is_voided = false
          AND EXTRACT(YEAR FROM pay.paid_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM pay.paid_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      )
    ORDER BY days_without_attendance DESC NULLS LAST
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes ausentes');
  }
};

/**
 * 23. getAlertClients(): clientes que están pagados pero sin asistencia en 15 días (en alerta)
 */
const getAlertClients = async () => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name,
      (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id) as last_attendance,
      EXTRACT(DAY FROM (NOW() - (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id)))::INT as days_without_attendance
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
      AND (SELECT MAX(checked_in_at) FROM attendance WHERE client_id = c.id) < (NOW() - INTERVAL '15 days')
    ORDER BY days_without_attendance DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes en alerta');
  }
};

/**
 * 24. getNutritionFreeToConversionClients(): clientes gym que iniciaron con consulta gratuita y ahora pagan
 */
const getNutritionFreeToConversionClients = async () => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone,
      COUNT(CASE WHEN nr.is_free_consult = true THEN 1 END) as free_consults,
      COUNT(CASE WHEN nr.is_free_consult = false THEN 1 END) as paid_consults
    FROM clients c
    LEFT JOIN nutrition_records nr ON c.id = nr.client_id 
      AND nr.entity_type = 'gym'
    WHERE (
      SELECT COUNT(*) FROM nutrition_records WHERE client_id = c.id AND entity_type = 'gym' AND is_free_consult = true
    ) > 0
    AND (
      SELECT COUNT(*) FROM nutrition_records WHERE client_id = c.id AND entity_type = 'gym' AND is_free_consult = false
    ) > 0
    GROUP BY c.id, c.first_name, c.last_name, c.phone
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes con conversión gratuita a pago');
  }
};

/**
 * 25. getNutritionPatientsToClientsConversion(): pacientes que se convirtieron en clientes del gimnasio
 */
const getNutritionPatientsToClientsConversion = async () => {
  const sql = `
    SELECT 
      p.id, p.first_name, p.last_name, p.phone,
      c.id as client_id,
      COUNT(nr.id) as total_consultations
    FROM patients p
    LEFT JOIN clients c ON LOWER(CONCAT(p.first_name, ' ', p.last_name)) = LOWER(CONCAT(c.first_name, ' ', c.last_name)) 
      OR p.phone = c.phone
    LEFT JOIN nutrition_records nr ON p.id = nr.patient_id
    WHERE c.id IS NOT NULL
    GROUP BY p.id, p.first_name, p.last_name, p.phone, c.id
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo pacientes convertidos a clientes');
  }
};

/**
 * 26. getNutritionRetentionByThreeMonths(): pacientes con 3+ consultas (retención)
 */
const getNutritionRetentionByThreeMonths = async () => {
  const sql = `
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      COUNT(DISTINCT DATE_TRUNC('month', evaluation_date)) AS months_active,
      COUNT(*) AS total_consultations,
      MIN(evaluation_date) AS first_consultation,
      MAX(evaluation_date) AS last_consultation
    FROM patients p
    LEFT JOIN nutrition_records nr ON p.id = nr.patient_id 
      AND nr.entity_type = 'consultorio'
    WHERE p.is_active = true
    GROUP BY p.id, p.first_name, p.last_name
    HAVING COUNT(*) >= 3
    ORDER BY total_consultations DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo retención de pacientes (3+)');
  }
};

/**
 * 27. getNutritionConsultationDurations(): conteo de pacientes por duración de consultas (1, 2, 3+ meses)
 */
const getNutritionConsultationDurations = async () => {
  const sql = `
    WITH patient_duration AS (
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        COUNT(*) as total_consultations,
        COUNT(DISTINCT DATE_TRUNC('month', nr.evaluation_date)) as months_consulting
      FROM patients p
      LEFT JOIN nutrition_records nr ON p.id = nr.patient_id 
        AND nr.entity_type = 'consultorio'
      WHERE p.is_active = true
      GROUP BY p.id, p.first_name, p.last_name
    )
    SELECT
      SUM(CASE WHEN months_consulting >= 1 AND total_consultations > 0 THEN 1 ELSE 0 END) as one_month_plus,
      SUM(CASE WHEN months_consulting >= 2 THEN 1 ELSE 0 END) as two_months_plus,
      SUM(CASE WHEN months_consulting >= 3 THEN 1 ELSE 0 END) as three_months_plus,
      (SELECT COUNT(DISTINCT id) FROM patients WHERE is_active = true) as total_patients
    FROM patient_duration
  `;
  try {
    const result = await pool.query(sql);
    const row = result.rows[0];
    return {
      consulted_at_least_once: row.one_month_plus,
      one_month_active: row.one_month_plus,
      two_months_active: row.two_months_plus,
      three_months_active: row.three_months_plus,
      total_patients: row.total_patients
    };
  } catch (err) {
    throw createError(500, 'Error obteniendo duraciones de consultas');
  }
};

/**
 * 28. getNutritionIncomeReal(year, month): ingresos reales de las consultas del consultorio
 */
const getNutritionIncomeReal = async (year, month) => {
  const sql = `
    SELECT
      payment_method,
      SUM(amount) as total,
      COUNT(*) as transaction_count,
      ROUND(100.0 * SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0), 2) as percentage
    FROM payments
    WHERE EXTRACT(YEAR FROM paid_at) = $1
      AND EXTRACT(MONTH FROM paid_at) = $2
      AND is_voided = false
      AND entity_type = 'consultorio'
    GROUP BY payment_method
    ORDER BY total DESC
  `;
  try {
    const result = await pool.query(sql, [year, month]);
    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);
    return {
      by_method: result.rows,
      total: total
    };
  } catch (err) {
    throw createError(500, 'Error obteniendo ingresos del consultorio');
  }
};

module.exports = {
  getMonthlyIncome,
  getActiveClientsReal,
  getClientsByPlan,
  getAgeDistribution,
  getSexDistribution,
  getExpiredClients,
  getEnrollmentCutoff,
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
  getNutritionRetention,
  getMonthlyIncomeByMethod,
  getNutritionConversionPaid,
  getAbsentClients,
  getAlertClients,
  getNutritionFreeToConversionClients,
  getNutritionPatientsToClientsConversion,
  getNutritionRetentionByThreeMonths,
  getNutritionConsultationDurations,
  getNutritionIncomeReal
};
