require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const jwt = require('@fastify/jwt');
const { z } = require('zod');
const { AppError, createError } = require('./lib/appError');
const { runSchemaMigrations } = require('./lib/schemaMigrations');

// 1. Validación estricta de variables de entorno usando Zod
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  PORT: z.string().default('4000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad adecuada'),
  NODE_ENV: z.string().default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
});

const envParseResult = envSchema.safeParse(process.env);
if (!envParseResult.success) {
  console.error('❌ Error en las variables de entorno:', envParseResult.error.format());
  process.exit(1); // El proceso no inicia si falta configuración vital
}

const env = envParseResult.data;
process.env.PORT = env.PORT;

// 2. Inicialización de la instancia principal de Fastify
const fastify = Fastify({
  logger: env.NODE_ENV === 'development',
});

// 3. Manejador de Errores Global (captura AppError de nuestra librería)
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  if (error instanceof AppError || error.isOperational) {
    return reply.status(statusCode).send({
      error: message,
      message: message,
    });
  }
  
  // Loggear errores no controlados
  fastify.log.error(error);

  // SEGURIDAD: En producción nunca exponer detalles internos al cliente
  if (env.NODE_ENV === 'production') {
    return reply.status(statusCode >= 500 ? 500 : statusCode).send({
      error: statusCode >= 500 ? 'Error interno del servidor' : message,
      message: statusCode >= 500 ? 'Error interno del servidor' : message,
    });
  }

  return reply.status(statusCode).send({
    error: message,
    message: message,
  });
});


/**
 * 4. Función de inicio (bootstrap) del servidor Fastify
 */
const start = async () => {
  try {
    // Registro de plugins y configuraciones de seguridad
    // SEGURIDAD: CORS restringido a orígenes permitidos
    const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    await fastify.register(cors, {
      origin: (origin, cb) => {
        // Permitir requests sin origin (curl, mobile, server-to-server)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('Origen no permitido por CORS'), false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
    await fastify.register(helmet);
    await fastify.register(jwt, { secret: env.JWT_SECRET });

    // SEGURIDAD: Hook global — Proteger TODAS las rutas /api/* excepto /api/auth/*
    fastify.addHook('onRequest', async (request, reply) => {
      const url = request.url;
      // Rutas públicas: health check y autenticación
      if (url === '/health' || url.startsWith('/api/auth')) {
        return;
      }
      // Todas las demás rutas /api/* requieren JWT
      if (url.startsWith('/api/')) {
        try {
          await request.jwtVerify();
        } catch (err) {
          throw createError(401, 'No autorizado: Token inválido o no proporcionado');
        }
      }
    });

    // Registro del módulo Health (como prueba básica y monitoreo de estado)
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: env.NODE_ENV,
      };
    });

    // Ejecutar migraciones automáticas de esquema
    await runSchemaMigrations();

    // Registrar módulos
    await fastify.register(require('./modules/auth/auth.routes'), { prefix: '/api/auth' });
    await fastify.register(require('./modules/clients/clients.routes'), { prefix: '/api/clients' });
    await fastify.register(require('./modules/patients/patients.routes'), { prefix: '/api/patients' });
    await fastify.register(require('./modules/attendance/attendance.routes'), { prefix: '/api/attendance' });
    await fastify.register(require('./modules/config/config.routes'), { prefix: '/api/config' });
    await fastify.register(require('./modules/plans/plans.routes'), { prefix: '/api/plans' });
    await fastify.register(require('./modules/subscriptions/subscriptions.routes'), { prefix: '/api' });
    await fastify.register(require('./modules/notifications/notifications.routes'), { prefix: '/api/notifications' });
    await fastify.register(require('./modules/payments/payments.routes'), { prefix: '/api/payments' });
    await fastify.register(require('./modules/nutrition/nutrition.routes'), { prefix: '/api/nutrition' });
    await fastify.register(require('./modules/statistics/statistics.routes'), { prefix: '/api/statistics' });
    await fastify.register(require('./modules/agenda/agenda.routes'), { prefix: '/api/agenda' });
    await fastify.register(require('./modules/expenses/expenses.routes'), { prefix: '/api/expenses' });
    await fastify.register(require('./modules/users/users.routes'), { prefix: '/api/users' });

    // Registrar motor de crons de automatización de WhatsApp
    const { initCron } = require('./cron/automationCron');
    initCron();

    // Iniciar servidor en el puerto indicado
    const port = parseInt(env.PORT, 10);
    await fastify.listen({ port, host: '0.0.0.0' });

    console.log(`🚀 Pimpon API corriendo en puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Arrancar la aplicación
start();
