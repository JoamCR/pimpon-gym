const { z } = require('zod');

/**
 * Schema Zod para validaciones del módulo de nutriología
 * Todos los schemas de evaluación y planes de ejercicio
 */

// Preprocesadores para sanitizar y coercionar datos de formulario
const coerceNum = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
}, z.number().optional().nullable());

const coerceUuid = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  return String(val);
}, z.string().min(1, 'El ID no puede estar vacío').optional().nullable());

const coerceStr = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  return String(val);
}, z.string().optional().nullable());

const coerceBool = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return Boolean(val);
}, z.boolean().optional().nullable());

// Esquema para crear una evaluación nutricional
const createEvaluationSchema = z.object({
  client_id: coerceUuid,
  patient_id: coerceUuid,
  entity_type: z.enum(['gym', 'consultorio'], {
    errorMap: () => ({ message: 'El tipo de entidad debe ser gym o consultorio' })
  }),
  weight_kg: coerceNum,
  height_cm: coerceNum,
  body_fat_pct: coerceNum,
  visceral_fat_pct: coerceNum,
  muscle_mass_kg: coerceNum,
  waist_cm: coerceNum,
  target_weight_kg: coerceNum,
  target_waist_cm: coerceNum,
  target_body_fat_pct: coerceNum,
  target_muscle_mass_kg: coerceNum,
  target_visceral_fat_pct: coerceNum,
  family_history: coerceStr,
  pathological_history: coerceStr,
  personal_history: coerceStr,
  body_composition_notes: coerceStr,
  smokes: coerceBool,
  smokes_description: coerceStr,
  drinks_alcohol: coerceBool,
  drinks_alcohol_description: coerceStr,
  uses_drugs: coerceBool,
  drugs_description: coerceStr,
  drinks_soda: coerceBool,
  drinks_soda_description: coerceStr,
  eats_junk_food: coerceBool,
  junk_food_description: coerceStr,
  energy_level: coerceNum,
  bowel_movements: coerceNum,
  hunger_level: coerceNum,
  sleep_quality: coerceNum,
  concentration_level: coerceNum,
  mood_level: coerceNum,
  routine_adherence: coerceNum,
  diet_adherence: coerceNum,
  sp_notes: coerceStr,
  is_free_consult: z.boolean().default(false),
  is_paid: coerceBool,
  diet_plan: coerceStr,
  caloric_target: coerceNum,
  protein_target_g: coerceNum,
  carbs_target_g: coerceNum,
  fat_target_g: coerceNum,
});

const coerceMonthYear = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  return String(val);
}, z.string().regex(/^\d{4}-\d{2}$/, 'El formato debe ser YYYY-MM').optional().nullable());

// Esquema para actualizar una evaluación
const updateEvaluationSchema = createEvaluationSchema.partial();

// Esquema para crear plan de ejercicio (6 días)
const createExercisePlanSchema = z.object({
  client_id: coerceUuid,
  patient_id: coerceUuid,
  entity_type: z.enum(['gym', 'consultorio'], {
    errorMap: () => ({ message: 'El tipo de entidad debe ser gym o consultorio' })
  }),
  nutrition_record_id: coerceUuid,
  month_year: coerceMonthYear,
  content: z.any().default({}),
});

// Esquema para actualizar plan de ejercicio
const updateExercisePlanSchema = createExercisePlanSchema.partial();

module.exports = {
  createEvaluationSchema,
  updateEvaluationSchema,
  createExercisePlanSchema,
  updateExercisePlanSchema,
};
