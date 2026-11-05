const { Pool } = require('pg');
const { createError } = require('./appError');

let pool = null;
let isConfigured = false;

if (process.env.DATABASE_URL) {
  isConfigured = true;

  const isProduction = process.env.NODE_ENV === 'production';
  const defaultMax = isProduction ? 8 : 10;
  const maxConnections = parseInt(process.env.DB_POOL_MAX || String(defaultMax), 10) || defaultMax;

  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Asegurar zona horaria local de México en cada sesión PostgreSQL sin disparar queries concurrentes en on('connect')
    options: '-c timezone=America/Mexico_City',
    // 1. Permitir suficientes conexiones simultáneas para que varios dispositivos operen sin bloquearse entre sí
    max: maxConnections,
    // 2. Liberar conexiones inactivas ordenadamente (15 segundos)
    idleTimeoutMillis: 15000,
    // 3. Margen amplio (20s) para que ninguna petición de recepción/consultorio falle si hay reportes pesados corriendo
    connectionTimeoutMillis: 20000,
    keepAlive: true,
  };

  if (isProduction || process.env.DATABASE_URL.includes('supabase.com')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Error en pool de conexiones de base de datos:', err.message);
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
 * Helper unificado para realizar consultas a la base de datos con reintento automático ante micro-cortes de red.
 */
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const isTransientConnectionError =
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === '57P01' ||
      (err.message && (
        err.message.includes('Connection terminated') ||
        err.message.includes('timeout exceeded when trying to connect')
      ));

    if (isTransientConnectionError) {
      try {
        return await pool.query(text, params);
      } catch (retryErr) {
        console.error('Error de ejecución SQL tras reintento:', retryErr.message);
        throw createError(500, 'Error interno de base de datos.');
      }
    }

    console.error('Error de ejecución SQL:', err.message);
    throw createError(500, 'Error interno de base de datos.');
  }
};

module.exports = {
  pool,
  query,
  isConfigured,
};
