require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const jwt = require('@fastify/jwt');
const { z } = require('zod');
const { AppError } = require('./lib/appError');
const { runSchemaMigrations } = require('./lib/schemaMigrations');

// 1. Validación estricta de variables de entorno usando Zod
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  PORT: z.string().default('4000'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerida'),
  NODE_ENV: z.string().default('development'),
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
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }
  
  // Si no es un error controlado operativo, loggear y responder con 500
  fastify.log.error(error);
  return reply.status(500).send({
    error: 'Error interno del servidor',
  });
});

/**
 * 4. Función de inicio (bootstrap) del servidor Fastify
 */
const start = async () => {
  try {
    // Registro de plugins y configuraciones de seguridad
    await fastify.register(cors, { 
      origin: '*', 
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    }); // TODO: Restringir origen en producción
    await fastify.register(helmet);
    await fastify.register(jwt, { secret: env.JWT_SECRET });

    // Registro del módulo Health (como prueba básica y monitoreo de estado)
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: env.NODE_ENV,
      };
    });

    // Las migraciones de esquema ahora se manejan a través de scripts dedicados
    // como 'migrate_to_supabase.js' o 'seed.js', no en el arranque de la aplicación
    // para evitar problemas en entornos de producción como Render.
    // await runSchemaMigrations();

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
