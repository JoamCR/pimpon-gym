const repository = require('./notifications.repository');
const whatsappService = require('../../services/whatsappService');
const { createError } = require('../../lib/appError');
const { pool } = require('../../lib/database');

/**
 * Servicio de notificaciones de WhatsApp y Logs
 * REGLA: Lógica de negocio ÚNICAMENTE. Nunca queries SQL directas aquí.
 */

/**
 * Envía una notificación por WhatsApp (a cliente o paciente) y registra el evento en BD
 */
const send = async (data, sentBy = null) => {
  try {
    if (!data.client_id && !data.patient_id && !data.phone) {
      throw createError(400, 'Se requiere al menos client_id, patient_id o un teléfono directo');
    }

    let targetPhone = data.phone;
    let recipientName = data.recipient_name || '';

    // Si tenemos client_id o patient_id, consultar el teléfono si no viene provisto
    if (!targetPhone) {
      if (data.client_id) {
        const clientRes = await pool.query('SELECT first_name, last_name, phone FROM clients WHERE id = $1', [data.client_id]);
        if (clientRes.rows.length > 0) {
          targetPhone = clientRes.rows[0].phone;
          recipientName = `${clientRes.rows[0].first_name} ${clientRes.rows[0].last_name}`;
        }
      } else if (data.patient_id) {
        const patientRes = await pool.query('SELECT first_name, last_name, phone FROM patients WHERE id = $1', [data.patient_id]);
        if (patientRes.rows.length > 0) {
          targetPhone = patientRes.rows[0].phone;
          recipientName = `${patientRes.rows[0].first_name} ${patientRes.rows[0].last_name}`;
        }
      }
    }

    if (!targetPhone) {
      throw createError(400, 'El cliente/paciente seleccionado no tiene un número de teléfono registrado.');
    }

    // Ejecutar el envío a través de Meta WhatsApp Cloud API / Test Mode
    let waResult = null;
    let status = 'sent';
    let errorMessage = null;

    try {
      waResult = await whatsappService.sendMessage({
        to: targetPhone,
        message: data.message,
        templateName: data.template_name,
        templateParams: data.template_params || [],
        mediaUrl: data.media_url,
        mediaType: data.media_type || 'image',
        caption: data.caption || data.message,
      });
    } catch (waErr) {
      status = 'failed';
      errorMessage = waErr.message;
      console.error('❌ Error enviando mensaje de WhatsApp:', waErr.message);
    }

    // Guardar el registro en la base de datos
    const notification = await repository.create({
      client_id: data.client_id || null,
      patient_id: data.patient_id || null,
      phone: targetPhone,
      entity_type: data.entity_type || (data.patient_id ? 'consultorio' : 'gym'),
      type: data.type || 'CUSTOM_MESSAGE',
      channel: 'whatsapp',
      message: data.message || `Mensaje enviado a ${recipientName || targetPhone}`,
      sent_by: sentBy,
      status,
      metadata: {
        wa_result: waResult,
        error: errorMessage,
        recipient_name: recipientName,
        media_url: data.media_url || null,
      },
    });

    if (status === 'failed') {
      throw createError(500, `No se pudo enviar el mensaje por WhatsApp: ${errorMessage}`);
    }

    return notification;
  } catch (error) {
    console.error('Error en send notification:', error);
    if (error.isOperational) throw error;
    throw createError(500, error.message || 'Error al enviar notificación');
  }
};

/**
 * Envío masivo a una lista seleccionada de destinatarios
 */
const sendBulk = async ({ items = [], custom_message = null }, sentBy = null) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError(400, 'Selecciona al menos un destinatario de la lista para el envío masivo');
  }

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const item of items) {
    try {
      const msg = custom_message 
        ? custom_message.replace(/{{name}}/g, item.first_name || item.name || 'Cliente')
        : item.default_message || `Hola ${item.first_name || item.name}! Te escribimos de Pimpon.`;

      const notification = await send({
        client_id: item.client_id || null,
        patient_id: item.patient_id || null,
        phone: item.phone,
        recipient_name: item.name || `${item.first_name || ''} ${item.last_name || ''}`,
        type: item.type || 'BULK_MESSAGE',
        message: msg,
        entity_type: item.entity_type || 'gym',
      }, sentBy);

      results.push({ item, success: true, notification });
      successCount++;
    } catch (err) {
      results.push({ item, success: false, error: err.message });
      failCount++;
    }
  }

  return {
    total: items.length,
    success_count: successCount,
    fail_count: failCount,
    results,
  };
};

