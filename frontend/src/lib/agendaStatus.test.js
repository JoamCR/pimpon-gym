import { describe, it, expect } from 'vitest';
import { findEnCursoEventToComplete } from './agendaStatus';

describe('findEnCursoEventToComplete', () => {
  it('prioriza la cita exacta por eventId cuando la consulta viene desde una agenda en curso', () => {
    const events = [
      { id: 'a', patient_id: '100', status: 'en_curso', start_at: '2026-10-15T09:00:00.000Z' },
      { id: 'b', patient_id: '100', status: 'en_curso', start_at: '2026-10-15T10:00:00.000Z' }
    ];

    expect(findEnCursoEventToComplete({ events, patientId: '100', eventId: 'a' })).toMatchObject({ id: 'a' });
  });

  it('falla hacia la cita en curso más reciente del paciente cuando no llega un eventId', () => {
    const events = [
      { id: 'a', patient_id: '100', status: 'programada', start_at: '2026-10-15T09:00:00.000Z' },
      { id: 'b', patient_id: '100', status: 'en_curso', start_at: '2026-10-15T09:30:00.000Z' },
      { id: 'c', patient_id: '200', status: 'en_curso', start_at: '2026-10-15T08:00:00.000Z' }
    ];

    expect(findEnCursoEventToComplete({ events, patientId: '100' })).toMatchObject({ id: 'b' });
  });
});
