import { useState, useMemo, useEffect, useRef } from 'react';
import { GymModal } from './GymModal';
import { GymButton } from './GymButton';
import { SimpleDateInput } from './SimpleDateInput';

const eventStatusOptions = ['programada','confirmada','en_cita','realizada','cancelada','ausente','espera','en_curso'];

const CustomComboBox = ({ value, onChange, onBlur, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    return (
      <div className="relative flex items-stretch" ref={wrapperRef}>
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={() => setIsOpen(true)}
          onBlur={onBlur}
          className="w-16 rounded-l-md border border-r-0 border-[var(--color-border)] bg-[var(--color-card-alt)] px-2 py-2 text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)]"
          placeholder={placeholder}
        />
        <button
          type="button"
          tabIndex="-1"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center rounded-r-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        
        {isOpen && (
          <ul className="absolute top-full left-0 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] shadow-lg z-[60] py-1 scrollbar-thin">
            {options.map((opt) => (
              <li
                key={opt}
                className="cursor-pointer px-3 py-1.5 text-center text-sm hover:bg-[rgba(255,255,255,0.05)]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ target: { value: opt } });
                  setIsOpen(false);
                  if (onBlur) setTimeout(onBlur, 0);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
};
  
const TimePicker = ({ dateStr, onChange }) => {
const [datePart, timePart] = dateStr ? dateStr.split('T') : ['', '00:00:00'];
const [h, m] = timePart.split(':');

let initialH24 = parseInt(h || '0', 10);
let isPM = initialH24 >= 12;
let initialH12 = initialH24 % 12 || 12;

const [hour, setHour] = useState(String(initialH12));
const [minute, setMinute] = useState(m || '00');
const [ampm, setAmpm] = useState(isPM ? 'PM' : 'AM');

useEffect(() => {
    if (dateStr) {
    const parts = dateStr.split('T');
    if (parts.length > 1) {
        const t = parts[1];
        const [hh, mm] = t.split(':');
        const h24 = parseInt(hh, 10);
        const parsedH12 = h24 % 12 || 12;
        const parsedAmPm = h24 >= 12 ? 'PM' : 'AM';
        
        if (parseInt(hour, 10) !== parsedH12 || isNaN(parseInt(hour, 10))) {
        setHour(String(parsedH12));
        }
        if (parseInt(minute, 10) !== parseInt(mm, 10) || isNaN(parseInt(minute, 10))) {
        setMinute(mm);
        }
        if (ampm !== parsedAmPm) {
        setAmpm(parsedAmPm);
        }
    }
    }
}, [dateStr, hour, minute, ampm]);

const handleUpdate = (newHour, newMinute, newAmpm) => {
    let h12 = parseInt(newHour, 10);
    if (isNaN(h12)) h12 = 12; 
    let h24 = h12;
    if (newAmpm === 'PM' && h24 !== 12) h24 += 12;
    if (newAmpm === 'AM' && h24 === 12) h24 = 0;
    
    let mInt = parseInt(newMinute, 10);
    if (isNaN(mInt)) mInt = 0;
    
    const hh = String(h24).padStart(2, '0');
    const mmStr = String(mInt).padStart(2, '0');
    onChange(`${datePart}T${hh}:${mmStr}:00`);
};

const handleHourChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setHour(val);
    if (val !== '') handleUpdate(val, minute, ampm);
};

const handleMinChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setMinute(val);
    if (val !== '') handleUpdate(hour, val, ampm);
};

const handleMinBlur = () => {
    if (minute !== '') {
    setMinute(String(parseInt(minute, 10)).padStart(2, '0'));
    }
};

const handleAmpmChange = (e) => {
    const val = e.target.value;
    setAmpm(val);
    handleUpdate(hour, minute, val);
};

return (
    <div className="flex items-center gap-1.5">
    <CustomComboBox
        value={hour}
        onChange={handleHourChange}
        options={Array.from({ length: 12 }, (_, i) => String(i + 1))}
        placeholder="HH"
    />
    <span className="text-lg font-bold self-center text-[var(--color-text-muted)]">:</span>
    <CustomComboBox
        value={minute}
        onChange={handleMinChange}
        onBlur={handleMinBlur}
        options={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
        placeholder="MM"
    />
    <select
        value={ampm}
        onChange={handleAmpmChange}
        className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-2 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
    >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
    </select>
    </div>
);
};

export const ScheduleAppointmentModal = ({ isOpen, onClose, onSubmit, initialFormState, patients = [] }) => {
    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        setForm(initialFormState);
    }, [initialFormState]);

    const handlePatientSelection = (patientId) => {
        const patient = patients.find((p) => String(p.id) === String(patientId));
        setForm((prev) => ({
          ...prev,
          patient_id: patientId || null,
          title: patient ? `Cita — ${patient.first_name} ${patient.last_name}` : prev.title,
          phone: patient?.phone || prev.phone,
        }));
    };

    const handleSubmit = () => {
        if (!form.title || form.title.trim() === '') {
            alert('Por favor, ingresa un título para el evento.');
            return;
        }
        onSubmit(form);
    };

    const combineDateTime = (dateStr, timeStr) => {
        if (!dateStr) return '';
        const timePart = timeStr ? timeStr.split('T')[1] || '00:00:00' : '00:00:00';
        return `${dateStr}T${timePart}`;
    };
    
    const splitDateTime = (dateTimeStr) => {
        if (!dateTimeStr || !dateTimeStr.includes('T')) return [dateTimeStr, ''];
        const [datePart, timePart] = dateTimeStr.split('T');
        return [datePart, timePart ? `${datePart}T${timePart}` : ''];
    };

    return (
        <GymModal isOpen={isOpen} onClose={onClose} title={form.event_type === 'cita' ? 'Agendar Cita' : `Nueva ${form.event_type}`} width="lg">
            <div className="space-y-6 text-[var(--color-text)]">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Tipo de agenda</label>
                        <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]">
                            <option value="cita">Cita</option>
                            <option value="reunion">Reunión</option>
                            <option value="videollamada">Videollamada</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Estado</label>
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]">
                            {eventStatusOptions.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-[var(--color-text-muted)]">Título</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                </div>

                {form.event_type === 'cita' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Paciente</label>
                        <select value={form.patient_id || ''} onChange={(e) => handlePatientSelection(e.target.value)} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]">
                        <option value="">Seleccionar paciente</option>
                        {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.phone || 'Sin teléfono'}</option>
                        ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Teléfono</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                    </div>
                    </div>
                )}

                {(form.event_type === 'videollamada' || form.event_type === 'reunion' || form.event_type === 'otro') && (
                    <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Razón</label>
                        <input value={form.metadata.reason} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, reason: e.target.value } })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Con quién</label>
                        <input value={form.metadata.with_whom} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, with_whom: e.target.value } })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                    </div>
                    </div>
                )}

                {(form.event_type === 'videollamada' || form.event_type === 'reunion') && (
                    <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Medio</label>
                        <input value={form.metadata.medium} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, medium: e.target.value } })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)]">Lugar / Plataforma</label>
                        <input value={form.metadata.location} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, location: e.target.value } })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                    </div>
                    </div>
                )}

                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Fecha de inicio</label>
                        <SimpleDateInput 
                        value={splitDateTime(form.start_at)[0]}
                        onChange={(date) => setForm(prev => ({ ...prev, start_at: combineDateTime(date, prev.start_at) }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Hora de inicio</label>
                        <TimePicker
                        dateStr={form.start_at}
                        onChange={(newVal) => setForm({ ...form, start_at: newVal })}
                        />
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-[var(--color-text-muted)]">Notas adicionales</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                </div>
                
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Fecha Recordatorio</label>
                        <SimpleDateInput 
                        value={splitDateTime(form.metadata.reminder_at)[0]}
                        onChange={(date) => setForm(prev => ({ ...prev, metadata: { ...prev.metadata, reminder_at: combineDateTime(date, prev.metadata.reminder_at) } }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Hora Recordatorio</label>
                        <TimePicker
                        dateStr={form.metadata.reminder_at}
                        onChange={(newVal) => setForm(prev => ({ ...prev, metadata: { ...prev.metadata, reminder_at: newVal } }))}
                        />
                    </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <GymButton variant="secondary" onClick={onClose}>Cancelar</GymButton>
                    <GymButton variant="primary" onClick={handleSubmit}>Guardar</GymButton>
                </div>
            </div>
        </GymModal>
    );
};
