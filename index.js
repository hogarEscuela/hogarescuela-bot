const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { db } = require('./firebase-admin');
const { enviarMensaje } = require('./api/aiService');

// 🔁 Servidor Express para mantener activo el bot
const app = express();
app.get('/', (_req, res) => res.send('Bot HOGARESCUELA corriendo 🚀'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor activo en puerto ${port}`));

// 🔒 Autenticación persistente
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

// 📷 Código QR para vinculación
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escanea este código QR con tu WhatsApp.');
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp listo para usar');
});

// ✨ Función para limpiar el mensaje de la IA
function limpiarMensaje(mensaje) {
  return mensaje
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Reemplaza **texto** por *texto*
    .replace(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '$1'); // Reemplaza [texto](https://link) por https://link
}

// 🤖 Escucha y responde mensajes
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

client.initialize();
