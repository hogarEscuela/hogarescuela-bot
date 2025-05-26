const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); // Para generar imagen QR en base64
const express = require('express');
const { db } = require('./firebase-admin');
const { enviarMensaje } = require('./api/aiService');
require('dotenv').config();

// 🔁 Servidor Express para mantener activo el bot
const app = express();
const port = process.env.PORT || 3000;

let qrImageData = ''; // Aquí guardamos el QR en base64 para mostrarlo en la web

// Ruta principal: simple confirmación de que el bot corre
app.get('/', (_req, res) => res.send('Bot HOGARESCUELA corriendo 🚀'));

// Ruta para mostrar el QR en la web
app.get('/qr', (_req, res) => {
  if (!qrImageData) {
    return res.send('<h2>QR no disponible aún. Intenta en unos segundos...</h2>');
  }

  res.send(`
    <html>
      <head><title>QR WhatsApp - HOGARESCUELA</title></head>
      <body style="text-align:center; font-family:sans-serif;">
        <h1>Escanea este QR para vincular el bot de WhatsApp 📲</h1>
        <img src="${qrImageData}" alt="QR de WhatsApp" />
      </body>
    </html>
  `);
});

app.listen(port, () => console.log(`Servidor activo en puerto ${port}`));

// 🔒 Autenticación persistente con LocalAuth para guardar sesión
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

// Evento QR: generar la imagen base64 para mostrar en la web
client.on('qr', async qr => {
  try {
    qrImageData = await qrcode.toDataURL(qr); // Genera el QR en base64 para <img>
    console.log('📲 Escanea el código QR en: http://localhost:' + port + '/qr');
  } catch (err) {
    console.error('❌ Error generando imagen QR:', err);
  }
});

// Evento listo
client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp listo para usar');
});

// Función para limpiar el mensaje de la IA
function limpiarMensaje(mensaje) {
  return mensaje
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Reemplaza **texto** por *texto*
    .replace(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '$1'); // Reemplaza [texto](link) por link
}

// Escucha y responde mensajes entrantes
client.on('message', async (message) => {
  try {
    const rawNumber = message.from.split('@')[0]; // '573001234567'
    const phoneNumber = rawNumber.startsWith('57') ? rawNumber.slice(2) : rawNumber; // '3001234567'

    const querySnapshot = await db
      .collection('inscripciones')
      .where('telefono', '==', phoneNumber)
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const nombre = data.nombres ? data.nombres.split(' ')[0] : ''; // Primer nombre

      console.log(`✅ Número ${phoneNumber} está inscrito como ${data.nombres || 'sin nombre'}`);

      const respuestaIA = await enviarMensaje(`aspirante: ${nombre}, mensaje: ${message.body}, respuesta: responde la pregunta`);
      const mensajeLimpio = limpiarMensaje(respuestaIA.reply);
      await client.sendMessage(message.from, mensajeLimpio);
    } else {
      console.log(`⛔️ Número ${phoneNumber} no está inscrito`);
      const respuestaIA = await enviarMensaje(`${message.body}, respuesta: responde la pregunta e invita a inscribirse enviando el enlace de inscripción`);
      const mensajeLimpio = limpiarMensaje(respuestaIA.reply);
      await client.sendMessage(message.from, mensajeLimpio);
    }

  } catch (error) {
    console.error('❌ Error procesando el mensaje:', error);
    await client.sendMessage(message.from, 'Lo siento, ocurrió un error al procesar tu mensaje.');
  }
});

// Inicializar cliente WhatsApp
client.initialize();
