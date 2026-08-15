const { createError } = require('../lib/appError');

/**
 * Rate Limiter en memoria para protección contra ataques de fuerza bruta.
 * Limita intentos por IP en una ventana de tiempo configurable.
 * 
 * CONFIGURACIÓN:
 * - MAX_ATTEMPTS: Máximo de intentos permitidos por ventana
 * - WINDOW_MS: Duración de la ventana en milisegundos
 * - CLEANUP_INTERVAL_MS: Cada cuánto limpiar entradas expiradas
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Limpieza cada 5 minutos

// Mapa de IP -> { count, firstAttempt }
const attempts = new Map();

// Limpieza periódica de entradas expiradas para evitar memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of attempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Evitar que el intervalo mantenga el proceso abierto
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Middleware de rate limiting basado en IP.
 * Debe usarse como preHandler en endpoints sensibles (login, setup).
 */
const rateLimiter = async (request, reply) => {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  const record = attempts.get(ip);

  if (!record) {
    // Primer intento: registrar
    attempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  // Si la ventana expiró, resetear
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  // Incrementar contador
  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    const remainingMs = WINDOW_MS - (now - record.firstAttempt);
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw createError(
      429,
      `Demasiados intentos. Intenta de nuevo en ${remainingMin} minuto${remainingMin > 1 ? 's' : ''}.`
    );
  }
};

module.exports = { rateLimiter };
