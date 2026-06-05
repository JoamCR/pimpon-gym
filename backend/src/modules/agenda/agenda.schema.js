const { z } = require('zod');

const createSchema = z.object({
  event_type: z.enum(['cita','reunion','videollamada','otro']),
  title: z.string().min(1),
  description: z.string().nullish(),
  patient_id: z.string().uuid().nullish(),
  phone: z.string().nullish(),
  status: z.string().nullish(),
  start_at: z.string().min(1),
  end_at: z.string().nullish(),
  reminder_at: z.string().nullish(),
  metadata: z.any().nullish(),
});

module.exports = {
  createSchema,
};
