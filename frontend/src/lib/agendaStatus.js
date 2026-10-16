export function normalizeAgendaEntityId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

export function findEnCursoEventToComplete({ events = [], patientId = null, eventId = null } = {}) {
  if (!Array.isArray(events)) return null;

  const normalizedPatientId = normalizeAgendaEntityId(patientId);
  const normalizedEventId = normalizeAgendaEntityId(eventId);

  const matchingEvents = events.filter((event) => {
    if (!event || event.status !== 'en_curso') return false;

    const patientMatches = normalizedPatientId
      ? [event.patient_id, event.client_id].some((value) => normalizeAgendaEntityId(value) === normalizedPatientId)
      : true;

    if (!patientMatches) return false;

    if (normalizedEventId) {
      return normalizeAgendaEntityId(event.id) === normalizedEventId;
    }

    return true;
  });

  if (!matchingEvents.length) return null;

  return [...matchingEvents].sort((a, b) => new Date(b.start_at) - new Date(a.start_at))[0];
}
