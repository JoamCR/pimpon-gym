import { useState, useEffect, useRef } from 'react';
import { GymModal } from '../GymModal';
import { GymButton } from '../GymButton';
import RutinaGym from './RutinaGym';
import { PlanNutricionalPlatos } from './PlanNutricionalPlatos';
import { IconEdit, IconCheck, IconCoin } from '@tabler/icons-react';
import { useExercisePlans } from '../../../hooks/useNutrition';

const getInitialEvaluation = () => ({
  weight_kg: '',
  height_cm: '',
  body_fat_pct: '',
  visceral_fat_pct: '',
  muscle_mass_kg: '',
  waist_cm: '',
  target_weight_kg: '',
  target_waist_cm: '',
  target_body_fat_pct: '',
  target_muscle_mass_kg: '',
  target_visceral_fat_pct: '',
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

  let planObj = plan.content || plan;
  if (typeof planObj === 'string') {
    try {
      planObj = JSON.parse(planObj);
    } catch (e) {
      console.error('Error parseando JSON de contenido del plan:', e);
    }
  }

  if (planObj && (planObj.datosGenerales || planObj.rutinas || planObj.cardio || planObj.anotaciones || planObj.observaciones)) {
    return {
      ...getInitialPlanForm(),
      ...planObj,
      datosGenerales: {
        ...getInitialPlanForm().datosGenerales,
        ...(planObj.datosGenerales || {}),
      },
      cardio: {
        ...getInitialPlanForm().cardio,
        ...(planObj.cardio || {}),
      },
    };
  }

  return planObj;
};

const HealthSlider = ({ label, value, onChange, invertColors = false }) => {
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
            className={`flex-1 rounded-sm cursor-pointer transition-colors duration-300 ${getSegmentColor(i, value)}`}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  );
};

const ScaleSlider5 = ({ label, value, onChange, allGreen = true }) => {
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
            className={`flex-1 rounded-sm cursor-pointer transition-colors duration-300 ${getSegmentColor(i, value || 0)}`}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  );
};

