import { useState } from 'react';
import { GymModal } from '../GymModal';
import { GymButton } from '../GymButton';
import RutinaGym from './RutinaGym';
import { PlanNutricionalPlatos } from './PlanNutricionalPlatos';

const getInitialEvaluation = () => ({
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
  smokes: false,
  smokes_description: '',
  drinks_alcohol: false,
  drinks_alcohol_description: '',
  uses_drugs: false,
  drugs_description: '',
  drinks_soda: false,
  drinks_soda_description: '',
  eats_junk_food: false,
  junk_food_description: '',
  energy_level: 5,
  bowel_movements: '',
  hunger_level: 5,
  sleep_quality: 5,
  concentration_level: 5,
  mood_level: 5,
  routine_adherence: 5,
  diet_adherence: 5,
  sp_notes: '',
  diet_plan: '',
  caloric_target: '',
  protein_target_g: '',
  carbs_target_g: '',
  fat_target_g: '',
});

const getInitialPlanForm = () => ({
  datosGenerales: {
    nombre: '',
    fechaInicio: '',
    fechaCambio: '',
    objetivo: '',
  },
  rutinas: undefined,
  cardio: {
    tipo: '',
    duracion: '',
    intensidad: '',
    frecuencia: '',
  },
  anotaciones: '',
  observaciones: '',
});

const normalizePlanForm = (plan) => {
  if (!plan) return getInitialPlanForm();

  if (plan.datosGenerales || plan.rutinas || plan.cardio || plan.anotaciones || plan.observaciones) {
    return {
      ...getInitialPlanForm(),
      ...plan,
      datosGenerales: {
        ...getInitialPlanForm().datosGenerales,
        ...(plan.datosGenerales || {}),
      },
      cardio: {
        ...getInitialPlanForm().cardio,
        ...(plan.cardio || {}),
      },
    };
  }

  return plan;
};

const HealthSlider = ({ label, value, readOnly, invertColors = false }) => {
  const getSegmentColor = (index, val) => {
    if (index > val) return 'bg-[var(--color-border)]';
    if (invertColors) {
      if (val <= 4) return 'bg-green-500';
      if (val <= 7) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (val <= 4) return 'bg-red-500';
    if (val <= 7) return 'bg-yellow-500';
    return 'bg-green-500';
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
            className={`flex-1 rounded-sm ${readOnly ? '' : 'cursor-pointer'} transition-colors duration-300 ${getSegmentColor(i, value)}`}
            onClick={() => !readOnly && onChange(i)}
          />
        ))}
      </div>
    </div>
  );
};

