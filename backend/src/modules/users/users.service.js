const bcrypt = require('bcryptjs');
const repo = require('./users.repository');
const { createError } = require('../../lib/appError');

async function getAllUsers() {
  return await repo.findAllUsers();
}

async function getUserById(id) {
  const user = await repo.findUserById(id);
  if (!user) {
    throw createError(404, 'Usuario no encontrado');
  }
  return user;
}

async function createUser(data) {
  const existingUser = await repo.findUserByUsername(data.username);
  if (existingUser) {
    throw createError(409, 'El nombre de usuario ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const newUser = await repo.createUser({
    username: data.username,
    hashedPassword,
    full_name: data.full_name,
    role: data.role,
    allowed_pages: data.allowed_pages || [],
  });

  return newUser;
}

async function updateUser(id, data) {
  const user = await repo.findUserById(id);
  if (!user) {
    throw createError(404, 'Usuario no encontrado');
  }

  if (data.username && data.username !== user.username) {
    const existingUser = await repo.findUserByUsername(data.username);
    if (existingUser) {
      throw createError(409, 'El nombre de usuario ya está registrado por otra cuenta');
    }
  }

  const fieldsToUpdate = {};
  if (data.username) fieldsToUpdate.username = data.username;
  if (data.full_name) fieldsToUpdate.full_name = data.full_name;
  if (data.role) fieldsToUpdate.role = data.role;
  if (data.allowed_pages !== undefined) fieldsToUpdate.allowed_pages = data.allowed_pages;
  if (data.is_active !== undefined) fieldsToUpdate.is_active = data.is_active;

  if (data.password && data.password.trim().length > 0) {
    fieldsToUpdate.password_hash = await bcrypt.hash(data.password, 10);
  }

  const updated = await repo.updateUser(id, fieldsToUpdate);
  return updated;
}

async function deleteUser(id) {
  const user = await repo.findUserById(id);
  if (!user) {
    throw createError(404, 'Usuario no encontrado');
  }

  if (user.role === 'owner') {
    throw createError(403, 'No se puede eliminar la cuenta de propietario principal');
  }

  const deleted = await repo.deleteUser(id);
  return deleted;
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
