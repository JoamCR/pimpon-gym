const { z } = require('zod');

// Esquema de validación para la creación de un cliente
const createClientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  age: z.number().int().min(10, 'La edad mnima es 10 aos').max(100, 'La edad mǭxima es 100 aos').optional(),
  phone: z.string().regex(/^\d{10}$/, 'El telǸfono debe tener 10 dgitos (formato mexicano)').optional(),
  email: z.string().email('El correo no es vǭlido').or(z.literal('')).optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro'], {
    errorMap: () => ({ message: 'Gnero invǭlido' })
  }).optional(),
  rfc: z.string().regex(/^[A-Z'&]{3,4}\d{6}[A-Z0-9]{3}$/i, 'El RFC no tiene un formato vǭlido').optional(),
  plan_id: z.string().uuid('El ID del plan debe ser un UUID válido'),
  payment_method: z.enum(['cash', 'transfer', 'card'], {
    errorMap: () => ({ message: 'Método de pago inválido. Debe ser cash, transfer o card' })
  }),
  payment_amount: z.number().min(0, 'El monto de pago no puede ser negativo'),
  enrollment_amount: z.number().min(0, 'El monto de inscripción no puede ser negativo').optional(),
  enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  enrollment_expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  coach_fitness_level: z.string().optional(),
  coach_health_notes: z.string().optional(),
  coach_goal: z.string().optional(),
  quick_weight_kg: z.number().positive('El peso debe ser positivo').optional(),
  quick_height_cm: z.number().positive('La altura debe ser positiva').optional(),
  quick_goal: z.string().optional(),
  quick_health_notes: z.string().optional(),
  quick_assessed_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// Esquema para actualización (todos los campos son opcionales)
const updateClientSchema = createClientSchema.partial();

module.exports = {
  createClientSchema,
  updateClientSchema
};
