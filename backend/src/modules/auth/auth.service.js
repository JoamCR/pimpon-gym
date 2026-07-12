const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const { createError } = require('../../lib/appError');

/**
 * Verifica si ya existe un usuario con el rol 'admin'.
 */
async function checkSetupStatus() {
  const adminUser = await repo.findUserByRole('owner');
  return !!adminUser;
}

/**
 * Crea el primer usuario administrador si no existe.
 */
async function setupAdmin(password) {
  const isAdminSetup = await checkSetupStatus();
  if (isAdminSetup) {
    throw createError(409, 'La cuenta de administrador ya ha sido configurada.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminUser = await repo.createAdminUser(hashedPassword);

  // No devolvemos la contraseña hasheada
  const { password_hash, ...user } = adminUser;
  return user;
}

/**
 * Autentica a un usuario y devuelve un token JWT.
 */
async function login(username, password) {
  const userRecord = await repo.findUserByUsername(username);
  if (!userRecord) {
    throw createError(401, 'Credenciales incorrectas.');
  }

  const isPasswordValid = await bcrypt.compare(password, userRecord.password_hash);
  if (!isPasswordValid) {
    throw createError(401, 'Credenciales incorrectas.');
  }

  const { password_hash, ...user } = userRecord;
  return user;
}

module.exports = {
  checkSetupStatus,
  setupAdmin,
  login,
};