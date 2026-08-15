const cron = require('node-cron');
const { pool } = require('../lib/database');
const { getConfig } = require('../modules/config/config.repository');
const notificationsService = require('../modules/notifications/notifications.service');
const notificationsRepo = require('../modules/notifications/notifications.repository');

/**
 * Motor principal de Automatizaciones de WhatsApp para Pimpon Gym
 * Revisa periódicamente reglas de vencimiento, racha de 6 meses, inactividad de 15 días, recordatorio de citas y cumpleaños.
 */

const runAutomationTasks = async () => {
  console.log('⏰ Executing WhatsApp Automation Engine...');

  try {
    const config = await getConfig();
    const waConfig = config.whatsapp || {};
    
    // Si la automatización global está desactivada, no continuar
    if (waConfig.enabled === false) {
      console.log('ℹ️ WhatsApp Automations are disabled in configuration.');
      return;
    }

    const rules = waConfig.rules || {};

    // 1. CLIENT_EXPIRING_3D_MONTHLY / CLIENT_EXPIRING_3D_ANNUAL
    if (rules.CLIENT_EXPIRING_3D_MONTHLY?.enabled !== false || rules.CLIENT_EXPIRING_3D_ANNUAL?.enabled !== false) {
      await processSubscriptionsExpiringInDays(3, rules);
    }

    // 2. CLIENT_EXPIRED_TODAY_MONTHLY / CLIENT_EXPIRED_TODAY_ANNUAL
    if (rules.CLIENT_EXPIRED_TODAY_MONTHLY?.enabled !== false || rules.CLIENT_EXPIRED_TODAY_ANNUAL?.enabled !== false) {
      await processSubscriptionsExpiringInDays(0, rules);
    }

    // 3. CLIENT_RENEWAL_PROMO (Vencidos hace 7 días)
    if (rules.CLIENT_RENEWAL_PROMO?.enabled !== false) {
      await processExpiredSubscriptionsPromo(7);
    }

    // 4. CLIENT_STREAK_6M (6 meses consecutivos ininterrumpidos)
    if (rules.CLIENT_STREAK_6M?.enabled !== false) {
      await processStreak6Months();
    }

    // 5. CLIENT_INACTIVITY_15D (Más de 15 días sin asistencias)
    if (rules.CLIENT_INACTIVITY_15D?.enabled !== false) {
      await processInactivity15Days();
    }

    // 6. CLIENT_BIRTHDAY & PATIENT_BIRTHDAY (Cumpleaños)
    if (rules.CLIENT_BIRTHDAY?.enabled !== false) {
      await processBirthdays('client');
    }
    if (rules.PATIENT_BIRTHDAY?.enabled !== false) {
      await processBirthdays('patient');
    }

    // 7. PATIENT_APPOINTMENT_1D & PATIENT_APPOINTMENT_TODAY
    if (rules.PATIENT_APPOINTMENT_1D?.enabled !== false) {
      await processAppointments(1);
    }
    if (rules.PATIENT_APPOINTMENT_TODAY?.enabled !== false) {
      await processAppointments(0);
    }

    console.log('✅ WhatsApp Automation Engine execution finished.');
  } catch (err) {
    console.error('❌ Error executing WhatsApp automations:', err.message);
  }
};

/**
 * 1 y 2. Vencimientos en N días (3 días antes o mismo día)
 */
async function processSubscriptionsExpiringInDays(daysAhead, rules) {
  try {
    const queryStr = `
      SELECT 
        s.id as subscription_id,
        s.client_id,
        s.end_date,
        c.first_name,
        c.last_name,
        c.phone,
        p.name as plan_name,
        COALESCE(p.duration_days, 30) as duration_days
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.end_date = CURRENT_DATE + ($1 || ' days')::INTERVAL
        AND c.is_active = true
        AND c.phone IS NOT NULL AND c.phone != '';
    `;

    const res = await pool.query(queryStr, [daysAhead]);
    for (const sub of res.rows) {
      const isAnnual = sub.duration_days >= 300;
      let notificationType = '';
      let defaultMsg = '';

      if (daysAhead === 3) {
        notificationType = isAnnual ? 'CLIENT_EXPIRING_3D_ANNUAL' : 'CLIENT_EXPIRING_3D_MONTHLY';
        defaultMsg = isAnnual 
          ? `Hola ${sub.first_name}! 🏆 Te recordamos que tu anualidad en Pimpon Gym vence en 3 días. ¡Gracias por tu preferencia! Pasa por recepción para renovar.`
          : `Hola ${sub.first_name}! 🏋️ Te recordamos que tu membresía en Pimpon Gym vence en 3 días (${sub.end_date}). ¡Renueva a tiempo para no perder tu entrenamiento!`;
      } else {
        notificationType = isAnnual ? 'CLIENT_EXPIRED_TODAY_ANNUAL' : 'CLIENT_EXPIRED_TODAY_MONTHLY';
        defaultMsg = isAnnual
          ? `Hola ${sub.first_name}! 🎉 Hoy se cumple tu año de entrenamiento en Pimpon Gym. Pasa a recepción para renovar tu anualidad.`
          : `Hola ${sub.first_name}! ⚠️ Tu mensualidad en Pimpon Gym vence hoy. Acércate a recepción o contáctanos para renovar tu acceso.`;
      }

      // Evitar duplicados
      const alreadySent = await notificationsRepo.hasNotificationBeenSent({
        clientId: sub.client_id,
        type: notificationType,
        hoursThreshold: 20,
      });

      if (!alreadySent) {
        await notificationsService.send({
          client_id: sub.client_id,
          phone: sub.phone,
          recipient_name: `${sub.first_name} ${sub.last_name}`,
          type: notificationType,
          message: defaultMsg,
          entity_type: 'gym',
        });
      }
    }
  } catch (err) {
    console.error('Error en processSubscriptionsExpiringInDays:', err.message);
  }
}

