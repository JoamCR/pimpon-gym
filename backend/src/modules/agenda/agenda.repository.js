const { query } = require('../../lib/database');

const createEvent = async (payload) => {
  const res = await query(
    `INSERT INTO agenda (event_type, title, description, patient_id, phone, status, start_at, end_at, reminder_at, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [payload.event_type, payload.title, payload.description || null, payload.patient_id || null, payload.phone || null, payload.status || 'programada', payload.start_at, payload.end_at || null, payload.reminder_at || null, payload.metadata || null, payload.created_by || null]
  );
  return res.rows[0];
};

const getEvents = async (filters = {}) => {
  let queryText = `
    SELECT a.*, p.first_name, p.last_name 
    FROM agenda a 
    LEFT JOIN patients p ON a.patient_id = p.id
  `;
  const clauses = [];
  const params = [];

  if (filters.start_at) {
    params.push(filters.start_at);
    clauses.push(`a.start_at >= $${params.length}`);
  }
  if (filters.end_at) {
    params.push(filters.end_at);
    clauses.push(`a.start_at <= $${params.length}`);
  }
  if (filters.patient_id) {
    params.push(filters.patient_id);
    clauses.push(`a.patient_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const searchClauses = [
      `a.title ILIKE $${params.length}`,
      `a.status ILIKE $${params.length}`,
      `p.first_name ILIKE $${params.length}`,
      `p.last_name ILIKE $${params.length}`,
      `p.first_name || ' ' || p.last_name ILIKE $${params.length}`
    ];
    clauses.push(`(${searchClauses.join(' OR ')})`);
  }

  if (clauses.length > 0) {
    queryText += ` WHERE ${clauses.join(' AND ')}`;
  }
  
  queryText += ' ORDER BY a.start_at ASC';

  const res = await query(queryText, params);
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

const findOverlappingEvents = async (start_at, end_at, excludeEventId = null) => {
  // If no end_at is provided for the new event, we'll default to a 1-hour duration for the check.
  // This is a robust way to prevent double bookings at the same start time.
  const effective_end_at = end_at || new Date(new Date(start_at).getTime() + 60 * 60 * 1000).toISOString();

  const params = [start_at, effective_end_at];
  // The query uses PostgreSQL's OVERLAPS operator for a correct and concise interval collision check.
  // We use COALESCE on the database's `end_at` column. If it's NULL, we treat it as a 1-hour event
  // for the purpose of the overlap check. This ensures events stored with no end time are still considered.
  let queryText = `
    SELECT * FROM agenda
    WHERE (start_at, COALESCE(end_at, start_at + interval '1 hour')) OVERLAPS ($1, $2)
  `;

  if (excludeEventId) {
    params.push(excludeEventId);
    queryText += ` AND id != $${params.length}`;
  }

  const res = await query(queryText, params);
  return res.rows;
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  findOverlappingEvents,
};
