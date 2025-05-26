// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://hogarescuela-80db5-default-rtdb.firebaseio.com'
});

const db = admin.firestore(); // o admin.database() si usas Realtime DB
module.exports = { db, admin };
