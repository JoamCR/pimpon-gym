// services/pdfService.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// Ruta de la plantilla base
const TEMPLATE_PATH = path.join(__dirname, '../../uploads/templates/exercise-plan-template.pdf');

// Mapa de campos con coordenadas (x, y) en puntos (1 pulgada = 72 pts)
// Las coordenadas se miden desde abajo-izquierda del PDF
// NOTA: Estas coordenadas deben calibrarse con la plantilla real usando getCoordinateHelper()
const FIELD_MAP = {
  // Información del cliente y plan
  client_name:     { x: 120, y: 710, size: 14, bold: true },
  month_year:      { x: 380, y: 710, size: 12 },

  // Semana 1 - Lunes
  w1_mon_ex1: { x: 80,  y: 620, size: 10 },
  w1_mon_s1:  { x: 280, y: 620, size: 10 },
  w1_mon_r1:  { x: 340, y: 620, size: 10 },
  w1_mon_ex2: { x: 80,  y: 600, size: 10 },
  w1_mon_s2:  { x: 280, y: 600, size: 10 },
  w1_mon_r2:  { x: 340, y: 600, size: 10 },
  w1_mon_ex3: { x: 80,  y: 580, size: 10 },
  w1_mon_s3:  { x: 280, y: 580, size: 10 },
  w1_mon_r3:  { x: 340, y: 580, size: 10 },
  w1_mon_ex4: { x: 80,  y: 560, size: 10 },
  w1_mon_s4:  { x: 280, y: 560, size: 10 },
  w1_mon_r4:  { x: 340, y: 560, size: 10 },
  w1_mon_ex5: { x: 80,  y: 540, size: 10 },
  w1_mon_s5:  { x: 280, y: 540, size: 10 },
  w1_mon_r5:  { x: 340, y: 540, size: 10 },

  // Semana 1 - Martes
  w1_tue_ex1: { x: 80,  y: 500, size: 10 },
  w1_tue_s1:  { x: 280, y: 500, size: 10 },
  w1_tue_r1:  { x: 340, y: 500, size: 10 },
  w1_tue_ex2: { x: 80,  y: 480, size: 10 },
  w1_tue_s2:  { x: 280, y: 480, size: 10 },
  w1_tue_r2:  { x: 340, y: 480, size: 10 },
  w1_tue_ex3: { x: 80,  y: 460, size: 10 },
  w1_tue_s3:  { x: 280, y: 460, size: 10 },
  w1_tue_r3:  { x: 340, y: 460, size: 10 },
  w1_tue_ex4: { x: 80,  y: 440, size: 10 },
  w1_tue_s4:  { x: 280, y: 440, size: 10 },
  w1_tue_r4:  { x: 340, y: 440, size: 10 },
  w1_tue_ex5: { x: 80,  y: 420, size: 10 },
  w1_tue_s5:  { x: 280, y: 420, size: 10 },
  w1_tue_r5:  { x: 340, y: 420, size: 10 },

  // Semana 1 - Miércoles
  w1_wed_ex1: { x: 80,  y: 380, size: 10 },
  w1_wed_s1:  { x: 280, y: 380, size: 10 },
  w1_wed_r1:  { x: 340, y: 380, size: 10 },
  w1_wed_ex2: { x: 80,  y: 360, size: 10 },
  w1_wed_s2:  { x: 280, y: 360, size: 10 },
  w1_wed_r2:  { x: 340, y: 360, size: 10 },
  w1_wed_ex3: { x: 80,  y: 340, size: 10 },
  w1_wed_s3:  { x: 280, y: 340, size: 10 },
  w1_wed_r3:  { x: 340, y: 340, size: 10 },
  w1_wed_ex4: { x: 80,  y: 320, size: 10 },
  w1_wed_s4:  { x: 280, y: 320, size: 10 },
  w1_wed_r4:  { x: 340, y: 320, size: 10 },
  w1_wed_ex5: { x: 80,  y: 300, size: 10 },
  w1_wed_s5:  { x: 280, y: 300, size: 10 },
  w1_wed_r5:  { x: 340, y: 300, size: 10 },

  // Semana 1 - Jueves
  w1_thu_ex1: { x: 80,  y: 260, size: 10 },
  w1_thu_s1:  { x: 280, y: 260, size: 10 },
  w1_thu_r1:  { x: 340, y: 260, size: 10 },
  w1_thu_ex2: { x: 80,  y: 240, size: 10 },
  w1_thu_s2:  { x: 280, y: 240, size: 10 },
  w1_thu_r2:  { x: 340, y: 240, size: 10 },
  w1_thu_ex3: { x: 80,  y: 220, size: 10 },
  w1_thu_s3:  { x: 280, y: 220, size: 10 },
  w1_thu_r3:  { x: 340, y: 220, size: 10 },
  w1_thu_ex4: { x: 80,  y: 200, size: 10 },
  w1_thu_s4:  { x: 280, y: 200, size: 10 },
  w1_thu_r4:  { x: 340, y: 200, size: 10 },
  w1_thu_ex5: { x: 80,  y: 180, size: 10 },
  w1_thu_s5:  { x: 280, y: 180, size: 10 },
  w1_thu_r5:  { x: 340, y: 180, size: 10 },

  // Semana 1 - Viernes
  w1_fri_ex1: { x: 80,  y: 140, size: 10 },
  w1_fri_s1:  { x: 280, y: 140, size: 10 },
  w1_fri_r1:  { x: 340, y: 140, size: 10 },
  w1_fri_ex2: { x: 80,  y: 120, size: 10 },
  w1_fri_s2:  { x: 280, y: 120, size: 10 },
  w1_fri_r2:  { x: 340, y: 120, size: 10 },
  w1_fri_ex3: { x: 80,  y: 100, size: 10 },
  w1_fri_s3:  { x: 280, y: 100, size: 10 },
  w1_fri_r3:  { x: 340, y: 100, size: 10 },
  w1_fri_ex4: { x: 80,  y: 80, size: 10 },
  w1_fri_s4:  { x: 280, y: 80, size: 10 },
  w1_fri_r4:  { x: 340, y: 80, size: 10 },
  w1_fri_ex5: { x: 80,  y: 60, size: 10 },
  w1_fri_s5:  { x: 280, y: 60, size: 10 },
  w1_fri_r5:  { x: 340, y: 60, size: 10 },

  // Semana 1 - Sábado
  w1_sat_ex1: { x: 80,  y: 20, size: 10 },
  w1_sat_s1:  { x: 280, y: 20, size: 10 },
  w1_sat_r1:  { x: 340, y: 20, size: 10 },
  w1_sat_ex2: { x: 80,  y: 0, size: 10 },
  w1_sat_s2:  { x: 280, y: 0, size: 10 },
  w1_sat_r2:  { x: 340, y: 0, size: 10 },
  w1_sat_ex3: { x: 80,  y: -20, size: 10 },
  w1_sat_s3:  { x: 280, y: -20, size: 10 },
  w1_sat_r3:  { x: 340, y: -20, size: 10 },
  w1_sat_ex4: { x: 80,  y: -40, size: 10 },
  w1_sat_s4:  { x: 280, y: -40, size: 10 },
  w1_sat_r4:  { x: 340, y: -40, size: 10 },
  w1_sat_ex5: { x: 80,  y: -60, size: 10 },
  w1_sat_s5:  { x: 280, y: -60, size: 10 },
  w1_sat_r5:  { x: 340, y: -60, size: 10 },

  // Notas adicionales
  notes: { x: 80, y: 120, size: 9, color: [0.3, 0.3, 0.3] },
};

