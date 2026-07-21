import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCalendar,
  IconClock,
  IconUser,
  IconPhone,
  IconCheck,
  IconX,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconStethoscope
} from '@tabler/icons-react';

export const TodayAgendaList = ({ 
  events = [], 
  patients = [], 
  onEventClick, 
  onStatusChange,
  selectedDate: propSelectedDate,
  onSelectDate
}) => {
  const navigate = useNavigate();
  const [internalDate, setInternalDate] = useState(new Date());
  const selectedDate = propSelectedDate || internalDate;
  const setSelectedDate = onSelectDate || setInternalDate;

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formattedDate = useMemo(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    const str = selectedDate.toLocaleDateString('es-MX', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [selectedDate]);

  // Robust filtering of events for selectedDate
  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => {
        if (!ev.start_at) return false;
        const evDate = new Date(ev.start_at);
        if (isNaN(evDate.getTime())) return false;
        return (
          evDate.getFullYear() === selectedDate.getFullYear() &&
          evDate.getMonth() === selectedDate.getMonth() &&
          evDate.getDate() === selectedDate.getDate()
        );
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  }, [events, selectedDate]);

  /* 
  =============================================================================
  COMENTADO PARA USO FUTURO (Filtros y Métricas avanzadas por estado)
  =============================================================================
  const stats = useMemo(() => {
    const total = dayEvents.length;
    const confirmadas = dayEvents.filter(e => e.status === 'confirmada').length;
    const pendientes = dayEvents.filter(e => e.status === 'programada' || e.status === 'espera').length;
    const realizadas = dayEvents.filter(e => e.status === 'realizada').length;
    return { total, confirmadas, pendientes, realizadas };
  }, [dayEvents]);

  const [filterStatus, setFilterStatus] = useState('todas');
  const filteredEvents = useMemo(() => {
    if (filterStatus === 'pendientes') {
      return dayEvents.filter(e => e.status === 'programada' || e.status === 'espera');
    }
    if (filterStatus === 'confirmadas') {
      return dayEvents.filter(e => e.status === 'confirmada');
    }
    if (filterStatus === 'realizadas') {
      return dayEvents.filter(e => e.status === 'realizada');
    }
    return dayEvents;
  }, [dayEvents, filterStatus]);
  =============================================================================
  */

  const changeDateOffset = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmada':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30 flex items-center gap-0.5">
            <IconCheck size={10} /> Confirmada
          </span>
        );
      case 'realizada':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-teal)]/15 text-[var(--color-teal)] border border-[var(--color-teal)]/30 flex items-center gap-0.5">
            <IconRefresh size={10} /> Realizada
          </span>
        );
      case 'en_curso':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30 animate-pulse flex items-center gap-0.5">
            <IconClock size={10} /> En Curso
          </span>
        );
      case 'espera':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30 flex items-center gap-0.5">
            <IconClock size={10} /> Espera
          </span>
        );
      case 'cancelada':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30 flex items-center gap-0.5">
            <IconX size={10} /> Cancelada
          </span>
        );
      case 'ausente':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-danger)]/25 text-[var(--color-danger)] border border-[var(--color-danger)]/40 flex items-center gap-0.5">
            <IconX size={10} /> Ausente
          </span>
        );
      case 'programada':
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30 flex items-center gap-0.5">
            <IconCalendar size={10} /> Programada
          </span>
        );
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'cita':
        return 'border-l-4 border-l-[var(--color-success)]';
      case 'reunion':
        return 'border-l-4 border-l-[var(--color-secondary)]';
      case 'videollamada':
        return 'border-l-4 border-l-[var(--color-gold)]';
      default:
        return 'border-l-4 border-l-[var(--color-accent)]';
    }
  };

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 space-y-3 flex flex-col h-full shadow-[var(--shadow-card)]">
      {/* Encabezado compacto */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/20">
              <IconCalendarEvent size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)] leading-tight">
                {isToday ? 'Agendas de Hoy' : 'Agendas del Día'}
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                {formattedDate}
              </p>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[var(--color-card-alt)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-secondary)]">
            Total: {dayEvents.length}
          </div>
        </div>

        {/* Barra de Selección de Fecha Compacta */}
        <div className="flex items-center justify-between bg-[var(--color-card-alt)] rounded-[var(--radius-md)] p-1 border border-[var(--color-border)] text-[11px]">
          <button
            onClick={() => changeDateOffset(-1)}
            className="p-1 hover:bg-[var(--color-border)]/50 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            title="Día anterior"
          >
            <IconChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-2 py-0.5 rounded-[var(--radius-sm)] font-semibold transition-colors ${isToday
                  ? 'bg-[var(--color-secondary)] text-white shadow-sm'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                setSelectedDate(tom);
              }}
              className={`px-2 py-0.5 rounded-[var(--radius-sm)] font-semibold transition-colors ${selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
                  ? 'bg-[var(--color-secondary)] text-white shadow-sm'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              Mañana
            </button>
          </div>

          <button
            onClick={() => changeDateOffset(1)}
            className="p-1 hover:bg-[var(--color-border)]/50 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            title="Día siguiente"
          >
            <IconChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Lista de Agendas */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px] scrollbar-thin">
        {dayEvents.length === 0 ? (
          <div className="text-center py-8 px-3 rounded-[var(--radius-md)] bg-[var(--color-card-alt)]/50 border border-dashed border-[var(--color-border)]">
            <IconCalendar size={32} className="mx-auto mb-1.5 opacity-40 text-[var(--color-text-muted)]" />
            <p className="text-xs font-semibold text-[var(--color-text)]">
              Sin agendas este día.
            </p>
          </div>
        ) : (
          dayEvents.map((ev) => {
            const patient = ev.patient_id ? patients.find((p) => p.id === ev.patient_id) : null;
            const startTime = new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = ev.end_at ? new Date(ev.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={`group relative p-2.5 rounded-[var(--radius-md)] bg-[var(--color-card-alt)] hover:bg-[var(--color-border)]/40 border border-[var(--color-border)] ${getTypeColor(
                  ev.event_type
                )} transition-all cursor-pointer shadow-sm`}
              >
                <div className="flex justify-between items-start gap-1.5">
                  {/* Hora y Título */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-secondary)]">
                      <IconClock size={12} className="shrink-0" />
                      <span>{startTime} {endTime ? `- ${endTime}` : ''}</span>
                    </div>

                    {/* Título (Comentado por requerimiento para evitar duplicar el nombre del paciente) */}
                    {/* <h4 className="font-bold text-xs text-[var(--color-text)] truncate group-hover:text-[var(--color-secondary)] transition-colors leading-tight">
                      {ev.title}
                    </h4> */}

                    {/* Datos del Paciente */}
                    {(patient || ev.phone) && (
                      <div className="flex flex-col gap-0.5 text-[11px] text-[var(--color-text-muted)] pt-0.5">
                        {patient && (
                          <div className="flex items-center gap-1 truncate" title={`Paciente: ${patient.first_name} ${patient.last_name}`}>
                            <IconUser size={11} className="shrink-0 text-[var(--color-text-muted)]" />
                            <span className="truncate font-medium text-[var(--color-text)]">{patient.first_name} {patient.last_name}</span>
                          </div>
                        )}
                        {/* Teléfono (Comentado por requerimiento) */}
                        {/* {(ev.phone || patient?.phone) && (
                          <div className="flex items-center gap-1 text-[10px]">
                            <IconPhone size={10} className="shrink-0 text-[var(--color-text-muted)]" />
                            <span>{ev.phone || patient?.phone}</span>
                          </div>
                        )} */}
                      </div>
                    )}
                  </div>

                  {/* Estado y Acciones Rápidas */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {getStatusBadge(ev.status)}

                    <div className="flex items-center gap-1 pt-0.5">
                      {patient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${patient.id}?tab=consult`);
                          }}
                          className="p-1 px-1.5 rounded-[var(--radius-sm)] bg-[var(--color-secondary)]/15 hover:bg-[var(--color-secondary)]/30 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30 transition-colors flex items-center gap-1 text-[10px] font-bold"
                          title={`Ir a Nueva Consulta de ${patient.first_name}`}
                        >
                          <IconStethoscope size={12} />
                          <span>Consulta</span>
                        </button>
                      )}

                      {onStatusChange && (
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {ev.status !== 'confirmada' && ev.status !== 'realizada' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(ev, 'confirmada');
                              }}
                              className="p-1 rounded bg-[var(--color-success)]/10 hover:bg-[var(--color-success)]/25 text-[var(--color-success)] transition-colors"
                              title="Confirmar"
                            >
                              <IconCheck size={12} />
                            </button>
                          )}
                          {ev.status !== 'realizada' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(ev, 'realizada');
                              }}
                              className="p-1 rounded bg-[var(--color-teal)]/10 hover:bg-[var(--color-teal)]/25 text-[var(--color-teal)] transition-colors"
                              title="Concretar/Realizada"
                            >
                              <IconRefresh size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
