const { z } = require('zod');

const createPatientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  age: z.number().int().min(10, 'La edad mínima es 10 años').max(120, 'La edad máxima es 120 años'),
  phone: z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos'),
  email: z.string().email('El correo no es válido').or(z.literal('')).optional(),
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i, 'El RFC no tiene un formato válido').or(z.literal('')).optional(),
  occupation: z.string().optional(),
  referred_by: z.string().optional(),
  notes: z.string().optional(),
  quick_weight_kg: z.number().positive('El peso debe ser positivo').optional(),
  quick_height_cm: z.number().positive('La altura debe ser positiva').optional(),
  quick_goal: z.string().optional(),
  quick_health_notes: z.string().optional(),
  quick_assessed_at: z.string().datetime().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

module.exports = {
  createPatientSchema,
  updatePatientSchema
};
