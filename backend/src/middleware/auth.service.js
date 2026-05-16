const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repository = require('./auth.repository');
const { createError } = require('../../lib/appError');

const login = async (email, password) => {
  // 1. Buscar usuario en app_users por email
  const user = await repository.getUserByEmail(email);
  if (!user) {
    throw createError(401, 'Credenciales inválidas');
  }

  // 2. Verificar password con bcrypt
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createError(401, 'Credenciales inválidas');
  }

  // 3. Generar JWT con payload { userId, role } y expiración 8h
  const payload = { userId: user.id, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  // 4. Devolver response mapeado
  return {
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
  };
};

const validateToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw createError(401, 'Token inválido o expirado');
  }
};

module.exports = { login, validateToken };