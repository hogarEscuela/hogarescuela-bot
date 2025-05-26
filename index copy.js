const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { db } = require('./firebase-admin');
const { collection, query, where, getDocs } = require('firebase/firestore');

const { enviarMensaje } = require('./api/aiService');

// 🔁 Servidor Express para mantener activo el bot
const app = express();
app.get('/', (_req, res) => res.send('Bot HOGARESCUELA corriendo 🚀'));
const port = process.env.PORT || 5000;
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

client.on('message', async (message) => {
  // 🚫 Ignorar grupos y estados
  if (message.from.endsWith('@g.us') || message.from === 'status@broadcast') return;

  try {
    const rawNumber = message.from.split('@')[0];
    const phoneNumber = rawNumber.startsWith('57') ? rawNumber.slice(2) : rawNumber;

    const snapshot = await db
      .collection('inscripciones')
      .where('telefono', '==', phoneNumber)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const docRef = doc.ref;
      const data = doc.data();

      let conversacion = data.conversacion || [];
      console.log('conversacion',conversacion)
      // Añadir el nuevo mensaje del usuario a la conversación
      conversacion.push({ rol: 'usuario', mensaje: message.body });

      // Enviar conversación completa al endpoint IA
      const response = await enviarMensaje(conversacion);

      // Guardar respuesta de la IA
      conversacion.push({ rol: 'asistente', mensaje: response.reply });

      // Actualizar en Firebase
      await docRef.update({ conversacion });

      // Enviar respuesta al usuario
      await client.sendMessage(message.from, response.reply);
    } else {
      console.log(`⛔️ Número ${phoneNumber} no está inscrito`);
      const response = await enviarMensaje([{ rol: 'usuario', mensaje: 'saluda e invita a inscribirse' }]);
      await client.sendMessage(message.from, response.reply);
    }
  } catch (error) {
    console.error('❌ Error procesando el mensaje:', error);
    await client.sendMessage(message.from, 'Lo siento, ocurrió un error al procesar tu mensaje.');
  }
});




client.initialize();
