const { z } = require('zod');

const createUserSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  role: z.string().default('receptionist'),
  allowed_pages: z.array(z.string()).optional().default([]),
});

const updateUserSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').optional(),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres').optional().or(z.literal('')),
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  role: z.string().optional(),
  allowed_pages: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
};
