const { z } = require('zod');

/**
 * Schema Zod para validaciones del módulo de nutriología
 * Todos los schemas de evaluación y planes de ejercicio
 */

// Esquema para crear una evaluación nutricional
const createEvaluationSchema = z.object({
  client_id: z.string().uuid('El ID del cliente debe ser un UUID válido').optional(),
  patient_id: z.string().uuid('El ID del paciente debe ser un UUID válido').optional(),
  entity_type: z.enum(['gym', 'consultorio'], {
    errorMap: () => ({ message: 'El tipo de entidad debe ser gym o consultorio' })
  }),
  weight_kg: z.number().positive('El peso debe ser un número positivo').optional(),
  height_cm: z.number().positive('La altura debe ser un número positivo').optional(),
  body_fat_pct: z.number().min(0, 'El porcentaje de grasa no puede ser negativo').max(100).optional(),
  visceral_fat_pct: z.number().min(0, 'El porcentaje de grasa visceral no puede ser negativo').max(100).optional(),
  muscle_mass_kg: z.number().min(0, 'La masa muscular no puede ser negativa').optional(),
  waist_cm: z.number().positive('La cintura debe ser un número positivo').optional(),
  family_history: z.string().optional(),
  pathological_history: z.string().optional(),
  personal_history: z.string().optional(),
  body_composition_notes: z.string().optional(),
  smokes: z.boolean().optional(),
  drinks_alcohol: z.boolean().optional(),
  uses_drugs: z.boolean().optional(),
  drugs_description: z.string().optional(),
  drinks_soda: z.boolean().optional(),
  eats_junk_food: z.boolean().optional(),
  junk_food_description: z.string().optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  bowel_movements: z.union([z.string(), z.number()]).optional(),
  hunger_level: z.number().int().min(1).max(10).optional(),
  sleep_quality: z.number().int().min(1).max(10).optional(),
  concentration_level: z.number().int().min(1).max(10).optional(),
  mood_level: z.number().int().min(1).max(10).optional(),
  sp_notes: z.string().optional(),
  is_free_consult: z.boolean().default(false), // Primera consulta gratis
  diet_plan: z.string().optional(),
  caloric_target: z.number().positive('Las calorias deben ser positivas').optional(),
  protein_target_g: z.number().positive('La proteina debe ser positiva').optional(),
  carbs_target_g: z.number().positive('Los carbohidratos deben ser positivos').optional(),
  fat_target_g: z.number().positive('La grasa debe ser positiva').optional(),
});

// Esquema para actualizar una evaluación
const updateEvaluationSchema = createEvaluationSchema.partial();

// Esquema para crear plan de ejercicio (6 días)
const createExercisePlanSchema = z.object({
  client_id: z.string().uuid('El ID del cliente debe ser un UUID válido').optional(),
  patient_id: z.string().uuid('El ID del paciente debe ser un UUID válido').optional(),
  entity_type: z.enum(['gym', 'consultorio'], {
    errorMap: () => ({ message: 'El tipo de entidad debe ser gym o consultorio' })
  }),
  nutrition_record_id: z.string().uuid('El ID del registro nutricional debe ser un UUID válido').nullable().optional(),
  month_year: z.string().regex(/^\d{4}-\d{2}$/, 'El formato debe ser YYYY-MM').optional(),
  content: z.record(z.any()).default({}),
});

// Esquema para actualizar plan de ejercicio
const updateExercisePlanSchema = createExercisePlanSchema.partial();

module.exports = {
  createEvaluationSchema,
  updateEvaluationSchema,
  createExercisePlanSchema,
  updateExercisePlanSchema,
};
