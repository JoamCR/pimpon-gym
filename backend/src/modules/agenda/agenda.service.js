const { createError } = require('../../lib/appError');
const repo = require('./agenda.repository');
const patientsService = require('../patients/patients.service'); // Import patients service

const create = async (payload) => {
  if (!payload.event_type || !payload.start_at) { // title is now optional, will be derived from patient/client
    throw createError(400, 'Faltan campos obligatorios para crear la agenda');
  }

  const personId = payload.patient_id || payload.client_id;
  if (personId) {
    try {
      const person = await patientsService.getById(personId);
      if (person) {
        if (!payload.title || payload.title.startsWith('Cita —') || payload.title.startsWith('Cita -')) {
          payload.title = `${person.first_name} ${person.last_name || ''}`.trim();
        }
        if (!payload.phone && person.phone) {
          payload.phone = person.phone;
        }

        if (person.user_type === 'client') {
          payload.client_id = person.id;
          payload.patient_id = person.patient_id || null;
        } else {
          payload.patient_id = person.id;
          payload.client_id = person.gym_client_id || person.client_id || null;
        }
      }
    } catch (e) {
      // Keep payload as is if getById throws
    }
  }

  // Fallback to default title if no patient/client or title provided
  if (!payload.title) {
    payload.title = 'Cita Agendada';
  }

  // Check for overlapping events (exact same date and minute)
  const overlappingEvents = await repo.findOverlappingEvents(payload.start_at, payload.end_at);
  if (overlappingEvents.length > 0) {
    throw createError(409, 'Ya existe una cita agendada para la misma fecha y hora (mismo minuto).');
  }

  const ev = await repo.createEvent(payload);
  return ev;
};

const list = async (filters) => {
  const rows = await repo.getEvents(filters || {});
  return rows;
};

const getById = async (id) => {
  const ev = await repo.getEventById(id);
  if (!ev) throw createError(404, 'Evento no encontrado');
  return ev;
};

const update = async (id, changes) => {
  const existingEvent = await repo.getEventById(id);
  if (!existingEvent) {
    throw createError(404, 'Evento no encontrado');
  }

  let effectivePersonId = changes.patient_id !== undefined 
    ? changes.patient_id 
    : (changes.client_id !== undefined ? changes.client_id : (existingEvent.patient_id || existingEvent.client_id));

  if (effectivePersonId) {
    try {
      const person = await patientsService.getById(effectivePersonId);
      if (person) {
        if (!changes.title || changes.title.startsWith('Cita —') || changes.title.startsWith('Cita -')) {
          changes.title = `${person.first_name} ${person.last_name || ''}`.trim();
        }
        if (person.user_type === 'client') {
          changes.client_id = person.id;
          changes.patient_id = person.patient_id || null;
        } else {
          changes.patient_id = person.id;
          changes.client_id = person.gym_client_id || person.client_id || null;
        }
      } else if (!changes.title) {
        changes.title = 'Cita Agendada (Persona no encontrada)';
      }
    } catch (e) {
      if (!changes.title) changes.title = 'Cita Agendada';
    }
  } else if (!changes.title) {
    changes.title = 'Cita Agendada';
  }

  // Determine effective start_at and end_at for overlap check
  const effectiveStartAt = changes.start_at || existingEvent.start_at;
  const effectiveEndAt = changes.end_at || existingEvent.end_at;

  // Check for overlapping events, excluding the current event
  const overlappingEvents = await repo.findOverlappingEvents(effectiveStartAt, effectiveEndAt, id);
  if (overlappingEvents.length > 0) {
    throw createError(409, 'Ya existe una cita agendada para la misma fecha y hora (mismo minuto).');
  }

  const ev = await repo.updateEvent(id, changes);
  return ev;
};

const remove = async (id) => {
  await repo.deleteEvent(id);
  return true;
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
