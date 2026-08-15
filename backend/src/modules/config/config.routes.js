const service = require('./config.service');
const schema = require('./config.schema');
const { runAutomationTasks } = require('../../cron/automationCron');

async function configRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const config = await service.getConfig();
    return { data: config };
  });

  fastify.put('/', async (request, reply) => {
    const updated = await service.updateConfig(request.body || {});
    return { data: updated };
  });

  fastify.get('/whatsapp', async (request, reply) => {
    const config = await service.getConfig();
    return { data: config.whatsapp || {} };
  });

  fastify.put('/whatsapp', async (request, reply) => {
    const currentConfig = await service.getConfig();
    const newWaConfig = {
      ...(currentConfig.whatsapp || {}),
      ...(request.body || {}),
    };
    const updated = await service.updateConfig({ whatsapp: newWaConfig });
    return { data: updated.whatsapp };
  });

  fastify.post('/whatsapp/trigger-cron', async (request, reply) => {
    // Ejecutar el motor de crons manualmente bajo demanda para pruebas
    runAutomationTasks().catch(err => console.error('Error al ejecutar cron manual:', err));
    return { success: true, message: 'Ejecución de automatizaciones de WhatsApp iniciada en segundo plano.' };
  });
}

module.exports = configRoutes;