/**
 * Obtiene la lista clasificada de clientes y pacientes listos para enviar mensajes por WhatsApp
 */
const getPendingTargets = async () => {
  const groups = [];

  try {
    // 1. Mensualidades por Vencer (1 a 3 Días)
    const exp3dMonthlyRes = await pool.query(`
      SELECT 
        s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Mensualidad') as plan_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.end_date >= CURRENT_DATE + INTERVAL '1 day'
        AND s.end_date <= CURRENT_DATE + INTERVAL '3 days'
        AND COALESCE(p.duration_days, 30) < 300
        AND c.is_active = true AND c.phone IS NOT NULL AND c.phone != '';
    `);

    groups.push({
      id: 'expiring_3d_monthly',
      title: 'Mensualidades por Vencer (1 a 3 Días)',
      subtitle: 'Clientes cuya mensualidad caduca entre 1 y 3 días futuros',
      type: 'CLIENT_EXPIRING_3D_MONTHLY',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 🏋️ Te recordamos que tu mensualidad en Pimpon Gym vence pronto. ¡Renueva a tiempo para seguir entrenando!',
      items: exp3dMonthlyRes.rows.map(r => ({
        id: `exp3dm_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Plan ${r.plan_name} (Vence el ${new Date(r.end_date).toLocaleDateString('es-MX')})`,
        type: 'CLIENT_EXPIRING_3D_MONTHLY',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 🏋️ Te recordamos que tu mensualidad en Pimpon Gym vence pronto. ¡Renueva a tiempo para seguir entrenando!`
      }))
    });

    // 2. Anualidades por Vencer (1 a 3 Días)
    const exp3dAnnualRes = await pool.query(`
      SELECT 
        s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Anualidad') as plan_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.end_date >= CURRENT_DATE + INTERVAL '1 day'
        AND s.end_date <= CURRENT_DATE + INTERVAL '3 days'
        AND COALESCE(p.duration_days, 30) >= 300
        AND c.is_active = true AND c.phone IS NOT NULL AND c.phone != '';
    `);

    groups.push({
      id: 'expiring_3d_annual',
      title: 'Anualidades por Vencer (1 a 3 Días)',
      subtitle: 'Socios cuya anualidad caduca entre 1 y 3 días futuros',
      type: 'CLIENT_EXPIRING_3D_ANNUAL',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 🏆 Te recordamos que tu anualidad en Pimpon Gym vence pronto. ¡Gracias por formar parte de nuestra familia! Acércate a recepción para renovarla.',
      items: exp3dAnnualRes.rows.map(r => ({
        id: `exp3da_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Plan ${r.plan_name} (Vence el ${new Date(r.end_date).toLocaleDateString('es-MX')})`,
        type: 'CLIENT_EXPIRING_3D_ANNUAL',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 🏆 Te recordamos que tu anualidad en Pimpon Gym vence pronto. ¡Gracias por formar parte de nuestra familia! Acércate a recepción para renovarla.`
      }))
    });

    // 3. Mensualidades que Vencen Hoy
    const expTodayMonthlyRes = await pool.query(`
      SELECT 
        s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Mensualidad') as plan_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.end_date = CURRENT_DATE
        AND COALESCE(p.duration_days, 30) < 300
        AND c.is_active = true AND c.phone IS NOT NULL AND c.phone != '';
    `);

    groups.push({
      id: 'expired_today_monthly',
      title: 'Mensualidades que Vencen Hoy',
      subtitle: 'Clientes cuya mensualidad vence el día de hoy exacto',
      type: 'CLIENT_EXPIRED_TODAY_MONTHLY',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! ⚠️ Tu mensualidad en Pimpon Gym vence el día de hoy. Acércate a recepción o contáctanos para renovar tu acceso.',
      items: expTodayMonthlyRes.rows.map(r => ({
        id: `exptodaym_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Plan ${r.plan_name} (Vence hoy)`,
        type: 'CLIENT_EXPIRED_TODAY_MONTHLY',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! ⚠️ Tu mensualidad en Pimpon Gym vence hoy. Acércate a recepción o contáctanos para renovarla.`
      }))
    });

    // 4. Anualidades que Vencen Hoy
    const expTodayAnnualRes = await pool.query(`
      SELECT 
        s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Anualidad') as plan_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.end_date = CURRENT_DATE
        AND COALESCE(p.duration_days, 30) >= 300
        AND c.is_active = true AND c.phone IS NOT NULL AND c.phone != '';
    `);

    groups.push({
      id: 'expired_today_annual',
      title: 'Anualidades que Vencen Hoy',
      subtitle: 'Socios cuya anualidad vence el día de hoy exacto',
      type: 'CLIENT_EXPIRED_TODAY_ANNUAL',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 🎉 Hoy se cumple tu año de entrenamiento en Pimpon Gym. Pasa por recepción a renovar tu anualidad para continuar disfrutando los beneficios.',
      items: expTodayAnnualRes.rows.map(r => ({
        id: `exptodaya_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Plan ${r.plan_name} (Vence hoy)`,
        type: 'CLIENT_EXPIRED_TODAY_ANNUAL',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 🎉 Hoy se cumple tu año de entrenamiento en Pimpon Gym. Pasa a recepción para renovar tu anualidad.`
      }))
    });

    // 5. Mensualidades Vencidas (Pasadas no renovadas)
    const expiredPastMonthlyRes = await pool.query(`
      SELECT DISTINCT ON (c.id) s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Mensualidad') as plan_name
      FROM clients c
      JOIN subscriptions s ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND c.phone IS NOT NULL AND c.phone != ''
        AND COALESCE(p.duration_days, 30) < 300
        AND c.id NOT IN (SELECT client_id FROM subscriptions WHERE status = 'active' AND end_date >= CURRENT_DATE)
        AND s.end_date < CURRENT_DATE
      ORDER BY c.id, s.end_date DESC;
    `);

    groups.push({
      id: 'expired_past_monthly',
      title: 'Mensualidades Vencidas (Pasadas)',
      subtitle: 'Clientes cuya mensualidad venció en días pasados y no han renovado',
      type: 'CLIENT_RENEWAL_PROMO',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 💪 Te extrañamos en Pimpon Gym. Tu mensualidad se encuentra vencida. ¡Tenemos una promoción especial para que vuelvas a entrenar hoy!',
      items: expiredPastMonthlyRes.rows.map(r => ({
        id: `pastm_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Venció el ${new Date(r.end_date).toLocaleDateString('es-MX')}`,
        type: 'CLIENT_RENEWAL_PROMO',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 💪 Te extrañamos en Pimpon Gym. Tu mensualidad venció el ${new Date(r.end_date).toLocaleDateString('es-MX')}. ¡Contáctanos y renueva con promo!`
      }))
    });

    // 6. Anualidades Vencidas (Pasadas no renovadas)
    const expiredPastAnnualRes = await pool.query(`
      SELECT DISTINCT ON (c.id) s.client_id, c.first_name, c.last_name, c.phone, s.end_date, COALESCE(p.name, 'Anualidad') as plan_name
      FROM clients c
      JOIN subscriptions s ON s.client_id = c.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND c.phone IS NOT NULL AND c.phone != ''
        AND COALESCE(p.duration_days, 30) >= 300
        AND c.id NOT IN (SELECT client_id FROM subscriptions WHERE status = 'active' AND end_date >= CURRENT_DATE)
        AND s.end_date < CURRENT_DATE
      ORDER BY c.id, s.end_date DESC;
    `);

    groups.push({
      id: 'expired_past_annual',
      title: 'Anualidades Vencidas (Pasadas)',
      subtitle: 'Socios cuya anualidad venció en días pasados y no han renovado',
      type: 'CLIENT_RENEWAL_PROMO',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 🏆 Te extrañamos en Pimpon Gym. Tu anualidad se encuentra vencida. ¡Contáctanos para renovarla con un descuento exclusivo!',
      items: expiredPastAnnualRes.rows.map(r => ({
        id: `fasta_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Anualidad vencida el ${new Date(r.end_date).toLocaleDateString('es-MX')}`,
        type: 'CLIENT_RENEWAL_PROMO',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 🏆 Te extrañamos en Pimpon Gym. Tu anualidad venció el ${new Date(r.end_date).toLocaleDateString('es-MX')}. ¡Contáctanos y renueva con beneficio especial!`
      }))
    });

    // 7. Inactividad > 15 Días (Clientes Gimnasio)
    const inactRes = await pool.query(`
      SELECT c.id as client_id, c.first_name, c.last_name, c.phone, MAX(a.checked_in_at) as last_attendance
      FROM clients c
      LEFT JOIN attendance a ON a.client_id = c.id
      WHERE c.is_active = true AND c.phone IS NOT NULL AND c.phone != ''
        AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.client_id = c.id AND s.status = 'active')
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING MAX(a.checked_in_at) IS NULL OR MAX(a.checked_in_at) < NOW() - INTERVAL '15 days';
    `);

    groups.push({
      id: 'inactivity_15d',
      title: 'Inactividad de 15+ Días (Gimnasio)',
      subtitle: 'Socios sin asistencias en los últimos 15 días',
      type: 'CLIENT_INACTIVITY_15D',
      entity_type: 'gym',
      default_template: 'Hola {{name}}! 👋 Notamos que hace más de 15 días no nos visitas en Pimpon Gym. ¿Todo bien? ¡Te esperamos de vuelta!',
      items: inactRes.rows.map(r => ({
        id: `inact_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: r.last_attendance ? `Última asistencia: ${new Date(r.last_attendance).toLocaleDateString('es-MX')}` : 'Sin asistencias registradas',
        type: 'CLIENT_INACTIVITY_15D',
        entity_type: 'gym',
        default_message: `Hola ${r.first_name}! 👋 Notamos que hace más de 15 días no nos visitas en Pimpon Gym. ¿Todo bien? ¡Te esperamos de vuelta!`
      }))
    });

    // 8. Cumpleaños de hoy (Clientes Gimnasio)
    const bdayClientRes = await pool.query(`
      SELECT id as client_id, first_name, last_name, phone
      FROM clients
      WHERE is_active = true AND birth_date IS NOT NULL
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
        AND phone IS NOT NULL AND phone != '';
    `);

    groups.push({
      id: 'birthdays_clients',
      title: 'Cumpleaños de Hoy (Clientes)',
      subtitle: 'Socios del gimnasio que cumplen años hoy',
      type: 'CLIENT_BIRTHDAY',
      entity_type: 'gym',
      default_template: '🎂 ¡Feliz Cumpleaños {{name}}! Todo el equipo de Pimpon Gym te desea un excelente día lleno de salud, energía y metas alcanzadas.',
      items: bdayClientRes.rows.map(r => ({
        id: `bdayc_${r.client_id}`,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: 'Cumpleaños el día de hoy 🎂',
        type: 'CLIENT_BIRTHDAY',
        entity_type: 'gym',
        default_message: `🎂 ¡Feliz Cumpleaños ${r.first_name}! Todo el equipo de Pimpon Gym te desea un excelente día lleno de salud y energía.`
      }))
    });

    // 9. Citas de Nutrición Mañana (Pacientes Consultorio)
    const appt1dRes = await pool.query(`
      SELECT 
        a.id as agenda_id, a.patient_id, a.client_id, a.start_at,
        COALESCE(p.first_name, c.first_name) as first_name,
        COALESCE(p.last_name, c.last_name) as last_name,
        COALESCE(p.phone, c.phone, a.phone) as phone
      FROM agenda a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.start_at::date = CURRENT_DATE + INTERVAL '1 day'
        AND a.status NOT IN ('cancelada', 'ausente', 'realizada')
        AND COALESCE(p.phone, c.phone, a.phone) IS NOT NULL;
    `);

    groups.push({
      id: 'appointments_1d',
      title: 'Citas de Nutrición Mañana (Pacientes)',
      subtitle: 'Pacientes con cita agendada para el día de mañana',
      type: 'PATIENT_APPOINTMENT_1D',
      entity_type: 'consultorio',
      default_template: 'Hola {{name}}! 🍏 Te recordamos tu cita de nutrición agendada para mañana en Pimpon Consultorio. Por favor confírmanos tu asistencia.',
      items: appt1dRes.rows.map(r => ({
        id: `appt1d_${r.agenda_id}`,
        patient_id: r.patient_id,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Cita a las ${new Date(r.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        type: 'PATIENT_APPOINTMENT_1D',
        entity_type: 'consultorio',
        default_message: `Hola ${r.first_name}! 🍏 Te recordamos tu cita de nutrición para mañana a las ${new Date(r.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}. Por favor confírmanos tu asistencia.`
      }))
    });

    // 10. Citas de Nutrición Hoy (Pacientes Consultorio)
    const apptTodayRes = await pool.query(`
      SELECT 
        a.id as agenda_id, a.patient_id, a.client_id, a.start_at,
        COALESCE(p.first_name, c.first_name) as first_name,
        COALESCE(p.last_name, c.last_name) as last_name,
        COALESCE(p.phone, c.phone, a.phone) as phone
      FROM agenda a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.start_at::date = CURRENT_DATE
        AND a.status NOT IN ('cancelada', 'ausente', 'realizada')
        AND COALESCE(p.phone, c.phone, a.phone) IS NOT NULL;
    `);

    groups.push({
      id: 'appointments_today',
      title: 'Citas de Nutrición Hoy (Pacientes)',
      subtitle: 'Pacientes con cita programada para el día de hoy',
      type: 'PATIENT_APPOINTMENT_TODAY',
      entity_type: 'consultorio',
      default_template: 'Hola {{name}}! ⏰ Hoy es tu cita de nutrición en Pimpon Consultorio. ¡Te esperamos puntual!',
      items: apptTodayRes.rows.map(r => ({
        id: `appttoday_${r.agenda_id}`,
        patient_id: r.patient_id,
        client_id: r.client_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: `Cita hoy a las ${new Date(r.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        type: 'PATIENT_APPOINTMENT_TODAY',
        entity_type: 'consultorio',
        default_message: `Hola ${r.first_name}! ⏰ Hoy es tu cita de nutrición a las ${new Date(r.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}. ¡Te esperamos en Pimpon Consultorio!`
      }))
    });

    // 11. Cumpleaños de hoy (Pacientes Consultorio)
    const bdayPatientRes = await pool.query(`
      SELECT id as patient_id, first_name, last_name, phone
      FROM patients
      WHERE is_active = true AND birth_date IS NOT NULL
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
        AND phone IS NOT NULL AND phone != '';
    `);

    groups.push({
      id: 'birthdays_patients',
      title: 'Cumpleaños de Hoy (Pacientes)',
      subtitle: 'Pacientes del consultorio que cumplen años hoy',
      type: 'PATIENT_BIRTHDAY',
      entity_type: 'consultorio',
      default_template: '🎂 ¡Feliz Cumpleaños {{name}}! Tu equipo de nutrición en Pimpon te desea un año repleto de salud, metas cumplidas y gran bienestar.',
      items: bdayPatientRes.rows.map(r => ({
        id: `bdayp_${r.patient_id}`,
        patient_id: r.patient_id,
        name: `${r.first_name} ${r.last_name}`,
        first_name: r.first_name,
        phone: r.phone,
        details: 'Cumpleaños el día de hoy 🎂',
        type: 'PATIENT_BIRTHDAY',
        entity_type: 'consultorio',
        default_message: `🎂 ¡Feliz Cumpleaños ${r.first_name}! Tu equipo de nutrición en Pimpon te desea un año repleto de salud, metas cumplidas y gran bienestar.`
      }))
    });

  } catch (err) {
    console.error('Error en getPendingTargets:', err);
  }

  return { groups };
};

/**
 * Prueba de conexión a la API de WhatsApp
 */
const sendTest = async (options) => {
  const phone = typeof options === 'string' ? options : options?.phone;
  const useTemplate = typeof options === 'object' ? options?.useTemplate : false;
  const templateName = typeof options === 'object' ? options?.templateName : null;

  if (!phone) {
    throw createError(400, 'Ingresa un número de teléfono para la prueba');
  }

  if (useTemplate || templateName) {
    const tName = templateName || 'hello_world';
    return await whatsappService.sendMessage({
      to: phone,
      templateName: tName,
      templateLanguage: tName === 'hello_world' ? 'en_US' : 'es_MX',
    });
  }

  const testMessage = '🏋️ *Pimpon Gym*: Esta es una mensaje de prueba del sistema automatizado de notificaciones de WhatsApp. ¡Conexión exitosa!';

  return await whatsappService.sendMessage({
    to: phone,
    message: testMessage,
  });
};

/**
 * Obtener historial de notificaciones enviadas
 */
const getHistory = async (limit = 100, offset = 0, type = null) => {
  return await repository.findAll(limit, offset, type);
};

module.exports = {
  send,
  sendBulk,
  getPendingTargets,
  sendTest,
  getHistory,
};
