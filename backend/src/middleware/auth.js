const { createError } = require('../lib/appError');

/**
 * Middleware para requerir autenticación JWT
 */
const requireAuth = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw createError(401, 'No autorizado: Token inválido o no proporcionado');
  }
};

/**
 * Factory middleware para requerir roles específicos
 * @param {string[]} allowedRoles Array de roles permitidos
 */
const requireRole = (allowedRoles) => {
  return async (request, reply) => {
    // Primero asegurar que está autenticado
    try {
      await request.jwtVerify();
    } catch (err) {
      throw createError(401, 'No autorizado: Token inválido o no proporcionado');
    }

    const userRole = request.user?.role;
    
    if (!userRole) {
      throw createError(403, 'Prohibido: Rol no especificado');
    }

    if (!allowedRoles.includes(userRole)) {
      throw createError(403, `Prohibido: Se requiere rol ${allowedRoles.join(' o ')}`);
    }
  };
};

module.exports = {
  requireAuth,
  requireRole
};
