const { z } = require('zod');

/**
 * Schema Zod para validaciones del módulo de notificaciones
 */

const sendNotificationSchema = z.object({
  client_id: z.string().uuid('client_id debe ser un UUID válido'),
  type: z.enum(['3day_warning', 'expiry_day', 'manager_alert', 'plan_sent']),
});

module.exports = {
  sendNotificationSchema,
};
