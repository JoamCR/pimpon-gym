const { Pool } = require('pg');
const { createError } = require('./appError');

let rawPool = null;
let isConfigured = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableDbError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT' ||
    err.code === '57P01' ||
    err.code === '53300' ||
    err.code === 'XX000' ||
    msg.includes('max clients reached') ||
    msg.includes('EMAXCONNSESSION') ||
    msg.includes('Connection terminated') ||
    msg.includes('timeout exceeded when trying to connect') ||
    msg.includes('Client has encountered a connection error')
  );
};

if (process.env.DATABASE_URL) {
  isConfigured = true;

  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  // En Vercel + Supabase Session Mode (límite global de 15 conexiones), cada instancia serverless
  // debe usar máximo 2 conexiones y liberarlas en 1s al quedar inactiva para no agotar pool_size: 15
  const defaultMax = isProduction ? 2 : 10;
  const maxConnections = parseInt(process.env.DB_POOL_MAX || String(defaultMax), 10) || defaultMax;

  if (global.__pimponPgPool) {
    rawPool = global.__pimponPgPool;
  } else {
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      // Zona horaria de México por defecto en la sesión
      options: '-c timezone=America/Mexico_City',
      max: maxConnections,
      // En producción serverless, cerrar conexiones ociosas en 1s para devolverlas de inmediato a Supabase
      idleTimeoutMillis: isProduction ? 1000 : 15000,
      connectionTimeoutMillis: 20000,
      allowExitOnIdle: true,
      keepAlive: true,
    };

    if (isProduction || process.env.DATABASE_URL.includes('supabase.com')) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    rawPool = new Pool(poolConfig);

    rawPool.on('error', (err) => {
      console.error('Error en pool de conexiones de base de datos:', err.message);
    });

    global.__pimponPgPool = rawPool;
  }
} else {
  console.warn('DATABASE_URL no configurado. La aplicación seguirá funcionando en modo sin-BD con datos por defecto.');
}

/**
 * Ejecuta una consulta con reintento automático y backoff exponencial si Supabase reporta EMAXCONNSESSION o micro-corte.
 */
const executeWithRetry = async (text, params) => {
  if (!rawPool) {
    throw createError(500, 'Falta la configuración de DATABASE_URL. Agrega DATABASE_URL a tu .env o al entorno de ejecución.');
  }

  const delays = [250, 600, 1200];
  let lastError;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await rawPool.query(text, params);
    } catch (err) {
      lastError = err;
      if (attempt < delays.length && isRetryableDbError(err)) {
        await sleep(delays[attempt]);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

// Proxy del pool para que tanto pool.query(...) como query(...) gocen de reintento automático ante EMAXCONNSESSION
const pool = rawPool
  ? new Proxy(rawPool, {
      get(target, prop, receiver) {
        if (prop === 'query') {
          return executeWithRetry;
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : {
      query: async () => {
        throw createError(500, 'Falta la configuración de DATABASE_URL. Agrega DATABASE_URL a tu .env o al entorno de ejecución.');
      },
    };

/**
 * Helper unificado para realizar consultas a la base de datos.
 */
const query = async (text, params) => {
  try {
    return await executeWithRetry(text, params);
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
