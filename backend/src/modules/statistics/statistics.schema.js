const { z } = require('zod');

const isoOrDatePattern = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

const optionalDateStr = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
  z.string().regex(isoOrDatePattern, 'Formato de fecha inválido (use YYYY-MM-DD)').optional()
);

const dateRangeSchema = z.object({
  from: z.string().regex(isoOrDatePattern, 'Formato de fecha inválido (use YYYY-MM-DD)'),
  to: z.string().regex(isoOrDatePattern, 'Formato de fecha inválido (use YYYY-MM-DD)'),
});

const monthYearSchema = z.object({
  month: z.preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().min(1).max(12).optional()),
  year: z.preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().min(2000).optional()),
  from: optionalDateStr,
  to: optionalDateStr,
  startDate: optionalDateStr,
  endDate: optionalDateStr,
});

const minMonthsSchema = z.object({
  minMonths: z.preprocess((val) => (val ? parseInt(val, 10) : 6), z.number().min(1)),
});

const daysOutSchema = z.object({
  daysOut: z.preprocess((val) => (val ? parseInt(val, 10) : 30), z.number().min(1)),
});

module.exports = {
  dateRangeSchema,
  monthYearSchema,
  minMonthsSchema,
  daysOutSchema
};
