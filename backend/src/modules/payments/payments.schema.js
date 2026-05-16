const { z } = require('zod');

// Esquema de validación para registrar un pago
const registerPaymentSchema = z.object({
  client_id: z.string().uuid('El ID del cliente debe ser un UUID válido').optional(),
  patient_id: z.string().uuid('El ID del paciente debe ser un UUID válido').optional(),
  entity_type: z.enum(['gym', 'consultorio'], {
    errorMap: () => ({ message: 'El tipo de entidad debe ser gym o consultorio' })
  }),
  subscription_id: z.string().uuid('El ID de suscripción debe ser un UUID válido').optional().nullable(),
  amount: z.number().positive('El monto del pago debe ser positivo'),
  payment_method: z.enum(['cash', 'transfer', 'card'], {
    errorMap: () => ({ message: 'Método de pago inválido. Debe ser cash, transfer o card' })
  }),
  payment_type: z.enum(['enrollment', 'monthly', 'visit', 'nutrition_consult', 'nutrition_followup'], {
    errorMap: () => ({ message: 'Tipo de pago inválido' })
  }),
  notes: z.string().optional()
});

module.exports = {
  registerPaymentSchema
};
