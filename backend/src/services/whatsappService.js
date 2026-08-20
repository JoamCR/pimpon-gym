const { getConfig } = require('../modules/config/config.repository');

/**
 * Servicio de envío de mensajes con WhatsApp Meta Cloud API Oficial (100% Anti-Baneo)
 * Soporta envío de texto libre, plantillas (Template Messages) y archivos multimedia (Planes JPG).
 */

/**
 * Formatea un número de teléfono mexicano/internacional al formato E.164 sin símbolos ni espacios
 * Ej: "+52 1 55 1234-5678" -> "5215512345678" o "525512345678"
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  
  // Si es un número mexicano de 10 dígitos, añadir lada de país 52
  if (cleaned.length === 10) {
    cleaned = `52${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Envía un mensaje a través de Meta Cloud API o Simulación en modo Test
 */
const sendMessage = async ({ to, message, templateName, templateLanguage, templateParams = [], mediaUrl, mediaType = 'image', caption }) => {
  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    throw new Error('El número de teléfono no es válido.');
  }

  // Obtener la configuración actual de WhatsApp en la app
  const currentConfig = await getConfig();
  const waConfig = currentConfig.whatsapp || {};
  const metaConfig = waConfig.metaConfig || {};
  
  const accessToken = metaConfig.accessToken || process.env.WHATSAPP_META_ACCESS_TOKEN;
  const phoneNumberId = metaConfig.phoneNumberId || process.env.WHATSAPP_META_PHONE_NUMBER_ID;

  // Si no hay credenciales de Meta configuradas, operar en MODO SIMULACIÓN (Test Mode)
  if (!accessToken || !phoneNumberId || waConfig.mode === 'test_mode') {
    console.log(`[WhatsApp Test Mode 📲] Para: ${formattedPhone} | Plantilla: ${templateName || 'N/A'}`);
    console.log(`[WhatsApp Test Mode 💬] Mensaje: ${message || caption || 'Sin texto'}`);
    if (mediaUrl) console.log(`[WhatsApp Test Mode 🖼️] Media URL: ${mediaUrl}`);

    return {
      success: true,
      mode: 'test_mode',
      message_id: `wamid.test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      formatted_phone: formattedPhone,
      timestamp: new Date().toISOString(),
    };
  }

  // Envío Real a Meta WhatsApp Cloud API
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  let payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
  };

  if (templateName) {
    // Envío por Plantilla de Meta (Utility/Marketing)
    const langCode = templateLanguage || (templateName === 'hello_world' ? 'en_US' : 'es_MX');
    payload.type = 'template';
    payload.template = {
      name: templateName,
      language: { code: langCode },
      components: templateParams.length > 0 ? [
        {
          type: 'body',
          parameters: templateParams.map(val => ({ type: 'text', text: String(val) }))
        }
      ] : []
    };
  } else if (mediaUrl) {
    // Envío de Imagen/Documento (ej. Plan Nutricional / Ejercicio en JPG)
    payload.type = mediaType; // 'image' or 'document'
    payload[mediaType] = {
      link: mediaUrl,
      caption: caption || message || '',
    };
  } else {
    // Envío de Texto Directo (Dentro de ventana de 24 horas)
    payload.type = 'text';
    payload.text = { body: message };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error de Meta WhatsApp Cloud API:', data);
      const errorMsg = data.error?.message || 'Error en WhatsApp API';
      throw new Error(`Meta API Error (${data.error?.code || response.status}): ${errorMsg}`);
    }

    const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;

    return {
      success: true,
      mode: 'live',
      message_id: messageId,
      formatted_phone: formattedPhone,
      meta_response: data,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('❌ Fallo al enviar WhatsApp:', err.message);
    throw err;
  }
};

module.exports = {
  formatPhoneNumber,
  sendMessage,
};
