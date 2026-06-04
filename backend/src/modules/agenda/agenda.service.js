const { createError } = require('../../lib/appError');
const repo = require('./agenda.repository');

const create = async (payload) => {
  if (!payload.event_type || !payload.title || !payload.start_at) {
    throw createError(400, 'Faltan campos obligatorios para crear la agenda');
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
