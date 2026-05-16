const { z } = require('zod');

/**
 * Schema Zod para validaciones del módulo de suscripciones
 * Reutilizable en múltiples rutas y servicios
 */

// Schema para obtener datos del dashboard
const dashboardQuerySchema = z.object({
  // Sin parámetros requeridos por ahora
});

// Schema para actualizar estado de suscripción
const updateSubscriptionSchema = z.object({
  status: z.enum(['active', 'expired', 'cancelled', 'pending']).optional(),
  end_date: z.string().datetime().optional(),
});

// Schema para renovar suscripción
const renewSubscriptionSchema = z.object({
  client_id: z.string().uuid('client_id debe ser un UUID válido'),
  plan_id: z.string().uuid('plan_id debe ser un UUID válido'),
  payment_method: z.enum(['cash', 'transfer', 'card']),
  payment_amount: z.number().positive('El monto debe ser mayor a 0'),
  enrollment_amount: z.number().positive().optional(),
});

module.exports = {
  dashboardQuerySchema,
  updateSubscriptionSchema,
  renewSubscriptionSchema,
};