/**
 * Carga la plantilla PDF base desde disco
 */
async function loadTemplate() {
  try {
    const templateBytes = await fs.readFile(TEMPLATE_PATH);
    return await PDFDocument.load(templateBytes);
  } catch (error) {
    throw new Error(`No se pudo cargar la plantilla PDF: ${error.message}`);
  }
}

/**
 * Genera un PDF del plan de ejercicio sobre la plantilla
 * @param {Object} clientData - Datos del cliente { first_name, last_name }
 * @param {Object} planData - Datos del plan { month_year, content (JSONB) }
 * @returns {Object} { pdfBytes: Buffer, base64: string }
 */
async function generateExercisePlan(clientData, planData) {
  // Cargar plantilla
  const pdfDoc = await loadTemplate();
  const pages = pdfDoc.getPages();
  const page = pages[0];

  // Cargar fuentes
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Función auxiliar para escribir texto
  const writeField = (key, value) => {
    const field = FIELD_MAP[key];
    if (!field || !value) return;

    const [r, g, b] = field.color || [0.1, 0.1, 0.1];
    page.drawText(String(value), {
      x: field.x,
      y: field.y,
      size: field.size || 10,
      font: field.bold ? fontBold : font,
      color: rgb(r, g, b),
    });
  };

  // Escribir información del cliente y plan
  writeField('client_name', `${clientData.first_name} ${clientData.last_name}`);
  writeField('month_year', planData.month_year);

  // Procesar el contenido del plan (JSONB con estructura de 6 días)
  if (planData.content && planData.content.days) {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    days.forEach((dayKey, dayIndex) => {
      const dayData = planData.content.days[dayNames[dayIndex]];
      if (dayData && Array.isArray(dayData.exercises)) {
        dayData.exercises.forEach((exercise, exIndex) => {
          if (exIndex < 5) { // Máximo 5 ejercicios por día
            const exKey = `w1_${dayKey}_ex${exIndex + 1}`;
            const sKey = `w1_${dayKey}_s${exIndex + 1}`;
            const rKey = `w1_${dayKey}_r${exIndex + 1}`;

            writeField(exKey, exercise.name || '');
            writeField(sKey, exercise.sets || '');
            writeField(rKey, exercise.reps || '');
          }
        });
      }
    });
  }

  // Escribir notas si existen
  if (planData.content && planData.content.notes) {
    writeField('notes', planData.content.notes);
  }

  // Generar PDF final
  const pdfBytes = await pdfDoc.save();
  const base64 = pdfBytes.toString('base64');

  return { pdfBytes, base64 };
}

/**
 * Genera una versión de ayuda de la plantilla con cuadrícula numerada
 * para calibrar las coordenadas de los campos
 * @returns {Object} { pdfBytes: Buffer, base64: string }
 */
async function getCoordinateHelper() {
  // Crear un PDF en blanco con la misma página que la plantilla
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 en puntos

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Dibujar cuadrícula cada 20 puntos
  for (let x = 0; x <= 595; x += 20) {
    for (let y = 0; y <= 842; y += 20) {
      page.drawText(`${x},${y}`, {
        x: x + 2,
        y: y + 2,
        size: 6,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
  }

  // Dibujar líneas de referencia
  page.drawLine({
    start: { x: 0, y: 0 },
    end: { x: 595, y: 0 },
    thickness: 1,
    color: rgb(1, 0, 0),
  });
  page.drawLine({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 842 },
    thickness: 1,
    color: rgb(1, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  const base64 = pdfBytes.toString('base64');

  return { pdfBytes, base64 };
}

module.exports = {
  generateExercisePlan,
  getCoordinateHelper,
  loadTemplate,
};
