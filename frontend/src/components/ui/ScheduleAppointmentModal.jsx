import { useState, useMemo, useEffect, useRef } from 'react';
import { GymModal } from './GymModal';
import { GymButton } from './GymButton';
import { SimpleDateInput } from './SimpleDateInput';
import { IconSearch, IconUser, IconChevronDown, IconX, IconCheck } from '@tabler/icons-react';

const eventStatusOptions = ['programada','confirmada','en_cita','realizada','cancelada','ausente','espera','en_curso'];

const eventTypeOptions = [
    { value: 'cita', label: 'Cita' },
    { value: 'reunion', label: 'Reunión' },
    { value: 'videollamada', label: 'Videollamada' },
    { value: 'otro', label: 'Otro' },
];

const eventStatusOptionsList = eventStatusOptions.map(status => ({
    value: status,
    label: status.replace(/_/g, ' ')
}));

const CustomSelectDropdown = ({ value, onChange, options, placeholder = 'Seleccionar...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = useMemo(() => {
        return options.find(opt => typeof opt === 'object' ? String(opt.value) === String(value) : String(opt) === String(value));
    }, [options, value]);

    const getLabel = (opt) => {
        if (!opt) return placeholder;
        if (typeof opt === 'object') return opt.label;
        return String(opt).replace(/_/g, ' ');
    };

    const getValue = (opt) => {
        if (typeof opt === 'object') return opt.value;
        return opt;
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-left text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
                <span className="capitalize font-medium text-sm text-[var(--color-text)]">{getLabel(selectedOption)}</span>
                <IconChevronDown size={18} className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-alt)] shadow-2xl z-[70] overflow-hidden max-h-60 overflow-y-auto scrollbar-thin p-1 space-y-0.5">
                    {options.map((opt) => {
                        const optVal = getValue(opt);
                        const isSelected = String(optVal) === String(value);
                        return (
                            <button
                                key={String(optVal)}
                                type="button"
                                onClick={() => {
                                    onChange(optVal);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-md text-sm capitalize transition-colors flex items-center justify-between ${
                                    isSelected
                                        ? 'bg-[rgba(37,99,235,0.15)] text-[var(--color-primary)] font-semibold'
                                        : 'text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                            >
                                <span>{getLabel(opt)}</span>
                                {isSelected && <IconCheck size={16} className="text-[var(--color-primary)] shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const AmPmDropdown = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-20 shrink-0" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3 py-2 text-sm text-[var(--color-text)] font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
                <span>{value}</span>
                <IconChevronDown size={14} className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-alt)] shadow-xl z-[70] overflow-hidden p-1 space-y-0.5">
                    {['AM', 'PM'].map((opt) => {
                        const isSelected = value === opt;
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-center px-2 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-between ${
                                    isSelected
                                        ? 'bg-[rgba(37,99,235,0.15)] text-[var(--color-primary)] font-bold'
                                        : 'text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                            >
                                <span>{opt}</span>
                                {isSelected && <IconCheck size={14} className="text-[var(--color-primary)]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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
          className="w-16 rounded-l-md border border-r-0 border-[var(--color-border)] bg-[var(--color-card-alt)] px-2 py-2 text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] font-medium"
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
                className="cursor-pointer px-3 py-1.5 text-center text-sm hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text)]"
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

const PatientSelectDropdown = ({ patients = [], selectedPatientId, onSelectPatient }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const selectedPatient = useMemo(() => {
        return patients.find(p => String(p.id) === String(selectedPatientId));
    }, [patients, selectedPatientId]);

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return patients;
        const q = searchQuery.toLowerCase().trim();
        return patients.filter(p => {
            const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
            const phone = (p.phone || '').toLowerCase();
            return fullName.includes(q) || phone.includes(q);
        });
    }, [patients, searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-left text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
                <div className="flex items-center gap-2.5 truncate">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[rgba(37,99,235,0.15)] text-[var(--color-primary)] shrink-0">
                        <IconUser size={16} />
                    </div>
                    {selectedPatient ? (
                        <div className="truncate text-sm">
                            <span className="font-semibold text-[var(--color-text)]">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                            {selectedPatient.phone && (
                                <span className="text-xs text-[var(--color-text-muted)] ml-2">— {selectedPatient.phone}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[var(--color-text-muted)] text-sm">Seleccionar paciente...</span>
                    )}
                </div>
                <IconChevronDown size={18} className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-alt)] shadow-2xl z-[70] overflow-hidden flex flex-col max-h-72">
                    <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center gap-2">
                        <IconSearch size={18} className="text-[var(--color-text-muted)] shrink-0 ml-1" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none py-1"
                            autoFocus
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1">
                                <IconX size={16} />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin space-y-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                onSelectPatient('');
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                                !selectedPatientId ? 'bg-[rgba(37,99,235,0.15)] text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.04)]'
                            }`}
                        >
                            <span>Sin paciente seleccionado</span>
                            {!selectedPatientId && <IconCheck size={16} />}
                        </button>

                        {filteredPatients.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                                No se encontraron pacientes que coincidan.
                            </div>
                        ) : (
                            filteredPatients.map((p) => {
                                const isSelected = String(p.id) === String(selectedPatientId);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectPatient(p.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-[rgba(37,99,235,0.15)] text-[var(--color-primary)] font-semibold'
                                                : 'text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[var(--color-text-muted)]'}`}>
                                                {p.first_name ? p.first_name[0].toUpperCase() : 'P'}
                                            </div>
                                            <div className="truncate flex flex-col">
                                                <span className="truncate font-medium">{p.first_name} {p.last_name}</span>
                                                {p.phone && <span className="text-xs text-[var(--color-text-muted)]">{p.phone}</span>}
                                            </div>
                                        </div>
                                        {isSelected && <IconCheck size={16} className="text-[var(--color-primary)] shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
  
export const TimePicker = ({ dateStr, onChange }) => {
    const lastEmittedRef = useRef(dateStr);

    const parseDateTime = (str) => {
        if (!str || !str.includes('T')) return { h12: '9', min: '00', ampm: 'AM' };
        const [_, timePart] = str.split('T');
        const [hh, mm] = timePart.split(':');
        const h24 = parseInt(hh || '0', 10);
        const isPM = h24 >= 12;
        const h12 = h24 % 12 || 12;
        return {
            h12: String(h12),
            min: String(mm || '00').padStart(2, '0'),
            ampm: isPM ? 'PM' : 'AM',
        };
    };

    const parsed = useMemo(() => parseDateTime(dateStr), [dateStr]);

    const [hour, setHour] = useState(parsed.h12);
    const [minute, setMinute] = useState(parsed.min);
    const [ampm, setAmpm] = useState(parsed.ampm);

    useEffect(() => {
        if (dateStr !== lastEmittedRef.current) {
            const p = parseDateTime(dateStr);
            setHour(p.h12);
            setMinute(p.min);
            setAmpm(p.ampm);
            lastEmittedRef.current = dateStr;
        }
    }, [dateStr]);

    const emitChange = (hVal, mVal, ampmVal) => {
        if (!dateStr) return;
        const datePart = dateStr.split('T')[0];
        
        let h12 = parseInt(hVal, 10);
        if (isNaN(h12) || h12 < 1) h12 = 12;
        if (h12 > 12) h12 = 12;

        let h24 = h12;
        if (ampmVal === 'PM' && h24 !== 12) h24 += 12;
        if (ampmVal === 'AM' && h24 === 12) h24 = 0;

        let mInt = parseInt(mVal, 10);
        if (isNaN(mInt) || mInt < 0) mInt = 0;
        if (mInt > 59) mInt = 59;

        const hh = String(h24).padStart(2, '0');
        const mmStr = String(mInt).padStart(2, '0');
        const newStr = `${datePart}T${hh}:${mmStr}:00`;

        lastEmittedRef.current = newStr;
        onChange(newStr);
    };

    const handleHourChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) val = val.slice(0, 2);

        let num = parseInt(val, 10);
        if (!isNaN(num) && num > 12) {
            val = '12';
        }

        setHour(val);
        if (val !== '') {
            emitChange(val, minute, ampm);
        }
    };

    const handleHourBlur = () => {
        let h12 = parseInt(hour, 10);
        if (isNaN(h12) || h12 < 1) h12 = 12;
        if (h12 > 12) h12 = 12;
        const finalH = String(h12);
        setHour(finalH);
        emitChange(finalH, minute, ampm);
    };

    const handleMinChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        setMinute(val);
        if (val !== '') {
            emitChange(hour, val, ampm);
        }
    };

    const handleMinBlur = () => {
        let mInt = parseInt(minute, 10);
        if (isNaN(mInt) || mInt < 0) mInt = 0;
        if (mInt > 59) mInt = 59;
        const finalM = String(mInt).padStart(2, '0');
        setMinute(finalM);
        emitChange(hour, finalM, ampm);
    };

    const handleAmpmChange = (newAmpm) => {
        setAmpm(newAmpm);
        emitChange(hour, minute, newAmpm);
    };

    return (
        <div className="flex items-center gap-1.5">
            <CustomComboBox
                value={hour}
                onChange={handleHourChange}
                onBlur={handleHourBlur}
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
            <AmPmDropdown
                value={ampm}
                onChange={handleAmpmChange}
            />
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
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Tipo de agenda</label>
                        <CustomSelectDropdown
                            value={form.event_type}
                            onChange={(val) => setForm({ ...form, event_type: val })}
                            options={eventTypeOptions}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Estado</label>
                        <CustomSelectDropdown
                            value={form.status}
                            onChange={(val) => setForm({ ...form, status: val })}
                            options={eventStatusOptionsList}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-[var(--color-text-muted)]">Título</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]" />
                </div>

                {form.event_type === 'cita' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Paciente</label>
                        <PatientSelectDropdown
                            patients={patients}
                            selectedPatientId={form.patient_id}
                            onSelectPatient={handlePatientSelection}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--color-text-muted)] mb-1">Teléfono</label>
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
