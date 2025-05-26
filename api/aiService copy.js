const axios = require('axios');

async function enviarMensaje(conversacion) {
  if (!Array.isArray(conversacion) || conversacion.length === 0) {
    console.error("Debes enviar una conversación válida.");
    return;
  }

  try {
    const response = await axios.post(
      'http://localhost:3000/api/chat',
      { messages: conversacion }, // ahora enviamos el historial
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error al enviar el mensaje:', error.response?.data || error.message);
  }
}

module.exports = {
  enviarMensaje
};
