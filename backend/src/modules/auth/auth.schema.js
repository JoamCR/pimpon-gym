const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

const setupSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});


module.exports = {
  loginSchema,
  setupSchema,
};