const { z } = require('zod');

const createAttendanceSchema = z.object({
  client_id: z.string().min(3, 'El identificador del cliente es muy corto'),
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
