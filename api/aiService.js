const axios = require('axios');

async function enviarMensaje(mensaje) {
  if (!mensaje || mensaje.trim() === "") {
    console.error("Debes enviar un mensaje no vacío.");
    return;
  }

  try {
    const response = await axios.post(
      'https://www.hogarescuela.com/api/whatsapp',
      { message:mensaje }, // cuerpo de la solicitud
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Respuesta de la API:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar el mensaje:', error.response?.data || error.message);
  }
}
module.exports = {
  enviarMensaje
};
// Ejemplo de uso
