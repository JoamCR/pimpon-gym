const { query } = require('../../lib/database');

const createEvent = async (payload) => {
  const res = await query(
    `INSERT INTO agenda (event_type, title, description, patient_id, phone, status, start_at, end_at, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [payload.event_type, payload.title, payload.description || null, payload.patient_id || null, payload.phone || null, payload.status || 'programada', payload.start_at, payload.end_at || null, payload.metadata || null, payload.created_by || null]
  );
  return res.rows[0];
};

const getEvents = async (filters = {}) => {
  // Support optional date range and patient_id
  const clauses = [];
  const params = [];
  if (filters.start_at) {
    params.push(filters.start_at);
    clauses.push(`start_at >= $${params.length}`);
  }
  if (filters.end_at) {
    params.push(filters.end_at);
    clauses.push(`start_at <= $${params.length}`);
  }
  if (filters.patient_id) {
    params.push(filters.patient_id);
    clauses.push(`patient_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await query(`SELECT * FROM agenda ${where} ORDER BY start_at ASC`, params);
  return res.rows;
};

const getEventById = async (id) => {
  const res = await query('SELECT * FROM agenda WHERE id = $1', [id]);
  return res.rows[0];
};

const updateEvent = async (id, changes) => {
  const fields = [];
  const params = [];
  Object.entries(changes).forEach(([k, v]) => {
    params.push(v);
    fields.push(`${k} = $${params.length}`);
  });
  if (fields.length === 0) return getEventById(id);
  params.push(id);
  const res = await query(`UPDATE agenda SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  return res.rows[0];
};

const deleteEvent = async (id) => {
  await query('DELETE FROM agenda WHERE id = $1', [id]);
  return true;
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