const ScaleSlider5 = ({ label, value, readOnly, allGreen = true }) => {
  const getSegmentColor = (index, val) => {
    if (index > val) return 'bg-[var(--color-border)]';
    if (allGreen) return 'bg-green-500';
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'
    ];
    return colors[val - 1] || 'bg-gray-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{label}</label>
        <span className="text-sm font-bold text-[var(--color-text)]">{value || 0} / 5</span>
      </div>
      <div className="flex gap-1 h-3 w-full">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${readOnly ? '' : 'cursor-pointer'} transition-colors duration-300 ${getSegmentColor(i, value || 0)}`}
            onClick={() => !readOnly && onChange(i)}
          />
        ))}
      </div>
    </div>
  );
};

export function ConsultationViewer({
  patient,
  evaluation,
  plan,
  defaultTab = 'clinical_history',
  onClose,
}) {
  const [evaluationForm, setEvaluationForm] = useState(() => {
    if (evaluation) {
      return {
        ...getInitialEvaluation(),
        ...evaluation,
      };
    }
    return getInitialEvaluation();
  });
  const [planForm, setPlanForm] = useState(() => normalizePlanForm(plan));
  const [evaluationTab, setEvaluationTab] = useState(defaultTab || 'clinical_history');


  const tabOrder = (patient?.userType === 'client'
    ? [
      { key: 'clinical_history', label: 'Historia Clínica' },
      { key: 'composition', label: 'Composición Corporal' },
      { key: 'exercise_plan', label: 'Plan de Ejercicio' },
      { key: 'diet', label: 'Plan Nutricional' },
    ]
    : [
      { key: 'clinical_history', label: 'Historia Clínica' },
      { key: 'composition', label: 'Composición Corporal' },
      { key: 'diet', label: 'Plan Nutricional' },
      { key: 'exercise_plan', label: 'Plan de Ejercicio' },
    ]) || [];


  return (
    <div className="space-y-6">
      <div className="flex border-b border-[var(--color-border)] mb-4 overflow-x-auto custom-scrollbar">
        {tabOrder.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap ${evaluationTab === tab.key ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
            onClick={() => setEvaluationTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {evaluationTab === 'composition' && (
        <div className="space-y-6 animate-fade-in">
          {/* MEDICIÓN DE LA CONSULTA */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Consulta
            </h4>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Estatura (cm)', key: 'height_cm' },
                { label: 'Cintura (cm)', key: 'waist_cm' },
                { label: 'Peso (kg)', key: 'weight_kg' },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                  <input
                    type="number"
                    value={evaluationForm[field.key]}
                    readOnly
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Grasa (%)', key: 'body_fat_pct' },
                { label: 'Masa muscular (kg)', key: 'muscle_mass_kg' },
                { label: 'Visceral (%)', key: 'visceral_fat_pct' },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                  <input
                    type="number"
                    value={evaluationForm[field.key]}
                    readOnly
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* METAS DEL PACIENTE / OBJETIVOS */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold,#EAB308)] border-b border-[var(--color-border)] pb-2">
              Objetivos y Metas del Paciente
            </h4>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Estatura Base (cm)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.height_cm || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Cintura Meta (cm)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.target_waist_cm || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Peso Meta (kg)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.target_weight_kg || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Grasa Meta (%)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.target_body_fat_pct || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Masa Muscular Meta (kg)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.target_muscle_mass_kg || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Visceral Meta (%)</label>
                <input
                  type="number"
                  readOnly
                  value={evaluationForm.target_visceral_fat_pct || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas generales</label>
            <textarea
              rows={3}
              value={evaluationForm.body_composition_notes}
              readOnly
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
        </div>
      )}

      {evaluationTab === 'clinical_history' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.smokes}
                    disabled
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Fuma?</span>
                </label>
                {evaluationForm.smokes && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.smokes_description || ''}
                    readOnly
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_alcohol}
                    disabled
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Toma alcohol?</span>
                </label>
                {evaluationForm.drinks_alcohol && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.drinks_alcohol_description || ''}
                    readOnly
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_soda}
                    disabled
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume refrescos embotellados?</span>
                </label>
                {evaluationForm.drinks_soda && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.drinks_soda_description || ''}
                    readOnly
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.uses_drugs}
                    disabled
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume alguna droga?</span>
                </label>
                {evaluationForm.uses_drugs && (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    value={evaluationForm.drugs_description || ''}
                    readOnly
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.eats_junk_food}
                    disabled
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume comida chatarra?</span>
                </label>
                {evaluationForm.eats_junk_food && (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    value={evaluationForm.junk_food_description || ''}
                    readOnly
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>
            </div>

            <div className="space-y-5">
              <HealthSlider label="Seguimiento de Alimentación" value={evaluationForm.diet_adherence} readOnly />
              <HealthSlider label="Seguimiento de Rutina" value={evaluationForm.routine_adherence} readOnly />
              <HealthSlider label="Nivel de Energía" value={evaluationForm.energy_level} readOnly />
              <ScaleSlider5 label="Evacuaciones (al día)" value={evaluationForm.bowel_movements} readOnly />
              <HealthSlider label="Nivel de Hambre" value={evaluationForm.hunger_level} readOnly invertColors />
              <HealthSlider label="Calidad de Sueño" value={evaluationForm.sleep_quality} readOnly />
              <HealthSlider label="Concentración" value={evaluationForm.concentration_level} readOnly />
              <HealthSlider label="Estado de Ánimo" value={evaluationForm.mood_level} readOnly />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">SP (Indicaciones Personales)</label>
            <textarea
              rows={3}
              value={evaluationForm.sp_notes}
              readOnly
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
        </div>
      )}

      {evaluationTab === 'diet' && (
        <div className="space-y-6 animate-fade-in">
          <PlanNutricionalPlatos 
            patient={patient} 
            values={evaluationForm} 
            setValues={() => {}}
            readOnly={true}
          />
        </div>
      )}

      {evaluationTab === 'exercise_plan' && (
        <div className="animate-fade-in">
          <RutinaGym patient={patient} plan={planForm} onChange={() => {}} readOnly={true} />
        </div>
      )}

      <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
        <div className="flex justify-end gap-3">
          {onClose && <GymButton variant="secondary" onClick={onClose}>Cerrar</GymButton>}
        </div>
      </div>
    </div>
  );
}