/**
 * 3. Promoción para membresías vencidas hace 7 días
 */
async function processExpiredSubscriptionsPromo(daysAgo) {
  try {
    const queryStr = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.phone
      FROM clients c
      WHERE c.is_active = true
        AND c.phone IS NOT NULL AND c.phone != ''
        AND c.id NOT IN (
          SELECT client_id FROM subscriptions WHERE status = 'active' OR end_date >= CURRENT_DATE
        )
        AND c.id IN (
          SELECT client_id FROM subscriptions WHERE end_date = CURRENT_DATE - ($1 || ' days')::INTERVAL
        );
    `;

    const res = await pool.query(queryStr, [daysAgo]);
    for (const client of res.rows) {
      const type = 'CLIENT_RENEWAL_PROMO';
      const alreadySent = await notificationsRepo.hasNotificationBeenSent({
        clientId: client.client_id,
        type,
        hoursThreshold: 120, // no repetir en 5 días
      });

      if (!alreadySent) {
        await notificationsService.send({
          client_id: client.client_id,
          phone: client.phone,
          recipient_name: `${client.first_name} ${client.last_name}`,
          type,
          message: `Hola ${client.first_name}! 💪 Te extrañamos en Pimpon Gym. Tenemos una promoción especial para que renueves tu mensualidad hoy. ¡Contáctanos y vuelve a entrenar!`,
          entity_type: 'gym',
        });
      }
    }
  } catch (err) {
    console.error('Error en processExpiredSubscriptionsPromo:', err.message);
  }
}

/**
 * 4. Racha de 6 meses consecutivos ininterrumpidos
 */
async function processStreak6Months() {
  try {
    const queryStr = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(DISTINCT DATE_TRUNC('month', p.paid_at)) as consecutive_months
      FROM clients c
      JOIN payments p ON p.client_id = c.id
      WHERE c.is_active = true
        AND p.payment_type IN ('monthly', 'enrollment')
        AND (p.is_voided IS NULL OR p.is_voided = false)
        AND p.paid_at >= NOW() - INTERVAL '180 days'
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(DISTINCT DATE_TRUNC('month', p.paid_at)) >= 6;
    `;

    const res = await pool.query(queryStr);
    for (const client of res.rows) {
      const type = 'CLIENT_STREAK_6M';
      const lastSent = await notificationsRepo.findLastByTargetAndType({ clientId: client.client_id, type });

      // Solo enviar una vez cada 6 meses (150 días de resguardo)
      if (!lastSent || (new Date() - new Date(lastSent.sent_at)) > 150 * 24 * 60 * 60 * 1000) {
        await notificationsService.send({
          client_id: client.client_id,
          phone: client.phone,
          recipient_name: `${client.first_name} ${client.last_name}`,
          type,
          message: `🎉 ¡Muchas felicidades ${client.first_name}! Has cumplido 6 meses consecutivos ininterrumpidos entrenando en Pimpon Gym. Pasa a recepción por tu regalo/incentivo especial por tu gran disciplina. 🏅`,
          entity_type: 'gym',
        });
      }
    }
  } catch (err) {
    console.error('Error en processStreak6Months:', err.message);
  }
}

/**
 * 5. Inactividad de más de 15 días sin asistencias
 */
