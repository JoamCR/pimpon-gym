const { createError } = require('../../lib/appError');
const repo = require('./agenda.repository');
const patientsService = require('../patients/patients.service'); // Import patients service

const create = async (payload) => {
  if (!payload.event_type || !payload.start_at) { // title is now optional, will be derived from patient
    throw createError(400, 'Faltan campos obligatorios para crear la agenda');
  }

  // If patient_id is provided, try to use patient's name as title
  if (payload.patient_id) {
    const patient = await patientsService.getById(payload.patient_id);
    if (patient) {
      payload.title = `${patient.first_name} ${patient.last_name}`;
    }
  }

  // Fallback to default title if no patient or title provided
  if (!payload.title) {
    payload.title = 'Cita Agendada'; // Default title if no patient is linked or name isn't found
  }

  // Check for overlapping events
  const overlappingEvents = await repo.findOverlappingEvents(payload.start_at, payload.end_at);
  if (overlappingEvents.length > 0) {
    throw createError(409, 'Ya existe una cita agendada para este horario.');
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

  let effectivePatientId = changes.patient_id !== undefined ? changes.patient_id : existingEvent.patient_id;

  if (effectivePatientId) {
    const patient = await patientsService.getById(effectivePatientId);
    if (patient) {
      changes.title = `${patient.first_name} ${patient.last_name}`;
    } else {
      // If patient_id is present but patient not found, maybe default title
      changes.title = 'Cita Agendada (Paciente no encontrado)';
    }
  } else if (!changes.title) { // If no patient_id and no title explicitly provided
    changes.title = 'Cita Agendada'; // Default title
  }

  // Determine effective start_at and end_at for overlap check
  const effectiveStartAt = changes.start_at || existingEvent.start_at;
  const effectiveEndAt = changes.end_at || existingEvent.end_at;

  // Check for overlapping events, excluding the current event
  const overlappingEvents = await repo.findOverlappingEvents(effectiveStartAt, effectiveEndAt, id);
  if (overlappingEvents.length > 0) {
    throw createError(409, 'Ya existe una cita agendada para este horario.');
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
