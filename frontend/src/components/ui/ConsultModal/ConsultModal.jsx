import React, { useEffect, useState } from 'react';
import { GymModal } from '../GymModal';
import { GymButton } from '../GymButton';

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
  drinks_alcohol: false,
  uses_drugs: false,
  drugs_description: '',
  drinks_soda: false,
  eats_junk_food: false,
  junk_food_description: '',
  energy_level: 5,
  bowel_movements: '',
  hunger_level: 5,
  sleep_quality: 5,
  concentration_level: 5,
  mood_level: 5,
  sp_notes: '',
  diet_plan: '',
  caloric_target: '',
  protein_target_g: '',
  carbs_target_g: '',
  fat_target_g: '',
});

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

export function ConsultModal({
  isOpen,
  onClose,
  title,
  patient,
  evaluation,
  onSubmit,
  submitLabel = 'Guardar Consulta',
}) {
  const [evaluationForm, setEvaluationForm] = useState(getInitialEvaluation());
  const [evaluationTab, setEvaluationTab] = useState('composition');

  useEffect(() => {
    if (!isOpen) return;
    setEvaluationTab('composition');
    if (evaluation) {
      setEvaluationForm({
        ...getInitialEvaluation(),
        ...evaluation,
      });
    } else {
      setEvaluationForm(getInitialEvaluation());
    }
  }, [isOpen, evaluation]);

  const handleSubmit = async () => {
    if (!patient?.id) return;
    const payload = {
      ...evaluationForm,
      patient_id: patient.id,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error al guardar consulta:', error);
    }
  };

  return (
    <GymModal isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <div className="space-y-6">
        <div className="flex border-b border-[var(--color-border)] mb-4">
          <button
            className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'composition' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
            onClick={() => setEvaluationTab('composition')}
          >
            Composición Corporal
          </button>
          <button
            className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'clinical_history' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
            onClick={() => setEvaluationTab('clinical_history')}
          >
            Historia Clínica
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
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Antecedentes familiares</label>
                <textarea
                  rows={2}
                  value={evaluationForm.family_history}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, family_history: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Antecedentes patológicos</label>
                <textarea
                  rows={2}
                  value={evaluationForm.pathological_history}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, pathological_history: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Antecedentes personales</label>
                <textarea
                  rows={2}
                  value={evaluationForm.personal_history}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, personal_history: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
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
          </div>
        )}

        {evaluationTab === 'clinical_history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.smokes}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, smokes: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Fuma?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_alcohol}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_alcohol: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Toma alcohol?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[var(--color-success)] bg-[var(--color-card-alt)] border-[var(--color-border)] rounded"
                    checked={evaluationForm.drinks_soda}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, drinks_soda: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">¿Consume refrescos embotellados?</span>
                </label>

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
                      value={evaluationForm.drugs_description}
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
                      value={evaluationForm.junk_food_description}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, junk_food_description: e.target.value })}
                      className="w-full mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-2 text-sm text-[var(--color-text)]"
                    />
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Evacuaciones (al día)</label>
                  <input
                    type="text"
                    value={evaluationForm.bowel_movements}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, bowel_movements: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    placeholder="Ej: 2 veces"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <HealthSlider label="Nivel de Energía" value={evaluationForm.energy_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, energy_level: v })} />
                <HealthSlider label="Nivel de Hambre" value={evaluationForm.hunger_level} onChange={(v) => setEvaluationForm({ ...evaluationForm, hunger_level: v })} />
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
          <GymButton variant="secondary" onClick={onClose}>Cancelar</GymButton>
          <GymButton variant="success" onClick={handleSubmit}>{submitLabel}</GymButton>
        </div>
      </div>
    </GymModal>
  );
}
