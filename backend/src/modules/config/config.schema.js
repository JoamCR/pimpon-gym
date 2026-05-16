const { z } = require('zod');

const updateConfigSchema = z.object({
  paymentMethods: z.array(z.string()).optional(),
  paymentTypes: z.array(z.string()).optional(),
  entityTypes: z.array(z.string()).optional(),
  attendanceMethods: z.array(z.string()).optional(),
  transferMonthlyLimit: z.number().int().nonnegative().optional(),
  whatsappMessages: z.record(z.string()).optional(),
  statistics: z.object({ incentiveMonths: z.number().int().nonnegative().optional() }).optional(),
  plans: z.record(z.any()).optional()
});

module.exports = {
  updateConfigSchema
};
