import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  useNutritionQueue,
  useEvaluationHistory,
  useCreateEvaluation,
  useUpdateEvaluation,
  useExercisePlans,
  useCreateExercisePlan,
  useUpdateExercisePlan,
} from '../hooks/useNutrition';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { IconClipboardHeart, IconSalad, IconX, IconPlus } from '@tabler/icons-react';
import '../styles/nutrition.css';

const ClientCard = ({ patient, onEvaluate, onPlan }) => {
  const days = Math.max(0, Math.ceil((new Date(patient.end_date) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{patient.first_name} {patient.last_name}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{patient.phone}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${patient.isFirstConsult ? 'bg-[rgba(34,197,94,0.15)] text-[var(--color-success)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--color-danger)]'}`}>
          {patient.consultType}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="rounded-full bg-[rgba(14,116,144,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]">{patient.plan_name}</span>
        {days > 0 && <span className="rounded-full bg-[rgba(226,154,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-secondary)]">{days} días</span>}
      </div>
      <div className="flex gap-3">
        <GymButton size="sm" variant="primary" className="flex-1" icon={<IconClipboardHeart size={16} />} onClick={() => onEvaluate(patient)}>Evaluar</GymButton>
        <GymButton size="sm" variant="secondary" className="flex-1" icon={<IconSalad size={16} />} onClick={() => onPlan(patient)}>Plan</GymButton>
      </div>
    </motion.div>
  );
};

const EvaluationRow = ({ evaluation, onEdit }) => {
  const date = new Date(evaluation.evaluation_date).toLocaleDateString('es-MX');
  const bmi = evaluation.height_cm ? (evaluation.weight_kg / ((evaluation.height_cm / 100) ** 2)).toFixed(1) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-lg)] border-l-4 border-[var(--color-secondary)] bg-[var(--color-card-alt)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{date}</p>
          {evaluation.is_free_consult && (
            <span className="mt-2 inline-flex rounded-full bg-[rgba(34,197,94,0.16)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">Primera consulta gratis</span>
          )}
        </div>
        <GymButton size="xs" variant="ghost" onClick={() => onEdit(evaluation)}>Editar</GymButton>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs text-[var(--color-text-muted)]">
        <div><p className="text-[var(--color-text)] font-semibold">Peso</p><p>{evaluation.weight_kg || '—'} kg</p></div>
        <div><p className="text-[var(--color-text)] font-semibold">Grasa</p><p>{evaluation.body_fat_pct || '—'}%</p></div>
        <div><p className="text-[var(--color-text)] font-semibold">IMC</p><p>{bmi}</p></div>
      </div>
      {evaluation.body_composition_notes && <p className="mt-3 text-sm italic text-[var(--color-text-muted)]">“{evaluation.body_composition_notes}”</p>}
    </motion.div>
  );
};

const ExerciseDayEditor = ({ day, content, onChange }) => {
  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
  };

  const dayContent = content[day] || { exercises: [] };

  const handleAddExercise = () => {
    const newExercises = [...(dayContent.exercises || []), { name: '', series: 3, reps: 10 }];
    onChange(day, { ...dayContent, exercises: newExercises });
  };

  const handleUpdateExercise = (index, field, value) => {
    const updated = [...dayContent.exercises];
    updated[index] = { ...updated[index], [field]: value };
    onChange(day, { ...dayContent, exercises: updated });
  };

  const handleRemoveExercise = (index) => {
    const updated = dayContent.exercises.filter((_, i) => i !== index);
    onChange(day, { ...dayContent, exercises: updated });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4">
      <h4 className="mb-3 text-base font-semibold text-[var(--color-text)]">{dayNames[day]}</h4>
      <div className="space-y-4">
        {dayContent.exercises?.map((exercise, idx) => (
          <div key={idx} className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Ejercicio {idx + 1}</label>
              <input
                type="text"
                value={exercise.name}
                onChange={(e) => handleUpdateExercise(idx, 'name', e.target.value)}
                placeholder="Ej: Flexiones"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Series</label>
              <input
                type="number"
                value={exercise.series}
                onChange={(e) => handleUpdateExercise(idx, 'series', Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Reps</label>
              <input
                type="number"
                value={exercise.reps}
                onChange={(e) => handleUpdateExercise(idx, 'reps', Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              />
            </div>
            <div className="flex items-center justify-end">
              <GymButton size="sm" variant="danger" icon={<IconX size={16} />} onClick={() => handleRemoveExercise(idx)} />
            </div>
          </div>
        ))}
        <GymButton size="sm" variant="secondary" onClick={handleAddExercise} className="w-full">+ Agregar Ejercicio</GymButton>
      </div>
    </div>
  );
};

export default function Nutrition() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [modalEvaluate, setModalEvaluate] = useState(false);
  const [modalPlan, setModalPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [evaluationTab, setEvaluationTab] = useState('composition'); // 'composition' or 'diet'
  const resetEvaluationForm = () => ({
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
    visceral_fat_pct: '',
    muscle_mass_kg: '',
    waist_cm: '',
    family_history: '',
    pathological_history: '',
    personal_history: '',
    body_composition_notes: '',
    diet_plan: '',
    caloric_target: '',
    protein_target_g: '',
    carbs_target_g: '',
    fat_target_g: '',
  });

  const [evaluationForm, setEvaluationForm] = useState(resetEvaluationForm());

  const [planForm, setPlanForm] = useState({
    monday: { exercises: [] },
    tuesday: { exercises: [] },
    wednesday: { exercises: [] },
    thursday: { exercises: [] },
    friday: { exercises: [] },
    saturday: { exercises: [] },
    notes: '',
  });

  const { data: queueResponse, isLoading: queueLoading } = useNutritionQueue();
  const { data: evaluationsResponse } = useEvaluationHistory(selectedPatient?.id);
  const { data: plansResponse } = useExercisePlans(selectedPatient?.id);
  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const createExercisePlan = useCreateExercisePlan();
  const updateExercisePlan = useUpdateExercisePlan();

  const queue = Array.isArray(queueResponse) ? queueResponse : queueResponse?.data || [];
  const history = Array.isArray(evaluationsResponse) ? evaluationsResponse : evaluationsResponse?.data || [];
  const plans = Array.isArray(plansResponse) ? plansResponse : plansResponse?.data || [];

  const handleEvaluate = (patient) => {
    setSelectedPatient(patient);
    setSelectedEvaluation(null);
    setEvaluationForm(resetEvaluationForm());
    setEvaluationTab('composition');
    setModalEvaluate(true);
  };

  const handleEditEvaluation = (evaluationItem) => {
    setSelectedEvaluation(evaluationItem);
    setEvaluationForm({
      weight_kg: evaluationItem.weight_kg || '',
      height_cm: evaluationItem.height_cm || '',
      body_fat_pct: evaluationItem.body_fat_pct || '',
      visceral_fat_pct: evaluationItem.visceral_fat_pct || '',
      muscle_mass_kg: evaluationItem.muscle_mass_kg || '',
      waist_cm: evaluationItem.waist_cm || '',
      family_history: evaluationItem.family_history || '',
      pathological_history: evaluationItem.pathological_history || '',
      personal_history: evaluationItem.personal_history || '',
      body_composition_notes: evaluationItem.body_composition_notes || '',
      diet_plan: evaluationItem.diet_plan || '',
      caloric_target: evaluationItem.caloric_target || '',
      protein_target_g: evaluationItem.protein_target_g || '',
      carbs_target_g: evaluationItem.carbs_target_g || '',
      fat_target_g: evaluationItem.fat_target_g || '',
    });
    setEvaluationTab('composition');
    setModalEvaluate(true);
  };

  const handlePlan = (patient) => {
    setSelectedPatient(patient);
    setSelectedEvaluation(null);
    setEditingPlan(null);
    setModalPlan(true);
  };

  const handleChangePlanDay = (day, content) => {
    setPlanForm((prev) => ({ ...prev, [day]: content }));
  };

  const handleSaveEvaluation = async () => {
    try {
      const payload = { ...evaluationForm, patient_id: selectedPatient?.id };
      if (selectedEvaluation) {
        await updateEvaluation.mutateAsync({ id: selectedEvaluation.id, body: payload });
      } else {
        await createEvaluation.mutateAsync(payload);
      }
      toast.success('Evaluación guardada');
      setModalEvaluate(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar evaluación');
    }
  };

  const handleSavePlan = async () => {
    try {
      const payload = { patient_id: selectedPatient?.id, plan: planForm };
      if (editingPlan) {
        await updateExercisePlan.mutateAsync({ id: editingPlan.id, body: payload });
      } else {
        await createExercisePlan.mutateAsync(payload);
      }
      toast.success('Plan guardado');
      setModalPlan(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar plan');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(226,154,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)]">Nutriología</div>
        <div>
          <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Gestión de consulta nutricional</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Administra la cola de pacientes, evaluaciones y planes con estilo premium.</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <GymCard title="Cola de pacientes" subtitle="Últimas llegadas" variant="default">
          <div className="space-y-4">
            {queueLoading ? (
              <p className="text-[var(--color-text-muted)]">Cargando pacientes...</p>
            ) : queue.length === 0 ? (
              <p className="text-[var(--color-text-muted)]">No hay pacientes en cola.</p>
            ) : (
              queue.map((patient) => (
                <ClientCard key={patient.id} patient={patient} onEvaluate={handleEvaluate} onPlan={handlePlan} />
              ))
            )}
          </div>
        </GymCard>

        <div className="space-y-6">
          <GymCard title="Evaluaciones recientes" variant="default">
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-[var(--color-text-muted)]">No hay evaluaciones recientes.</p>
              ) : (
                history.map((evaluation) => (
                  <EvaluationRow
                    key={evaluation.id}
                    evaluation={evaluation}
                    onEdit={(evaluationItem) => {
                      setSelectedEvaluation(evaluationItem);
                      setModalEvaluate(true);
                    }}
                  />
                ))
              )}
            </div>
          </GymCard>

          <GymCard title="Resumen rápido" variant="gold">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Evaluaciones</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-secondary)]">{history.length}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Planes activos</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-text)]">{plans.length}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-alt)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Pacientes hoy</p>
                <p className="mt-3 text-3xl font-bold text-[var(--color-success)]">{queue.length}</p>
              </div>
            </div>
          </GymCard>
        </div>
      </div>

      <GymModal isOpen={modalEvaluate} onClose={() => setModalEvaluate(false)} title={`Evaluación — ${selectedPatient?.first_name || 'Paciente'}`} width="lg">
        <div className="space-y-6">
          <div className="flex border-b border-[var(--color-border)] mb-4">
            <button
              className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'composition' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
              onClick={() => setEvaluationTab('composition')}
            >
              Composición Corporal
            </button>
            <button
              className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'diet' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
              onClick={() => setEvaluationTab('diet')}
            >
              Plan Nutricional
            </button>
          </div>

          {evaluationTab === 'composition' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Peso (kg)', key: 'weight_kg' },
                  { label: 'Altura (cm)', key: 'height_cm' },
                  { label: 'Grasa (%)', key: 'body_fat_pct' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Visceral (%)', key: 'visceral_fat_pct' },
                  { label: 'Masa muscular (kg)', key: 'muscle_mass_kg' },
                  { label: 'Cintura (cm)', key: 'waist_cm' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Antecedentes personales</label>
                  <textarea
                    rows={3}
                    value={evaluationForm.personal_history}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, personal_history: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas de composición</label>
                  <textarea
                    rows={3}
                    value={evaluationForm.body_composition_notes}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, body_composition_notes: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>
          )}

          {evaluationTab === 'diet' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Calorías (kcal)', key: 'caloric_target' },
                  { label: 'Proteína (g)', key: 'protein_target_g' },
                  { label: 'Carbos (g)', key: 'carbs_target_g' },
                  { label: 'Grasa (g)', key: 'fat_target_g' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Plan de Alimentación / Dieta</label>
                <textarea
                  rows={8}
                  placeholder="Ej: Desayuno: 2 huevos, Comida: 150g pollo..."
                  value={evaluationForm.diet_plan}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, diet_plan: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
            <GymButton variant="secondary" onClick={() => setModalEvaluate(false)}>Cancelar</GymButton>
            <GymButton variant="success" onClick={handleSaveEvaluation}>Guardar Evaluación</GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={modalPlan} onClose={() => setModalPlan(false)} title={`Plan de Ejercicio — ${selectedPatient?.first_name || 'Paciente'}`} width="full">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
              <ExerciseDayEditor key={day} day={day} content={planForm} onChange={handleChangePlanDay} />
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas nutricionales</label>
            <textarea
              rows={3}
              value={planForm.notes}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <GymButton variant="secondary" onClick={() => setModalPlan(false)}>Cancelar</GymButton>
            <GymButton variant="primary">Generar PDF</GymButton>
            <GymButton variant="success" onClick={handleSavePlan}>Guardar Plan</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}
