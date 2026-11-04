const service = require('./nutrition.service');
const schema = require('./nutrition.schema');
const { createError } = require('../../lib/appError');
const pdfService = require('../../services/pdfService');
const notificationsService = require('../notifications/notifications.service');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.guard');

/**
 * Rutas del módulo de Nutriología
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 */
async function nutritionRoutes(fastify, options) {

  // SEGURIDAD: Defensa en profundidad — Requiere autenticación JWT
  fastify.addHook('onRequest', requireAuth);
  // SEGURIDAD: Solo nutriólogo y owner acceden a nutrición
  fastify.addHook('preHandler', requireRole('nutritionist', 'owner'));

  /**
   * GET /api/nutrition/queue
   * Obtiene la cola de pacientes listos para evaluación
   */
  fastify.get('/queue', async (request, reply) => {
    const queue = await service.getPatientQueue();
    return { data: queue };
  });

  /**
   * POST /api/nutrition/evaluations
   * Crea una nueva evaluación nutricional
   * Reglas: Todas las consultas son de pago
   */
  fastify.post('/evaluations', async (request, reply) => {
    try {
      const validation = schema.createEvaluationSchema.safeParse(request.body);
      if (!validation.success) {
        const issuesStr = validation.error.issues.map(i => `${i.path.join('.') || 'campo'}: ${i.message}`).join(', ');
        console.error('Validation error on /evaluations:', issuesStr);
        return reply.status(400).send({
          error: 'Error de validación en los datos de la evaluación',
          details: issuesStr
        });
      }

      const nutritionistId = request.user?.id || null;

      const evaluation = await service.createEvaluation(
        validation.data.client_id,
        validation.data,
        nutritionistId
      );
      
      return reply.status(201).send({ data: evaluation });
    } catch (error) {
      console.error('Error al crear evaluación nutricional:', error);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Error al crear la evaluación nutricional',
        details: error.detail || error.hint || error.stack
      });
    }
  });

  /**
   * GET /api/nutrition/evaluations/:clientId
   * Obtiene el historial de evaluaciones de un cliente
   */
  fastify.get('/evaluations/:clientId', async (request, reply) => {
    const { clientId } = request.params;
    const evaluations = await service.getClientEvaluations(clientId);
    return { data: evaluations };
  });

  /**
   * PUT /api/nutrition/evaluations/:recordId
   * Actualiza una evaluación existente
   */
  fastify.put('/evaluations/:recordId', async (request, reply) => {
    const { recordId } = request.params;
    const validation = schema.updateEvaluationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos',
        details: validation.error.format()
      });
    }

    const updated = await service.updateEvaluation(recordId, validation.data);
    return { data: updated };
  });

  /**
   * POST /api/nutrition/plans
   * Crea un plan de ejercicio (6 días: Lun-Sáb)
   */
  fastify.post('/plans', async (request, reply) => {
    try {
      const validation = schema.createExercisePlanSchema.safeParse(request.body);
      if (!validation.success) {
        const issuesStr = validation.error.issues.map(i => `${i.path.join('.') || 'campo'}: ${i.message}`).join(', ');
        console.error('Validation error on POST /plans:', issuesStr);
        return reply.status(400).send({
          error: 'Error de validación en los datos del plan',
          details: issuesStr
        });
      }

      const nutritionistId = request.user?.id || null;

      const plan = await service.createPlan(
        validation.data.client_id || validation.data.patient_id,
        validation.data,
        nutritionistId
      );
      
      return reply.status(201).send({ data: plan });
    } catch (error) {
      console.error('Error al crear plan de ejercicio:', error);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Error al crear plan de ejercicio',
        details: error.detail || error.hint || error.stack
      });
    }
  });

  /**
   * GET /api/nutrition/plans/:clientId
   * Obtiene los planes de ejercicio de un cliente
   */
  fastify.get('/plans/:clientId', async (request, reply) => {
    const { clientId } = request.params;
    const plans = await service.getClientPlans(clientId);
    return { data: plans };
  });

  /**
   * PUT /api/nutrition/plans/:planId
   * Actualiza un plan de ejercicio
   */
  fastify.put('/plans/:planId', async (request, reply) => {
    const { planId } = request.params;
    const validation = schema.updateExercisePlanSchema.safeParse(request.body);
    if (!validation.success) {
      const issuesStr = validation.error.issues.map(i => `${i.path.join('.') || 'campo'}: ${i.message}`).join(', ');
      return reply.status(400).send({
        error: 'Error de validación en los datos',
        details: issuesStr
      });
    }

    const updated = await service.updatePlan(planId, validation.data);
    return { data: updated };
  });

  /**
   * POST /api/nutrition/exercise-plans/:id/generate-pdf
   * Genera PDF del plan de ejercicio sobre plantilla
   */
  fastify.post('/exercise-plans/:id/generate-pdf', async (request, reply) => {
    const { id: planId } = request.params;

    // Obtener datos del plan y cliente
    const plan = await service.getPlanById(planId);
    if (!plan) {
      throw createError(404, 'Plan de ejercicio no encontrado');
    }

    // Obtener datos del cliente
    const client = await service.getClientById(plan.client_id);
    if (!client) {
      throw createError(404, 'Cliente no encontrado');
    }

    // Generar PDF
    const { pdfBytes, base64 } = await pdfService.generateExercisePlan(client, plan);

    // En desarrollo: guardar en disco temporalmente
    // En producción: subir a Supabase Storage
    const fs = require('fs').promises;
    const path = require('path');
    const outputPath = path.join(__dirname, '../../../uploads/generated', `plan-${planId}.pdf`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pdfBytes);

    // Actualizar el plan con la URL del PDF
    const pdfUrl = `/uploads/generated/plan-${planId}.pdf`; // Ruta relativa para desarrollo
    await service.updatePlanPdfUrl(planId, pdfUrl);

    return reply.status(200).send({
      data: {
        pdf_url: pdfUrl,
        base64: base64,
        message: 'PDF generado exitosamente'
      }
    });
  });

  /**
   * POST /api/nutrition/exercise-plans/:id/send-whatsapp
   * Envía el plan de ejercicio por WhatsApp mediante Meta Cloud API (whatsappService)
   */
  fastify.post('/exercise-plans/:id/send-whatsapp', async (request, reply) => {
    const { id: planId } = request.params;

    // Obtener datos del plan y cliente
    const plan = await service.getPlanById(planId);
    if (!plan) {
      throw createError(404, 'Plan de ejercicio no encontrado');
    }

    // Obtener datos del cliente
    const client = await service.getClientById(plan.client_id);
    if (!client) {
      throw createError(404, 'Cliente no encontrado');
    }

    // Verificar que el cliente tenga teléfono
    if (!client.phone) {
      throw createError(400, 'El cliente no tiene número de teléfono registrado');
    }

    // Generar y persistir el PDF si aún no existe URL registrada
    let pdfUrl = plan.pdf_url;
    if (!pdfUrl) {
      const { pdfBytes } = await pdfService.generateExercisePlan(client, plan);
      const fs = require('fs').promises;
      const path = require('path');
      const outputPath = path.join(__dirname, '../../../uploads/generated', `plan-${planId}.pdf`);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, pdfBytes);
      pdfUrl = `/uploads/generated/plan-${planId}.pdf`;
      await service.updatePlanPdfUrl(planId, pdfUrl);
    }

    const baseUrl = process.env.PUBLIC_API_URL || `${request.protocol}://${request.hostname}`;
    const fullMediaUrl = pdfUrl.startsWith('http') ? pdfUrl : `${baseUrl}${pdfUrl}`;
    const caption = `Plan de ejercicio para ${client.first_name} ${client.last_name} - ${plan.month_year || ''}`.trim();

    try {
      await notificationsService.send({
        client_id: client.id,
        phone: client.phone,
        recipient_name: `${client.first_name} ${client.last_name}`,
        type: 'EXERCISE_PLAN_PDF',
        message: caption,
        media_url: fullMediaUrl,
        media_type: 'document',
        caption,
        entity_type: 'consultorio',
      }, request.user?.id || null);

      return reply.status(200).send({
        data: {
          message: 'PDF enviado por WhatsApp exitosamente',
          phone: client.phone,
          pdf_url: pdfUrl,
        }
      });
    } catch (error) {
      console.error('Error enviando WhatsApp:', error.message);
      throw createError(error.statusCode || 500, error.message || 'Error al enviar el plan por WhatsApp');
    }
  });
}

module.exports = nutritionRoutes;
