const { z } = require('zod');

const dateRangeSchema = z.object({
  from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

const monthYearSchema = z.object({
  month: z.preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().min(1).max(12).optional()),
  year: z.preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().min(2000).optional()),
});

const minMonthsSchema = z.object({
  minMonths: z.preprocess((val) => (val ? parseInt(val, 10) : 6), z.number().min(1)),
});

module.exports = {
  dateRangeSchema,
  monthYearSchema,
  minMonthsSchema
};
