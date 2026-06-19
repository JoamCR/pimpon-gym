import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePatients, useCreatePatient, useCreatePayment, validatePatientField } from '../hooks/usePatients';
import { useCreateAgenda } from '../hooks/useAgenda';
import { useEvaluationHistory, useCreateEvaluation } from '../hooks/useNutrition';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { ConsultModal } from '../components/ui/ConsultModal/ConsultModal';
import { PatientDetailsModal } from '../components/ui/ConsultModal/PatientDetailsModal';
import { HybridDateInput } from '../components/ui/HybridDateInput';
import { IconChevronUp, IconChevronDown, IconSelector, IconPlus, IconEye, IconChevronRight, IconCoin, IconStethoscope } from '@tabler/icons-react';

const HealthSlider = ({ label, value, onChange }) => {
  const getSegmentColor = (index, val) => {
    if (index > val) return 'bg-[var(--color-border)]';
    const colors = [
      'bg-red-600', 'bg-red-500', 'bg-orange-500', 'bg-orange-400', 
      'bg-yellow-500', 'bg-yellow-400', 'bg-lime-400', 'bg-lime-500', 
      'bg-green-400', 'bg-green-500'
    ];
    return colors[val - 1] || 'bg-gray-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{label}</label>
        <span className="text-sm font-bold text-[var(--color-text)]">{value} / 10</span>
      </div>
      <div className="flex gap-1 h-3 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div 
            key={i} 
            className={`flex-1 rounded-sm cursor-pointer transition-colors duration-300 ${getSegmentColor(i, value)}`}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default function Patients() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewPatientModal, setViewPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedConsultation, setExpandedConsultation] = useState(null);

  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    email: '',
    rfc: '',
    occupation: '',
    referred_by: '',
    quick_weight_kg: '',
    quick_height_cm: '',
    quick_goal: '',
    quick_health_notes: ''
  });

  const { data, isLoading } = usePatients({ search: searchQuery });
  const patients = Array.isArray(data) ? data : data?.data || [];
  const createPatientMutation = useCreatePatient();
  const createEvaluationMutation = useCreateEvaluation();
  const createPaymentMutation = useCreatePayment();
  
  const { data: evaluationsData, isLoading: isLoadingEvaluations } = useEvaluationHistory(selectedPatient?.id);
  const evaluations = Array.isArray(evaluationsData?.data) ? evaluationsData.data : [];

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', notes: '' });

  const handleOpenPayment = (patient) => {
    setSelectedPatient(patient);
    setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
    setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    const payload = {
      entity_type: 'consultorio',
      patient_id: selectedPatient.id,
      amount: Number(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      payment_type: 'nutrition_consult',
      notes: paymentForm.notes
    };
    
    if (!payload.amount || payload.amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    createPaymentMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Pago de consulta registrado exitosamente');
        setPaymentModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Error al registrar el pago');
      }
    });
  };

  const [consultModalOpen, setConsultModalOpen] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ event_type: 'cita', title: '', description: '', start_at: '', end_at: '' });
  const createAgendaMutation = useCreateAgenda();

  const handleOpenConsult = (patient) => {
    setSelectedPatient(patient);
    setConsultModalOpen(true);
  };

  const handleSaveConsult = async (payload) => {
    const cleanedPayload = {
      ...payload,
      entity_type: 'consultorio',
    };

    ['weight_kg', 'height_cm', 'body_fat_pct', 'visceral_fat_pct', 'muscle_mass_kg', 'waist_cm', 'caloric_target', 'protein_target_g', 'carbs_target_g', 'fat_target_g'].forEach((key) => {
      if (cleanedPayload[key]) cleanedPayload[key] = Number(cleanedPayload[key]);
      else delete cleanedPayload[key];
    });

    Object.keys(cleanedPayload).forEach((key) => {
      if (cleanedPayload[key] === '') delete cleanedPayload[key];
    });

    try {
      await createEvaluationMutation.mutateAsync(cleanedPayload);
      toast.success('Expediente registrado exitosamente');
      setConsultModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar el expediente');
      throw error;
    }
  };

  const openModal = () => {
    setStep(1);
    setFieldErrors({});
    setFormData({
      first_name: '',
      last_name: '',
      age: '',
      gender: 'Masculino',
      phone: '',
      rfc: '',
      occupation: '',
      referred_by: '',
      quick_weight_kg: '',
      quick_height_cm: '',
      quick_goal: '',
      quick_health_notes: ''
    });
    setIsModalOpen(true);
  };

  const nextStep = () => {
    if (step === 3) {
      return submitForm();
    }
    setStep(step + 1);
  };

  const submitForm = () => {
    const payload = {
      ...formData,
      age: Number(formData.age),
    };
    
    // Sanitize empty strings
    if (!payload.email) delete payload.email;
    if (!payload.rfc) delete payload.rfc;
    if (!payload.occupation) delete payload.occupation;
    if (!payload.referred_by) delete payload.referred_by;
    if (!payload.quick_goal) delete payload.quick_goal;
    if (!payload.quick_health_notes) delete payload.quick_health_notes;
    
    if (payload.quick_weight_kg) payload.quick_weight_kg = Number(payload.quick_weight_kg);
    else delete payload.quick_weight_kg;

    if (payload.quick_height_cm) payload.quick_height_cm = Number(payload.quick_height_cm);
    else delete payload.quick_height_cm;

    createPatientMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Paciente registrado exitosamente');
        setIsModalOpen(false);
      },
      onError: (error) => {
        const msg = error.message || 'Error al registrar el paciente';
        if (msg.includes('número de teléfono')) {
          setFieldErrors({ phone: msg });
          setStep(1);
        } else if (msg.includes('RFC')) {
          setFieldErrors({ rfc: msg });
          setStep(1);
        } else {
          toast.error(msg);
        }
      },
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPatients = useMemo(() => {
    let sortableItems = [...patients];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'patientName') {
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [patients, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <IconChevronUp size={16} className="inline" /> : <IconChevronDown size={16} className="inline" />;
    }
    return <IconSelector size={16} className="inline" />;
  };

  const handleViewPatient = (patient) => {
    const slug = `${patient.first_name}-${patient.last_name || ''}`.replace(/\s+/g, '-').replace(/-$/, '');
    navigate(`/patients/${slug || patient.first_name}`);
  };

  const handleOpenPatientModal = (patient) => {
    setSelectedPatient(patient);
    setViewPatientModal(true);
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', key: 'first_name' },
            { label: 'Apellidos', key: 'last_name' },
            { label: 'Sexo', key: 'gender', type: 'select', options: ['Masculino', 'Femenino', 'Otro'] },
            { label: 'Teléfono', key: 'phone' },
            { label: 'Correo electrónico', key: 'email', type: 'email' },
            // { label: 'RFC', key: 'rfc' },
            
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key]}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.key]: e.target.value });
                    if (fieldErrors[field.key]) setFieldErrors({ ...fieldErrors, [field.key]: null });
                  }}
                  className={`w-full rounded-[var(--radius-md)] border ${fieldErrors[field.key] ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
                >
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.key]}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.key]: e.target.value });
                    if (fieldErrors[field.key]) setFieldErrors({ ...fieldErrors, [field.key]: null });
                  }}
                  onBlur={async (e) => {
                    if ((field.key === 'phone' || field.key === 'rfc') && e.target.value) {
                      try {
                        await validatePatientField(field.key, e.target.value);
                      } catch (error) {
                        setFieldErrors((prev) => ({ ...prev, [field.key]: error.message }));
                      }
                    }
                  }}
                  className={`w-full rounded-[var(--radius-md)] border ${fieldErrors[field.key] ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]`}
                />
              )}
              {fieldErrors[field.key] && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors[field.key]}</p>
              )}
            </div>
          ))}

          <div className="sm:col-span-2 mt-2">
            <HybridDateInput 
              value={formData.birth_date} 
              error={fieldErrors.birth_date}
              onChange={(dateStr, calculatedAge) => {
                setFormData({
                  ...formData,
                  birth_date: dateStr,
                  age: calculatedAge !== null ? calculatedAge.toString() : ''
                });
                if (fieldErrors.birth_date) setFieldErrors({ ...fieldErrors, birth_date: null });
              }} 
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            // { label: 'Ocupación', key: 'occupation' },
            { label: 'Referido por', key: 'referred_by' },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Peso (kg) - Opcional</label>
            <input
              type="number"
              value={formData.quick_weight_kg}
              onChange={(e) => setFormData({ ...formData, quick_weight_kg: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Estatura (cm) - Opcional</label>
            <input
              type="number"
              value={formData.quick_height_cm}
              onChange={(e) => setFormData({ ...formData, quick_height_cm: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
        </div>
        {[
          { label: 'Notas de salud (Evaluación rápida)', key: 'quick_health_notes', textarea: true },
          { label: 'Objetivo principal', key: 'quick_goal', textarea: true },
        ].map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
            {field.textarea ? (
              <textarea
                rows={3}
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            ) : (
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(22,163,74,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-success)]">Consultorio</div>
          <div>
            <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Administración de Pacientes</h1>
            <p className="text-[var(--color-text-muted)] mt-2">Gestiona el padrón de pacientes exclusivos del consultorio nutricional.</p>
          </div>
        </div>
        <GymButton icon={<IconPlus size={18} />} variant="primary" onClick={openModal}>Agregar Paciente</GymButton>
      </header>

      <GymCard title="Pacientes registrados" variant="default">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente..."
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('patientName')}>
                    Paciente {getSortIcon('patientName')}
                  </th>
                  <th className="px-4 py-4">Teléfono</th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('created_at')}>
                    Fecha Alta {getSortIcon('created_at')}
                  </th>
                  <th className="px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   <tr>
                     <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Cargando pacientes...</td>
                   </tr>
                ) : sortedPatients.map((patient, index) => (
                  <tr key={patient.id} className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-success)] text-white font-bold">{patient.first_name?.[0]}{patient.last_name?.[0]}</div>
                        <div>
                          <p 
                            className="font-semibold text-[var(--color-text)] cursor-pointer hover:underline"
                            onClick={() => handleViewPatient(patient)}
                          >
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">{patient.email || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{patient.phone}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text)]">{new Date(patient.created_at).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-4 space-x-2">
                      <GymButton size="xs" variant="secondary" icon={<IconEye size={16} />} onClick={() => handleOpenPatientModal(patient)}>Ver</GymButton>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedPatients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No se encontraron pacientes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GymCard>

      <GymModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Paciente" width="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Paso {step} de 3</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${(step / 3) * 100}%` }} />
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{step === 1 ? 'Datos personales' : step === 2 ? 'Datos adicionales' : 'Evaluación rápida'}</p>
          </div>

          {renderStep()}

          <div className="flex justify-between gap-3">
            <GymButton variant="secondary" onClick={() => setStep(Math.max(step - 1, 1))} disabled={step === 1}>Atrás</GymButton>
            <GymButton variant="primary" onClick={nextStep}>
              {step < 3 ? 'Siguiente' : 'Registrar paciente'}
            </GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Pago de Consulta — ${selectedPatient?.first_name || 'Paciente'}`} width="sm">
        <div className="space-y-4 text-[var(--color-text)]">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Monto ($)</label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              placeholder="Ej. 500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de Pago</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              {/* <option value="card">Tarjeta</option> */}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas (opcional)</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              placeholder="Detalles del pago"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
            <GymButton variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancelar</GymButton>
            <GymButton variant="success" onClick={handleSavePayment}>Registrar Pago</GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title={`Agendar Cita — ${selectedPatient?.first_name || ''}`} width="sm">
        <div className="space-y-4 text-[var(--color-text)]">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Título</label>
            <input value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Inicio</label>
            <input type="datetime-local" value={scheduleForm.start_at} onChange={(e) => setScheduleForm({ ...scheduleForm, start_at: e.target.value })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Fin</label>
            <input type="datetime-local" value={scheduleForm.end_at} onChange={(e) => setScheduleForm({ ...scheduleForm, end_at: e.target.value })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <GymButton variant="secondary" onClick={() => setScheduleModalOpen(false)}>Cancelar</GymButton>
            <GymButton variant="primary" onClick={async () => {
              try {
                await createAgendaMutation.mutateAsync({
                  event_type: 'cita',
                  title: scheduleForm.title,
                  description: scheduleForm.description,
                  patient_id: selectedPatient.id,
                  start_at: new Date(scheduleForm.start_at).toISOString(),
                  end_at: scheduleForm.end_at ? new Date(scheduleForm.end_at).toISOString() : null,
                });
                setScheduleModalOpen(false);
                setViewPatientModal(false);
              } catch (err) {
                console.error(err);
                alert(err.message || 'Error al agendar cita');
              }
            }}>Agendar</GymButton>
          </div>
        </div>
      </GymModal>

            <ConsultModal
        isOpen={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        title={"Nueva Consulta — " + (selectedPatient?.first_name || "Paciente")}
        patient={selectedPatient}
        onSubmit={handleSaveConsult}
        submitLabel="Guardar Expediente"
      />

      <PatientDetailsModal
        isOpen={viewPatientModal}
        onClose={() => setViewPatientModal(false)}
        patient={selectedPatient}
        evaluations={evaluations}
        isLoadingEvaluations={isLoadingEvaluations}
        onNewConsult={() => {
          setViewPatientModal(false);
          setConsultModalOpen(true);
        }}
        onPayment={() => {
          setViewPatientModal(false);
          setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
          setPaymentModalOpen(true);
        }}
        onSchedule={() => {
          setViewPatientModal(false);
          setScheduleModalOpen(true);
        }}
      />
    </div>
  );
}         