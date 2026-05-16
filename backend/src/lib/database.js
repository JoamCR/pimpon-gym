const { Pool } = require('pg');
const { createError } = require('./appError');

// Intentar crear el pool si existe DATABASE_URL. No lanzamos en el require
// para evitar que la aplicación se caiga durante el arranque en entornos
// sin base de datos (ej. entornos de diseño). En su lugar exportamos
// `isConfigured` para que los módulos superiores puedan decidir conducta.
let pool = null;
let isConfigured = false;
if (process.env.DATABASE_URL) {
  isConfigured = true;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Manejo de errores en el pool (clientes inactivos que pierden conexión)
  pool.on('error', (err, client) => {
    console.error('Error en pool de conexiones de base de datos:', err);
  });
} else {
  console.warn('DATABASE_URL no configurado. La aplicación seguirá funcionando en modo sin-BD con datos por defecto.');
}

// Si no hay pool, exportamos un objeto con query que lanza un AppError al usarse
if (!pool) {
  pool = {
    query: async () => {
      throw createError(500, 'Falta la configuración de DATABASE_URL. Agrega DATABASE_URL a tu .env o al entorno de ejecución.');
    }
  };
}

/**
 * Helper unificado para realizar consultas a la base de datos.
 * Utiliza async/await y maneja errores encapsulándolos en un AppError.
 * 
 * @param {string} text - Consulta SQL (puede tener placeholders $1, $2, etc.)
 * @param {Array} params - Parámetros a inyectar en la consulta
 * @returns {Promise<Object>} Resultado emitido por pg (rows, rowCount, etc.)
 */
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Error de ejecución SQL:', err.message);
    // Lanzar un error operativo unificado para evitar filtraciones de logs de DB al cliente
    throw createError(500, 'Error interno de base de datos.');
  }
};

module.exports = {
  pool,
  query,
  isConfigured,
};
