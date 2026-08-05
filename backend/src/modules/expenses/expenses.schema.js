const { z } = require('zod');

// Esquema de validación para crear un egreso
const createExpenseSchema = z.object({
  concept: z.string().min(1, 'El concepto es requerido').max(255, 'El concepto no debe superar 255 caracteres'),
  amount: z.number().positive('El monto del egreso debe ser positivo'),
  payment_method: z.enum(['cash', 'transfer'], {
    errorMap: () => ({ message: 'Método de pago inválido. Debe ser efectivo (cash) o transferencia (transfer)' })
  }),
  notes: z.string().optional().nullable()
});

// Esquema de validación para actualizar un egreso existente
const updateExpenseSchema = z.object({
  concept: z.string().min(1, 'El concepto es requerido').max(255).optional(),
  amount: z.number().positive('El monto del egreso debe ser positivo').optional(),
  payment_method: z.enum(['cash', 'transfer'], {
    errorMap: () => ({ message: 'Método de pago inválido. Debe ser efectivo (cash) o transferencia (transfer)' })
  }).optional(),
  notes: z.string().nullable().optional()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema
};
