const { Pool } = require('pg');
const { createError } = require('./appError');

let pool = null;
let isConfigured = false;

if (process.env.DATABASE_URL) {
  isConfigured = true;

  const isProduction = process.env.NODE_ENV === 'production';

  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // 1. Limitar el pool por instancia Serverless
    // En Vercel Serverless, 1 o 2 conexiones por Lambda es lo óptimo.
    max: isProduction ? 2 : 10,
    // 2. Liberar conexiones inactivas rápidamente (10 segundos)
    idleTimeoutMillis: 10000,
    // 3. Timeout corto para reaccionar rápido si la DB se satura
    connectionTimeoutMillis: 5000,
  };

  if (isProduction) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Error en pool de conexiones de base de datos:', err);
  });
} else {
  console.warn('DATABASE_URL no configurado. La aplicación seguirá funcionando en modo sin-BD con datos por defecto.');
}

if (!pool) {
  pool = {
    query: async () => {
      throw createError(500, 'Falta la configuración de DATABASE_URL. Agrega DATABASE_URL a tu .env o al entorno de ejecución.');
    }
  };
}

/**
 * Helper unificado para realizar consultas a la base de datos.
 */
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Error de ejecución SQL:', err.message);
    throw createError(500, 'Error interno de base de datos.');
  }
};

module.exports = {
  pool,
  query,
  isConfigured,
};