const service = require('./nutrition.service');
const schema = require('./nutrition.schema');
const { createError } = require('../../lib/appError');
const pdfService = require('../../services/pdfService');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.guard');

/**
 * Rutas del módulo de Nutriología
 * REGLA: Nunca incluir lógica de negocio aquí.
 * REGLA: Validar con Zod antes de llamar al service.
 * 
 * TODO: Agregar guardias de rol:
 *       - Solo 'nutritionist' y 'owner' acceden a nutrición
 */
async function nutritionRoutes(fastify, options) {

  // Middleware aplicado a todas las rutas de este módulo
  // fastify.addHook('preHandler', requireRole(['nutritionist', 'owner']));

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
   * Reglas: Primera consulta gratis, segunda requiere pago
   */
  fastify.post('/evaluations', async (request, reply) => {
    try {
      const validation = schema.createEvaluationSchema.safeParse(request.body);
      if (!validation.success) {
        console.error('Validation error on /evaluations:', JSON.stringify(validation.error.format(), null, 2));
        return reply.status(400).send({
          error: 'Error de validación en los datos de la evaluación',
          details: validation.error.format()
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
    const validation = schema.createExercisePlanSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Error de validación en los datos del plan',
        details: validation.error.format()
      });
    }

    // TODO: En el futuro esto vendrá del token de auth: request.user.id
    const nutritionistId = request.user?.id || null;

    const plan = await service.createPlan(
      validation.data.client_id,
      validation.data,
      nutritionistId
    );
    
    return reply.status(201).send({ data: plan });
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
      return reply.status(400).send({
        error: 'Error de validación en los datos',
        details: validation.error.format()
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
   * Envía el plan de ejercicio por WhatsApp
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

    // Generar PDF si no existe
    let pdfBase64;
    if (plan.pdf_url) {
      // Cargar PDF existente desde disco
      const fs = require('fs').promises;
      const path = require('path');
      const pdfPath = path.join(__dirname, '../../../uploads/generated', `plan-${planId}.pdf`);
      try {
        const pdfBytes = await fs.readFile(pdfPath);
        pdfBase64 = pdfBytes.toString('base64');
      } catch (error) {
        // Si no existe, generar uno nuevo
        const { base64 } = await pdfService.generateExercisePlan(client, plan);
        pdfBase64 = base64;
      }
    } else {
      // Generar PDF nuevo
      const { base64 } = await pdfService.generateExercisePlan(client, plan);
      pdfBase64 = base64;
    }

    // Enviar por WhatsApp vía POST al servicio en puerto 3001
    const axios = require('axios');
    try {
      const response = await axios.post('http://localhost:3001/send-pdf', {
        phone: client.phone,
        pdfBase64: pdfBase64,
        filename: `plan-ejercicio-${client.first_name}-${client.last_name}.pdf`,
        caption: `Plan de ejercicio para ${client.first_name} ${client.last_name} - ${plan.month_year}`
      });

      if (response.data.success) {
        return reply.status(200).send({
          data: {
            message: 'PDF enviado por WhatsApp exitosamente',
            phone: client.phone
          }
        });
      } else {
        throw createError(500, 'Error al enviar PDF por WhatsApp');
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error.message);
      throw createError(500, 'Error de conexión con el servicio de WhatsApp');
    }
  });
}

module.exports = nutritionRoutes;