export function ConsultForm({
  patient,
  evaluation,
  evaluations = [],
  plan,
  defaultTab = 'clinical_history',
  onSubmit,
  onSubmitPlan,
  onCancel,
  submitLabel = 'Guardar Consulta',
  planSubmitLabel = 'Guardar Plan',
}) {
  const latestEval = evaluations && evaluations.length > 0
    ? [...evaluations].sort((a, b) => new Date(b.evaluation_date || b.created_at || 0) - new Date(a.evaluation_date || a.created_at || 0))[0]
    : null;

  const { data: plansData } = useExercisePlans(patient?.id);
  const exercisePlansList = plansData?.data || (Array.isArray(plansData) ? plansData : []);

  const latestPlan = exercisePlansList && exercisePlansList.length > 0
    ? [...exercisePlansList].sort((a, b) => new Date(b.created_at || b.month_year || 0) - new Date(a.created_at || a.month_year || 0))[0]
    : null;

  const previousEvalWithHeight = evaluations?.find(e => e.height_cm !== null && e.height_cm !== undefined && e.height_cm !== '');
  const previousEvalWithTargets = evaluations?.find(e =>
    e.target_weight_kg || e.target_waist_cm || e.target_body_fat_pct || e.target_muscle_mass_kg || e.target_visceral_fat_pct
  );

  const initialHeight = evaluation?.height_cm
    || latestEval?.height_cm
    || previousEvalWithHeight?.height_cm
    || patient?.quick_height_cm
    || patient?.height_cm
    || '';

  const initialTargetWeight = evaluation?.target_weight_kg || latestEval?.target_weight_kg || previousEvalWithTargets?.target_weight_kg || '';
  const initialTargetWaist = evaluation?.target_waist_cm || latestEval?.target_waist_cm || previousEvalWithTargets?.target_waist_cm || '';
  const initialTargetBodyFat = evaluation?.target_body_fat_pct || latestEval?.target_body_fat_pct || previousEvalWithTargets?.target_body_fat_pct || '';
  const initialTargetMuscleMass = evaluation?.target_muscle_mass_kg || latestEval?.target_muscle_mass_kg || previousEvalWithTargets?.target_muscle_mass_kg || '';
  const initialTargetVisceralFat = evaluation?.target_visceral_fat_pct || latestEval?.target_visceral_fat_pct || previousEvalWithTargets?.target_visceral_fat_pct || '';

  const hasTargetsDefined = Boolean(initialTargetWeight || initialTargetWaist || initialTargetBodyFat || initialTargetMuscleMass || initialTargetVisceralFat);

  const [isEditingTargets, setIsEditingTargets] = useState(!hasTargetsDefined);

  const [evaluationForm, setEvaluationForm] = useState(() => {
    const base = getInitialEvaluation();
    if (evaluation) {
      return {
        ...base,
        ...evaluation,
        height_cm: evaluation.height_cm || initialHeight,
        target_weight_kg: evaluation.target_weight_kg || initialTargetWeight,
        target_waist_cm: evaluation.target_waist_cm || initialTargetWaist,
        target_body_fat_pct: evaluation.target_body_fat_pct || initialTargetBodyFat,
        target_muscle_mass_kg: evaluation.target_muscle_mass_kg || initialTargetMuscleMass,
        target_visceral_fat_pct: evaluation.target_visceral_fat_pct || initialTargetVisceralFat,
      };
    }

    if (latestEval) {
      return {
        ...base,
        family_history: latestEval.family_history || '',
        pathological_history: latestEval.pathological_history || '',
        personal_history: latestEval.personal_history || '',
        smokes: latestEval.smokes || false,
        smokes_description: latestEval.smokes_description || '',
        drinks_alcohol: latestEval.drinks_alcohol || false,
        drinks_alcohol_description: latestEval.drinks_alcohol_description || '',
        uses_drugs: latestEval.uses_drugs || false,
        drugs_description: latestEval.drugs_description || '',
        drinks_soda: latestEval.drinks_soda || false,
        drinks_soda_description: latestEval.drinks_soda_description || '',
        eats_junk_food: latestEval.eats_junk_food || false,
        junk_food_description: latestEval.junk_food_description || '',
        diet_adherence: latestEval.diet_adherence || 5,
        routine_adherence: latestEval.routine_adherence || 5,
        energy_level: latestEval.energy_level || 5,
        bowel_movements: latestEval.bowel_movements || 3,
        hunger_level: latestEval.hunger_level || 5,
        sleep_quality: latestEval.sleep_quality || 5,
        concentration_level: latestEval.concentration_level || 5,
        mood_level: latestEval.mood_level || 5,
        height_cm: initialHeight,
        waist_cm: latestEval.waist_cm || '',
        weight_kg: latestEval.weight_kg || patient?.quick_weight_kg || '',
        body_fat_pct: latestEval.body_fat_pct || '',
        muscle_mass_kg: latestEval.muscle_mass_kg || '',
        visceral_fat_pct: latestEval.visceral_fat_pct || '',
        target_weight_kg: initialTargetWeight,
        target_waist_cm: initialTargetWaist,
        target_body_fat_pct: initialTargetBodyFat,
        target_muscle_mass_kg: initialTargetMuscleMass,
        target_visceral_fat_pct: initialTargetVisceralFat,
        body_composition_notes: latestEval.body_composition_notes || '',
        sp_notes: latestEval.sp_notes || '',
        diet_plan: latestEval.diet_plan || '',
        caloric_target: latestEval.caloric_target || '',
        protein_target_g: latestEval.protein_target_g || '',
        carbs_target_g: latestEval.carbs_target_g || '',
        fat_target_g: latestEval.fat_target_g || '',
      };
    }

    return {
      ...base,
      height_cm: initialHeight,
      weight_kg: patient?.quick_weight_kg || '',
      target_weight_kg: initialTargetWeight,
      target_waist_cm: initialTargetWaist,
      target_body_fat_pct: initialTargetBodyFat,
      target_muscle_mass_kg: initialTargetMuscleMass,
      target_visceral_fat_pct: initialTargetVisceralFat,
    };
  });

  const [planForm, setPlanForm] = useState(() => {
    if (plan) return normalizePlanForm(plan);
    if (latestPlan) return normalizePlanForm(latestPlan);
    return getInitialPlanForm();
  });

  const lastLoadedEvalIdRef = useRef(evaluation?.id || latestEval?.id || null);
  useEffect(() => {
    if (!evaluation && latestEval) {
      const currentEvalId = latestEval.id || latestEval.created_at || latestEval.evaluation_date;
      if (currentEvalId && currentEvalId !== lastLoadedEvalIdRef.current) {
        lastLoadedEvalIdRef.current = currentEvalId;
        const base = getInitialEvaluation();
        setEvaluationForm({
          ...base,
          family_history: latestEval.family_history || '',
          pathological_history: latestEval.pathological_history || '',
          personal_history: latestEval.personal_history || '',
          smokes: latestEval.smokes || false,
          smokes_description: latestEval.smokes_description || '',
          drinks_alcohol: latestEval.drinks_alcohol || false,
          drinks_alcohol_description: latestEval.drinks_alcohol_description || '',
          uses_drugs: latestEval.uses_drugs || false,
          drugs_description: latestEval.drugs_description || '',
          drinks_soda: latestEval.drinks_soda || false,
          drinks_soda_description: latestEval.drinks_soda_description || '',
          eats_junk_food: latestEval.eats_junk_food || false,
          junk_food_description: latestEval.junk_food_description || '',
          diet_adherence: latestEval.diet_adherence || 5,
          routine_adherence: latestEval.routine_adherence || 5,
          energy_level: latestEval.energy_level || 5,
          bowel_movements: latestEval.bowel_movements || 3,
          hunger_level: latestEval.hunger_level || 5,
          sleep_quality: latestEval.sleep_quality || 5,
          concentration_level: latestEval.concentration_level || 5,
          mood_level: latestEval.mood_level || 5,
          height_cm: initialHeight,
          waist_cm: latestEval.waist_cm || '',
          weight_kg: latestEval.weight_kg || patient?.quick_weight_kg || '',
          body_fat_pct: latestEval.body_fat_pct || '',
          muscle_mass_kg: latestEval.muscle_mass_kg || '',
          visceral_fat_pct: latestEval.visceral_fat_pct || '',
          target_weight_kg: initialTargetWeight,
          target_waist_cm: initialTargetWaist,
          target_body_fat_pct: initialTargetBodyFat,
          target_muscle_mass_kg: initialTargetMuscleMass,
          target_visceral_fat_pct: initialTargetVisceralFat,
          body_composition_notes: latestEval.body_composition_notes || '',
          sp_notes: latestEval.sp_notes || '',
          diet_plan: latestEval.diet_plan || '',
          caloric_target: latestEval.caloric_target || '',
          protein_target_g: latestEval.protein_target_g || '',
          carbs_target_g: latestEval.carbs_target_g || '',
          fat_target_g: latestEval.fat_target_g || '',
        });
        if (hasTargetsDefined) {
          setIsEditingTargets(false);
        }
      }
    }
  }, [evaluation, latestEval, initialHeight, initialTargetWeight, initialTargetWaist, initialTargetBodyFat, initialTargetMuscleMass, initialTargetVisceralFat, patient?.quick_weight_kg, hasTargetsDefined]);

  const lastLoadedPlanIdRef = useRef(plan?.id || plan?.month_year || latestPlan?.id || latestPlan?.month_year || null);
  useEffect(() => {
    if (!plan && latestPlan) {
      const currentPlanId = latestPlan.id || latestPlan.month_year || latestPlan.created_at;
      if (currentPlanId && currentPlanId !== lastLoadedPlanIdRef.current) {
        lastLoadedPlanIdRef.current = currentPlanId;
        setPlanForm(normalizePlanForm(latestPlan));
      }
    }
  }, [plan, latestPlan]);
  const [evaluationTab, setEvaluationTab] = useState(defaultTab || 'clinical_history');
  const [includePayment, setIncludePayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '500',
    payment_method: 'cash',
    notes: '',
  });

  const handlePlanChange = (nextPlan) => {
    setPlanForm(nextPlan);
  };

  const handleSubmit = async () => {
    if (!patient?.id) return;

    try {
      if (!onSubmit) return;

      const isClient = patient?.userType === 'client' || patient?.user_type === 'client';
      const payload = {
        ...evaluationForm,
        entity_type: isClient ? 'gym' : 'consultorio',
        [isClient ? 'client_id' : 'patient_id']: patient.id,
        plan: planForm,
        paymentData: includePayment ? paymentData : null,
      };

      await onSubmit(payload);
    } catch (error) {
      console.error('Error al guardar consulta:', error);
    }
  };

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

  const currentTabIndex = tabOrder.findIndex((tab) => tab.key === evaluationTab);
  const showNextButton = currentTabIndex !== -1 && currentTabIndex < tabOrder.length - 1;
  const isSaveEnabled = true;

  const handleNext = () => {
    if (currentTabIndex < 0 || currentTabIndex >= tabOrder.length - 1) return;
    setEvaluationTab(tabOrder[currentTabIndex + 1].key);
  };

  const currentSubmitLabel = submitLabel || 'Guardar Consulta';

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
          {/* CONSULTA */}
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
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
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
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* METAS DEL PACIENTE / OBJETIVOS (DEBAJO DE LA CONSULTA EN VIVO) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold,#EAB308)]">
                Objetivos y Metas del Paciente
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingTargets(!isEditingTargets)}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-secondary)] hover:underline font-semibold transition cursor-pointer"
              >
                {isEditingTargets ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5" />
                    <span>Guardar metas</span>
                  </>
                ) : (
                  <>
                    <IconEdit className="w-3.5 h-3.5" />
                    <span>Modificar metas</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Estatura Base (cm)</label>
                <input
                  type="number"
                  disabled
                  value={evaluationForm.height_cm || ''}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Cintura Meta (cm)</label>
                <input
                  type="number"
                  disabled={!isEditingTargets}
                  placeholder={!isEditingTargets ? 'Sin meta' : 'Ej. 80'}
                  value={evaluationForm.target_waist_cm || ''}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, target_waist_cm: e.target.value })}
                  className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] ${!isEditingTargets ? 'bg-[var(--color-surface)] cursor-not-allowed' : 'bg-[var(--color-card-alt)]'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Peso Meta (kg)</label>
                <input
                  type="number"
                  disabled={!isEditingTargets}
                  placeholder={!isEditingTargets ? 'Sin meta' : 'Ej. 70'}
                  value={evaluationForm.target_weight_kg || ''}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, target_weight_kg: e.target.value })}
                  className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] ${!isEditingTargets ? 'bg-[var(--color-surface)] cursor-not-allowed' : 'bg-[var(--color-card-alt)]'}`}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Grasa Meta (%)</label>
                <input
                  type="number"
                  disabled={!isEditingTargets}
                  placeholder={!isEditingTargets ? 'Sin meta' : 'Ej. 15'}
                  value={evaluationForm.target_body_fat_pct || ''}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, target_body_fat_pct: e.target.value })}
                  className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] ${!isEditingTargets ? 'bg-[var(--color-surface)] cursor-not-allowed' : 'bg-[var(--color-card-alt)]'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Masa Muscular Meta (kg)</label>
                <input
                  type="number"
                  disabled={!isEditingTargets}
                  placeholder={!isEditingTargets ? 'Sin meta' : 'Ej. 35'}
                  value={evaluationForm.target_muscle_mass_kg || ''}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, target_muscle_mass_kg: e.target.value })}
                  className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] ${!isEditingTargets ? 'bg-[var(--color-surface)] cursor-not-allowed' : 'bg-[var(--color-card-alt)]'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Visceral Meta (%)</label>
                <input
                  type="number"
                  disabled={!isEditingTargets}
                  placeholder={!isEditingTargets ? 'Sin meta' : 'Ej. 4'}
                  value={evaluationForm.target_visceral_fat_pct || ''}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, target_visceral_fat_pct: e.target.value })}
                  className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] ${!isEditingTargets ? 'bg-[var(--color-surface)] cursor-not-allowed' : 'bg-[var(--color-card-alt)]'}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas generales</label>
            <textarea
              rows={3}
              value={evaluationForm.body_composition_notes}
              onChange={(e) => setEvaluationForm({ ...evaluationForm, body_composition_notes: e.target.value })}
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
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.smokes}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, smokes: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Fuma?</span>
                </label>
                {evaluationForm.smokes && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.smokes_description || ''}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, smokes_description: e.target.value })}
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_alcohol}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_alcohol: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Toma alcohol?</span>
                </label>
                {evaluationForm.drinks_alcohol && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.drinks_alcohol_description || ''}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_alcohol_description: e.target.value })}
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_soda}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_soda: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume refrescos embotellados?</span>
                </label>
                {evaluationForm.drinks_soda && (
                  <input
                    type="text"
                    placeholder="¿Con qué frecuencia / detalles?"
                    value={evaluationForm.drinks_soda_description || ''}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_soda_description: e.target.value })}
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.uses_drugs}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, uses_drugs: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume alguna droga?</span>
                </label>
                {evaluationForm.uses_drugs && (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    value={evaluationForm.drugs_description || ''}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drugs_description: e.target.value })}
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.eats_junk_food}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, eats_junk_food: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume comida chatarra?</span>
                </label>
                {evaluationForm.eats_junk_food && (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    value={evaluationForm.junk_food_description || ''}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, junk_food_description: e.target.value })}
                    className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                  />
                )}
              </div>
            </div>

            <div className="space-y-5">
              <HealthSlider label="Seguimiento de Alimentación" value={evaluationForm.diet_adherence} onChange={(v) => setEvaluationForm({ ...evaluationForm, diet_adherence: v })} />
              <HealthSlider label="Seguimiento de Rutina" value={evaluationForm.routine_adherence} onChange={(v) => setEvaluationForm({ ...evaluationForm, routine_adherence: v })} />
              <HealthSlider label="Nivel de Energía" value={evaluationForm.energy_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, energy_level: v })} />
              <ScaleSlider5 label="Evacuaciones (al día)" value={evaluationForm.bowel_movements} onChange={(v) => setEvaluationForm({ ...evaluationForm, bowel_movements: v })} />
              <HealthSlider label="Nivel de Hambre" value={evaluationForm.hunger_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, hunger_level: v })} invertColors />
              <HealthSlider label="Calidad de Sueño" value={evaluationForm.sleep_quality} onChange={(v) => setEvaluationForm({ ...evaluationForm, sleep_quality: v })} />
              <HealthSlider label="Concentración" value={evaluationForm.concentration_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, concentration_level: v })} />
              <HealthSlider label="Estado de Ánimo" value={evaluationForm.mood_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, mood_level: v })} />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">SP (Indicaciones Personales)</label>
            <textarea
              rows={3}
              value={evaluationForm.sp_notes}
              onChange={(e) => setEvaluationForm({ ...evaluationForm, sp_notes: e.target.value })}
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
            setValues={setEvaluationForm}
          />
        </div>
      )}

      {evaluationTab === 'exercise_plan' && (
        <div className="animate-fade-in">
          <RutinaGym patient={patient} plan={planForm} onChange={handlePlanChange} />
        </div>
      )}

      {/* Sección opcional de Cobro de Consulta */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-alt)] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 accent-[var(--color-gold)] rounded bg-[var(--color-card)] border-[var(--color-border)]"
              checked={includePayment}
              onChange={(e) => setIncludePayment(e.target.checked)}
            />
            <span className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
              <IconCoin className="text-[var(--color-gold)]" size={20} />
              ¿Cobrar esta consulta al guardar?
            </span>
          </label>
        </div>

        {includePayment && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--color-border)] animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Monto ($ MXN)</label>
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="500"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] font-bold focus:border-[var(--color-gold)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Método de Pago</label>
              <select
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] font-semibold"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Notas / Concepto</label>
              <input
                type="text"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Cobro de consulta nutricional"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-gold)] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
        <div className="text-xs text-[var(--color-text-muted)]">
          {includePayment && Number(paymentData.amount) > 0 ? (
            <span className="text-[var(--color-gold)] font-semibold flex items-center gap-1">
              <IconCheck size={16} /> Se registrará cobro por ${paymentData.amount} MXN
            </span>
          ) : (
            <span>Se guardará el expediente sin registrar cobro</span>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto justify-end">
          {onCancel && <GymButton variant="secondary" onClick={onCancel}>Cancelar</GymButton>}
          {showNextButton && (
            <GymButton variant="secondary" onClick={handleNext}>Siguiente</GymButton>
          )}
          <GymButton 
            variant={includePayment ? "gold" : "success"} 
            onClick={handleSubmit} 
            disabled={!isSaveEnabled}
          >
            {includePayment ? 'Guardar y Cobrar Consulta' : currentSubmitLabel}
          </GymButton>
        </div>
      </div>
    </div>
  );
}

export function ConsultModal({
  isOpen,
  onClose,
  title,
  ...props
}) {
  if (!isOpen) return null;

  const formKey = [props.patient?.id, props.evaluation?.id, props.plan?.month_year, props.defaultTab]
    .filter(Boolean)
    .join('-');

  return (
    <GymModal isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <ConsultForm key={formKey} {...props} onCancel={onClose} />
    </GymModal>
  );
}
