const { z } = require('zod');

const createAttendanceSchema = z.object({
  client_id: z.string().uuid('El ID del cliente debe ser un UUID válido'),
  method: z.enum(['qr', 'manual', 'code'], {
    errorMap: () => ({ message: 'El método de asistencia debe ser qr, manual o code' })
  }),
  checked_in_at: z.string().datetime().optional(),
  checked_out_at: z.string().datetime().optional()
});

const checkoutAttendanceSchema = z.object({
  checked_out_at: z.string().datetime().optional()
});

module.exports = {
  createAttendanceSchema,
  checkoutAttendanceSchema
};
