import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { GymModal } from './GymModal';
import { GymButton } from './GymButton';
import { HybridDateInput } from './HybridDateInput';
import { useCreatePatient, validatePatientField } from '../../hooks/usePatients';

export const AgregarPaciente = ({ isOpen, onClose, onPatientCreated }) => {
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const createPatientMutation = useCreatePatient();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    birth_date: '',
    age: '',
    referred_by: '',
    family_history: '',
    pathological_history: '',
    personal_history: '',
    quick_weight_kg: '',
    quick_height_cm: '',
    quick_goal: '',
    quick_health_notes: ''
  });

  const resetForm = () => {
    setStep(1);
    setFieldErrors({});
    setFormData({
      first_name: '',
      last_name: '',
      gender: 'Masculino',
      phone: '',
      email: '',
      birth_date: '',
      age: '',
      referred_by: '',
      family_history: '',
      pathological_history: '',
      personal_history: '',
      quick_weight_kg: '',
      quick_height_cm: '',
      quick_goal: '',
      quick_health_notes: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const submitForm = async () => {
    if (!formData.first_name || formData.first_name.trim() === '') {
      setFieldErrors({ first_name: 'El nombre es obligatorio' });
      setStep(1);
      return;
    }

    const healthNotesParts = [];
    if (formData.family_history) healthNotesParts.push(`Antecedentes familiares: ${formData.family_history}`);
    if (formData.pathological_history) healthNotesParts.push(`Antecedentes patológicos: ${formData.pathological_history}`);
    if (formData.personal_history) healthNotesParts.push(`Antecedentes personales: ${formData.personal_history}`);
    if (formData.quick_health_notes) healthNotesParts.push(formData.quick_health_notes);

    const payload = {
      ...formData,
      quick_health_notes: healthNotesParts.join('\n\n'),
      age: formData.age ? Number(formData.age) : undefined,
    };
    
    // Sanitize empty strings
    if (!payload.email) delete payload.email;
    if (!payload.birth_date) delete payload.birth_date;
    if (!payload.referred_by) delete payload.referred_by;
    if (!payload.quick_goal) delete payload.quick_goal;
    
    if (payload.quick_weight_kg) payload.quick_weight_kg = Number(payload.quick_weight_kg);
    else delete payload.quick_weight_kg;

    if (payload.quick_height_cm) payload.quick_height_cm = Number(payload.quick_height_cm);
    else delete payload.quick_height_cm;

    try {
      const response = await createPatientMutation.mutateAsync(payload);
      const createdPatient = response?.data || response;
      toast.success('Paciente registrado exitosamente');
      
      if (onPatientCreated) {
        onPatientCreated(createdPatient);
      }
      handleClose();
    } catch (error) {
      const msg = error.message || 'Error al registrar el paciente';
      if (msg.includes('número de teléfono')) {
        setFieldErrors({ phone: msg });
        setStep(1);
      } else {
        toast.error(msg);
      }
    }
  };

  const nextStep = () => {
    if (step === 2) {
      return submitForm();
    }
    if (!formData.first_name || formData.first_name.trim() === '') {
      setFieldErrors({ first_name: 'El nombre es obligatorio' });
      return;
    }
    setStep(step + 1);
  };

  return (
    <GymModal isOpen={isOpen} onClose={handleClose} title="Registrar Nuevo Paciente" width="lg">
      <div className="space-y-6 text-[var(--color-text)]">
        {/* Barra de Progreso */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Paso {step} de 2</p>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
              <div 
                className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-300" 
                style={{ width: `${(step / 2) * 100}%` }} 
              />
            </div>
          </div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {step === 1 ? 'Datos personales' : 'Antecedentes y medidas'}
          </p>
        </div>

        {/* Formulario */}
        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Nombre *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => {
                  setFormData({ ...formData, first_name: e.target.value });
                  if (fieldErrors.first_name) setFieldErrors({ ...fieldErrors, first_name: null });
                }}
                className={`w-full rounded-[var(--radius-md)] border ${fieldErrors.first_name ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]`}
                placeholder="Nombre(s)"
              />
              {fieldErrors.first_name && <p className="text-red-500 text-xs">{fieldErrors.first_name}</p>}
            </div>

            {/* Apellidos */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Apellidos</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Apellidos"
              />
            </div>

            {/* Sexo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Sexo</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Teléfono</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: null });
                }}
                onBlur={async (e) => {
                  if (e.target.value) {
                    try {
                      await validatePatientField('phone', e.target.value);
                    } catch (err) {
                      setFieldErrors((prev) => ({ ...prev, phone: err.message }));
                    }
                  }
                }}
                className={`w-full rounded-[var(--radius-md)] border ${fieldErrors.phone ? 'border-red-500' : 'border-[var(--color-border)]'} bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]`}
                placeholder="Ej. 5512345678"
              />
              {fieldErrors.phone && <p className="text-red-500 text-xs">{fieldErrors.phone}</p>}
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Correo electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Fecha de Nacimiento / Edad */}
            <div className="sm:col-span-2">
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
        ) : (
          <div className="space-y-4">
            {/* 1. Peso y Estatura */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Peso (kg)</label>
                <input
                  type="number"
                  value={formData.quick_weight_kg}
                  onChange={(e) => setFormData({ ...formData, quick_weight_kg: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                  placeholder="70.5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Estatura (cm)</label>
                <input
                  type="number"
                  value={formData.quick_height_cm}
                  onChange={(e) => setFormData({ ...formData, quick_height_cm: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                  placeholder="175"
                />
              </div>
            </div>

            {/* 2. Objetivo Principal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Objetivo Principal</label>
              <textarea
                rows={2}
                value={formData.quick_goal}
                onChange={(e) => setFormData({ ...formData, quick_goal: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Pérdida de grasa, ganancia muscular, etc."
              />
            </div>

            {/* 3. Antecedentes Familiares */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Antecedentes familiares</label>
              <textarea
                rows={2}
                value={formData.family_history}
                onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Diabetes, hipertensión, cardiopatías en la familia..."
              />
            </div>

            {/* 4. Antecedentes Patológicos */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Antecedentes patológicos</label>
              <textarea
                rows={2}
                value={formData.pathological_history}
                onChange={(e) => setFormData({ ...formData, pathological_history: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Enfermedades previas, cirugías, alergias..."
              />
            </div>

            {/* 5. Antecedentes Personales */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Antecedentes personales</label>
              <textarea
                rows={2}
                value={formData.personal_history}
                onChange={(e) => setFormData({ ...formData, personal_history: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Estilo de vida, actividad física, hábitos..."
              />
            </div>

            {/* 6. Notas Adicionales de Salud */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Notas adicionales de salud</label>
              <textarea
                rows={2}
                value={formData.quick_health_notes}
                onChange={(e) => setFormData({ ...formData, quick_health_notes: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
                placeholder="Padecimientos o notas relevantes"
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
          <GymButton variant="secondary" onClick={step === 1 ? handleClose : () => setStep(1)}>
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </GymButton>
          <GymButton 
            variant="primary" 
            onClick={nextStep}
            disabled={createPatientMutation.isPending}
          >
            {createPatientMutation.isPending 
              ? 'Guardando...' 
              : step < 2 ? 'Siguiente' : 'Registrar Paciente'
            }
          </GymButton>
        </div>
      </div>
    </GymModal>
  );
};
