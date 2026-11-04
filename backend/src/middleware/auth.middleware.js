const { createError } = require('../lib/appError');
const jwt = require('jsonwebtoken');

/**
 * Middleware para requerir autenticación JWT
 * Reutiliza request.user si ya fue verificado por el hook global de Fastify (@fastify/jwt)
 * para evitar verificar el token múltiples veces por petición.
 */
const requireAuth = async (request, reply) => {
  if (request.user && (request.user.id || request.user.userId) && request.user.role) {
    request.user.id = request.user.id || request.user.userId;
    return;
  }

  try {
    if (typeof request.jwtVerify === 'function') {
      await request.jwtVerify();
      request.user = {
        ...request.user,
        id: request.user.userId || request.user.id,
        role: request.user.role,
      };
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'No autorizado: Token faltante o formato inválido');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    request.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role,
    };
  } catch (err) {
    throw createError(401, 'No autorizado: Token inválido o expirado');
  }
};

module.exports = {
  requireAuth,
};
