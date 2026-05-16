// services/whatsapp/index.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
  // Mostrar QR en consola para escanear
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('WhatsApp conectado ✓'));

// Endpoint llamado por n8n
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body;
  // phone debe ser formato: 521XXXXXXXXXX@c.us (México)
  const chatId = `${phone.replace('+', '')}@c.us`;
  try {
    await client.sendMessage(chatId, message);
    res.json({ success: true, phone });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para enviar PDF adjunto
app.post('/send-pdf', async (req, res) => {
  const { phone, pdfBase64, filename, caption } = req.body;
  const chatId = `${phone.replace('+', '')}@c.us`;
  const media = new MessageMedia('application/pdf', pdfBase64, filename);
  try {
    await client.sendMessage(chatId, media, { caption });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

client.initialize();
app.listen(3001, () => console.log('WA Service en puerto 3001'));