async function processInactivity15Days() {
  try {
    const queryStr = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.phone,
        MAX(a.checked_in_at) as last_attendance
      FROM clients c
      LEFT JOIN attendance a ON a.client_id = c.id
      WHERE c.is_active = true
        AND c.phone IS NOT NULL AND c.phone != ''
        AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.client_id = c.id AND s.status = 'active')
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING MAX(a.checked_in_at) IS NULL OR MAX(a.checked_in_at) < NOW() - INTERVAL '15 days';
    `;

    const res = await pool.query(queryStr);
    for (const client of res.rows) {
      const type = 'CLIENT_INACTIVITY_15D';
      const alreadySent = await notificationsRepo.hasNotificationBeenSent({
        clientId: client.client_id,
        type,
        hoursThreshold: 168, // Evitar enviar más de una vez por semana
      });

      if (!alreadySent) {
        await notificationsService.send({
          client_id: client.client_id,
          phone: client.phone,
          recipient_name: `${client.first_name} ${client.last_name}`,
          type,
          message: `Hola ${client.first_name}! 👋 Notamos que hace más de 15 días no nos visitas en Pimpon Gym. Queríamos saber si todo está bien o si requieres apoyo con tu rutina. ¡Te esperamos de vuelta!`,
          entity_type: 'gym',
        });
      }
    }
  } catch (err) {
    console.error('Error en processInactivity15Days:', err.message);
  }
}

/**
 * 6. Felicitaciones de Cumpleaños para Clientes y Pacientes
 */
async function processBirthdays(targetType) {
  try {
    const isClient = targetType === 'client';
    const tableName = isClient ? 'clients' : 'patients';
    const notificationType = isClient ? 'CLIENT_BIRTHDAY' : 'PATIENT_BIRTHDAY';

    const queryStr = `
      SELECT id, first_name, last_name, phone
      FROM ${tableName}
      WHERE is_active = true
        AND birth_date IS NOT NULL
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
        AND phone IS NOT NULL AND phone != '';
    `;

    const res = await pool.query(queryStr);
    for (const item of res.rows) {
      const alreadySent = await notificationsRepo.hasNotificationBeenSent({
        clientId: isClient ? item.id : null,
        patientId: !isClient ? item.id : null,
        type: notificationType,
        hoursThreshold: 20,
      });

      if (!alreadySent) {
        const msg = isClient
          ? `🎂 ¡Feliz Cumpleaños ${item.first_name}! De parte de todo el equipo de Pimpon Gym te deseamos un excelente día lleno de salud y energía. ¡Ven a celebrar tu día entrenando!`
          : `🎂 ¡Feliz Cumpleaños ${item.first_name}! Tu equipo de nutrición en Pimpon te desea un año repleto de salud, metas cumplidas y gran bienestar.`;

        await notificationsService.send({
          client_id: isClient ? item.id : null,
          patient_id: !isClient ? item.id : null,
          phone: item.phone,
          recipient_name: `${item.first_name} ${item.last_name}`,
          type: notificationType,
          message: msg,
          entity_type: isClient ? 'gym' : 'consultorio',
        });
      }
    }
  } catch (err) {
    console.error(`Error en processBirthdays (${targetType}):`, err.message);
  }
}

/**
 * 7. Recordatorios de Citas de Nutrición (1 día antes o hoy)
 */
async function processAppointments(daysAhead) {
  try {
    const notificationType = daysAhead === 1 ? 'PATIENT_APPOINTMENT_1D' : 'PATIENT_APPOINTMENT_TODAY';

    const queryStr = `
      SELECT 
        a.id as agenda_id,
        a.patient_id,
        a.client_id,
        a.start_at,
        COALESCE(p.first_name, c.first_name) as first_name,
        COALESCE(p.last_name, c.last_name) as last_name,
        COALESCE(p.phone, c.phone, a.phone) as phone
      FROM agenda a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.start_at::date = CURRENT_DATE + ($1 || ' days')::INTERVAL
        AND a.status NOT IN ('cancelada', 'ausente', 'realizada')
        AND COALESCE(p.phone, c.phone, a.phone) IS NOT NULL;
    `;

    const res = await pool.query(queryStr, [daysAhead]);
    for (const appt of res.rows) {
      const timeStr = new Date(appt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const alreadySent = await notificationsRepo.hasNotificationBeenSent({
        patientId: appt.patient_id,
        clientId: appt.client_id,
        type: notificationType,
        hoursThreshold: 20,
      });

      if (!alreadySent) {
        const msg = daysAhead === 1
          ? `Hola ${appt.first_name}! 🍏 Te recordamos tu cita de nutrición agendada para mañana a las ${timeStr}. Por favor confírmanos tu asistencia.`
          : `Hola ${appt.first_name}! ⏰ Recordatorio: Hoy tienes tu cita de nutrición a las ${timeStr} en Pimpon Consultorio. ¡Te esperamos!`;

        await notificationsService.send({
          patient_id: appt.patient_id || null,
          client_id: appt.client_id || null,
          phone: appt.phone,
          recipient_name: `${appt.first_name} ${appt.last_name}`,
          type: notificationType,
          message: msg,
          entity_type: 'consultorio',
        });
      }
    }
  } catch (err) {
    console.error('Error en processAppointments:', err.message);
  }
}

/**
 * Inicializador del Cron de WhatsApp
 * Se ejecuta automáticamente todos los días a las 08:30 AM
 */
const initCron = () => {
  // Ejecutar todos los días a las 08:30 AM ('30 8 * * *')
  cron.schedule('30 8 * * *', () => {
    console.log('⏰ Running daily WhatsApp scheduled automations at 08:30 AM...');
    runAutomationTasks();
  });

  console.log('📅 WhatsApp Automation Cron Engine registered successfully (Schedule: Daily 08:30 AM).');
};

module.exports = {
  initCron,
  runAutomationTasks,
};
