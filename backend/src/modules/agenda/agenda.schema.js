const { z } = require('zod');

const createSchema = z.object({
  event_type: z.enum(['cita','reunion','videollamada','otro']),
  title: z.string().min(1),
  description: z.string().optional(),
  patient_id: z.string().uuid().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
  start_at: z.string().min(1),
  end_at: z.string().optional(),
  reminder_at: z.string().optional(),
  metadata: z.any().optional(),
});

module.exports = {
  createSchema,
};
