const { createError } = require('../lib/appError');
const jwt = require('jsonwebtoken');

/**
 * Middleware para requerir autenticación JWT
 * Verifica JWT en header Authorization: Bearer <token>
 * Extrae userId y role del payload
 * Agrega request.user = { id, role } para uso en rutas
 */
const requireAuth = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'No autorizado: Token faltante o formato inválido');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    request.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role
    };
  } catch (err) {
    throw createError(401, 'No autorizado: Token inválido o expirado');
  }
};

module.exports = {
  requireAuth
};
