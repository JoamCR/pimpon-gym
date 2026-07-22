import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { GymModal } from '../GymModal';
import { GymButton } from '../GymButton';
import { IconEdit } from '@tabler/icons-react';
import { useUpdatePatient } from '../../../hooks/usePatients';

export const parseAntecedentes = (notesStr) => {
  if (!notesStr) return { family: null, pathological: null, personal: null, other: null };
  
  let family = null;
  let pathological = null;
  let personal = null;
  let other = [];

  const blocks = notesStr.split('\n\n');
  blocks.forEach(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('Antecedentes familiares:')) {
      family = trimmed.replace('Antecedentes familiares:', '').trim();
    } else if (trimmed.startsWith('Antecedentes patológicos:')) {
      pathological = trimmed.replace('Antecedentes patológicos:', '').trim();
    } else if (trimmed.startsWith('Antecedentes personales:')) {
      personal = trimmed.replace('Antecedentes personales:', '').trim();
    } else if (trimmed.startsWith('Notas adicionales:')) {
      other.push(trimmed.replace('Notas adicionales:', '').trim());
    } else if (trimmed) {
      other.push(trimmed);
    }
  });

  return {
    family,
    pathological,
    personal,
    other: other.join('\n\n') || null
  };
};

export function PatientDetailsContent({ patient, evaluations = [], isLoadingEvaluations = false, showHistory = true }) {
  if (!patient) return null;

  const antecedenteData = parseAntecedentes(patient.quick_health_notes);

  return (
    <div className="space-y-4 text-[var(--color-text)]">
      <div className="grid grid-cols-2 gap-4">
        {/* 1. Nombre Completo */}
        <div className="col-span-2">
          <p className="text-sm text-[var(--color-text-muted)] font-semibold">Nombre Completo</p>
          <p className="font-medium text-base">{patient.first_name} {patient.last_name}</p>
        </div>

        {/* 2. Sexo y Edad */}
        <div>
          <p className="text-sm text-[var(--color-text-muted)] font-semibold">Sexo</p>
          <p className="font-medium text-base">{patient.gender || patient.sex || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--color-text-muted)] font-semibold">Edad</p>
          <p className="font-medium text-base">{patient.age ? `${patient.age} años` : 'N/A'}</p>
        </div>

        {/* 3. Correo Electrónico y Teléfono */}
        <div>
          <p className="text-sm text-[var(--color-text-muted)] font-semibold">Correo electrónico</p>
          <p className="font-medium text-base">{patient.email || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--color-text-muted)] font-semibold">Teléfono</p>
          <p className="font-medium text-base">{patient.phone || 'N/A'}</p>
        </div>

        {/* 6. Medidas */}
        <div className="col-span-2 space-y-1.5 pt-2 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Medidas</p>
          <div className="grid grid-cols-2 gap-3 text-sm bg-[var(--color-surface)] p-3 rounded-md border border-[var(--color-border)]">
            <div><span className="font-semibold text-[var(--color-text-muted)]">Peso:</span> <span className="font-bold text-[var(--color-text)]">{patient.quick_weight_kg ? `${patient.quick_weight_kg} kg` : 'N/A'}</span></div>
            <div><span className="font-semibold text-[var(--color-text-muted)]">Estatura:</span> <span className="font-bold text-[var(--color-text)]">{patient.quick_height_cm ? `${patient.quick_height_cm} cm` : 'N/A'}</span></div>
          </div>
        </div>

        {/* 7. Objetivo */}
        <div className="col-span-2 space-y-1.5 pt-2 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Objetivo</p>
          <div className="bg-[var(--color-surface)] p-3 rounded-md border border-[var(--color-border)] text-sm">
            <p className="font-bold text-[var(--color-success)]">{patient.quick_goal || 'N/A'}</p>
          </div>
        </div>

        {/* 8. Antecedentes Clínicos */}
        <div className="col-span-2 space-y-2 pt-2 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Antecedentes Clínicos</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[var(--color-surface)] p-2.5 rounded-md border border-[var(--color-border)]">
              <span className="font-bold text-[var(--color-text-muted)] block mb-0.5">Familiares</span>
              <p className="text-sm whitespace-pre-line text-[var(--color-text)]">{antecedenteData.family || 'Sin registro'}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-2.5 rounded-md border border-[var(--color-border)]">
              <span className="font-bold text-[var(--color-text-muted)] block mb-0.5">Patológicos</span>
              <p className="text-sm whitespace-pre-line text-[var(--color-text)]">{antecedenteData.pathological || 'Sin registro'}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-2.5 rounded-md border border-[var(--color-border)]">
              <span className="font-bold text-[var(--color-text-muted)] block mb-0.5">Personales</span>
              <p className="text-sm whitespace-pre-line text-[var(--color-text)]">{antecedenteData.personal || 'Sin registro'}</p>
            </div>
          </div>
        </div>

        {/* 9. Notas de Salud */}
        <div className="col-span-2 space-y-2 pt-2 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Notas de Salud</p>
          <div className="bg-[var(--color-surface)] p-3 rounded-md border border-[var(--color-border)]">
            <p className="text-sm whitespace-pre-line text-[var(--color-text)]">{antecedenteData.other || 'Sin notas de salud adicionales'}</p>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="pt-4 border-t border-[var(--color-border)] mt-4">
          <h3 className="text-lg font-bold mb-3 text-[var(--color-text)]">Historial de Consultas</h3>
          {isLoadingEvaluations ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando consultas...</p>
          ) : evaluations.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="p-3 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-surface)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      {new Date(evaluation.evaluation_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-[rgba(15,62,96,0.1)] text-[var(--color-secondary)]">
                      {evaluation.is_free_consult ? 'Gratis' : 'Regular'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-[var(--color-text-muted)]">
                    <div><span className="font-medium">Peso:</span> {evaluation.weight_kg || '—'} kg</div>
                    <div><span className="font-medium">Grasa:</span> {evaluation.body_fat_pct || '—'}%</div>
                    <div>
                      <span className="font-medium">IMC:</span> {evaluation.height_cm && evaluation.weight_kg ? (evaluation.weight_kg / ((evaluation.height_cm / 100) ** 2)).toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">El paciente no tiene consultas registradas.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function PatientDetailsModal({
  isOpen,
  onClose,
  patient,
  evaluations = [],
  isLoadingEvaluations = false,
  initialMode = 'view',
}) {
  if (!patient) return null;

  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const updatePatientMutation = useUpdatePatient();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    age: '',
    quick_weight_kg: '',
    quick_height_cm: '',
    quick_goal: '',
    family_history: '',
    pathological_history: '',
    personal_history: '',
    quick_health_notes: '',
  });

  useEffect(() => {
    if (patient) {
      const antecedenteData = parseAntecedentes(patient.quick_health_notes);
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        gender: patient.gender || patient.sex || 'Masculino',
        phone: patient.phone || '',
        email: patient.email || '',
        age: patient.age ? String(patient.age) : '',
        quick_weight_kg: patient.quick_weight_kg ? String(patient.quick_weight_kg) : '',
        quick_height_cm: patient.quick_height_cm ? String(patient.quick_height_cm) : '',
        quick_goal: patient.quick_goal || '',
        family_history: antecedenteData.family || '',
        pathological_history: antecedenteData.pathological || '',
        personal_history: antecedenteData.personal || '',
        quick_health_notes: antecedenteData.other || '',
      });
      setIsEditing(initialMode === 'edit');
    }
  }, [patient, isOpen, initialMode]);

  const handleSaveEdit = async () => {
    if (!formData.first_name || formData.first_name.trim() === '') {
      toast.error('El nombre es obligatorio');
      return;
    }

    const healthNotesParts = [];
    if (formData.family_history) healthNotesParts.push(`Antecedentes familiares: ${formData.family_history}`);
    if (formData.pathological_history) healthNotesParts.push(`Antecedentes patológicos: ${formData.pathological_history}`);
    if (formData.personal_history) healthNotesParts.push(`Antecedentes personales: ${formData.personal_history}`);
    if (formData.quick_health_notes) healthNotesParts.push(`Notas adicionales: ${formData.quick_health_notes}`);

    const payload = {
      id: patient.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email || undefined,
      age: formData.age ? Number(formData.age) : undefined,
      quick_weight_kg: formData.quick_weight_kg ? Number(formData.quick_weight_kg) : undefined,
      quick_height_cm: formData.quick_height_cm ? Number(formData.quick_height_cm) : undefined,
      quick_goal: formData.quick_goal || undefined,
      quick_health_notes: healthNotesParts.join('\n\n') || undefined,
    };

    try {
      await updatePatientMutation.mutateAsync(payload);
      toast.success('Paciente actualizado exitosamente');
      setIsEditing(false);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar el paciente');
    }
  };

  return (
    <GymModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Paciente — ${patient.first_name} ${patient.last_name}` : `Detalles del Paciente — ${patient.first_name} ${patient.last_name}`}
      width="lg"
    >
      {isEditing ? (
        <div className="space-y-4 text-[var(--color-text)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 1. Nombre Completo */}
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Nombre Completo *</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Nombre(s)"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
                />
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Apellidos"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
                />
              </div>
            </div>

            {/* 2. Sexo y Edad */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Sexo</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Edad</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Edad"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </div>

            {/* 3. Correo Electrónico y Teléfono */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Correo electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Teléfono</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Teléfono"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </div>

            {/* 4. Medidas */}
            <div className="col-span-2 space-y-1.5 pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Medidas</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={formData.quick_weight_kg}
                    onChange={(e) => setFormData({ ...formData, quick_weight_kg: e.target.value })}
                    placeholder="70"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Estatura (cm)</label>
                  <input
                    type="number"
                    value={formData.quick_height_cm}
                    onChange={(e) => setFormData({ ...formData, quick_height_cm: e.target.value })}
                    placeholder="175"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>

            {/* 5. Objetivo */}
            <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Objetivo Principal</label>
              <textarea
                rows={2}
                value={formData.quick_goal}
                onChange={(e) => setFormData({ ...formData, quick_goal: e.target.value })}
                placeholder="Pérdida de grasa, ganancia muscular, etc."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </div>

            {/* 6. Antecedentes Clínicos */}
            <div className="col-span-2 space-y-2 pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Antecedentes Clínicos</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Familiares</label>
                  <textarea
                    rows={2}
                    value={formData.family_history}
                    onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                    placeholder="Antecedentes familiares..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-xs text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Patológicos</label>
                  <textarea
                    rows={2}
                    value={formData.pathological_history}
                    onChange={(e) => setFormData({ ...formData, pathological_history: e.target.value })}
                    placeholder="Antecedentes patológicos..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-xs text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Personales</label>
                  <textarea
                    rows={2}
                    value={formData.personal_history}
                    onChange={(e) => setFormData({ ...formData, personal_history: e.target.value })}
                    placeholder="Antecedentes personales..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-xs text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>

            {/* 7. Notas de Salud */}
            <div className="col-span-2 space-y-1 pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Notas de Salud</label>
              <textarea
                rows={2}
                value={formData.quick_health_notes}
                onChange={(e) => setFormData({ ...formData, quick_health_notes: e.target.value })}
                placeholder="Notas adicionales de salud..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>
      ) : (
        <PatientDetailsContent
          patient={patient}
          evaluations={evaluations}
          isLoadingEvaluations={isLoadingEvaluations}
        />
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)] mt-4">
        {isEditing ? (
          <>
            <GymButton variant="secondary" onClick={() => { setIsEditing(false); if (initialMode === 'edit') onClose(); }}>
              Cancelar
            </GymButton>
            <GymButton variant="primary" loading={updatePatientMutation.isPending} onClick={handleSaveEdit}>
              Guardar Cambios
            </GymButton>
          </>
        ) : (
          <>
            <GymButton variant="primary" icon={<IconEdit size={16} />} onClick={() => setIsEditing(true)}>
              Editar Paciente
            </GymButton>
            <GymButton variant="secondary" onClick={onClose}>
              Cerrar
            </GymButton>
          </>
        )}
      </div>
    </GymModal>
  );
}
