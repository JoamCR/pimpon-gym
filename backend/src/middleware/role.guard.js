const { createError } = require('../lib/appError');
const { requireAuth } = require('./auth.middleware');

/**
 * Factory middleware para requerir roles específicos
 * Retorna middleware que verifica que request.user.role esté en la lista
 * Devuelve 403 si el rol no tiene permiso
 * Uso: fastify.addHook('preHandler', requireRole('owner', 'admin'))
 */
const requireRole = (...allowedRoles) => {
  // If the first argument is an array, flatten it to support both requireRole(['a', 'b']) and requireRole('a', 'b')
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

  return async (request, reply) => {
    // Primero asegurar que está autenticado
    await requireAuth(request, reply);

    const userRole = request.user?.role;
    
    if (!userRole) {
      throw createError(403, 'Prohibido: Rol no especificado');
    }

    if (!roles.includes(userRole)) {
      throw createError(403, `Prohibido: Se requiere rol ${roles.join(' o ')}`);
    }
  };
};

module.exports = {
  requireRole
};
