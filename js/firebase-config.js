/**
 * Firebase Configuration
 *
 * Reemplaza los valores placeholder con las credenciales reales de tu proyecto Firebase.
 * Puedes encontrarlas en: Firebase Console → Configuración del proyecto → Tus apps → SDK setup and configuration
 *
 * IMPORTANTE: Este archivo es público por diseño (las credenciales de Firebase se protegen
 * mediante reglas de seguridad y dominios autorizados en la consola de Firebase).
 * Nunca embebas estas credenciales directamente en el HTML.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// Firebase Storage no está disponible en el plan gratuito (Spark).
// Las imágenes y videos se gestionan por URL externa.

/**
 * Configuración del proyecto Firebase.
 * Reemplaza cada valor con las credenciales reales de tu proyecto.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyBCOZvB6uM9fvZ_jkC5NEGg-gDN0c22PNs',
  authDomain: 'school-d737a.firebaseapp.com',
  projectId: 'school-d737a',
  storageBucket: 'school-d737a.firebasestorage.app',
  messagingSenderId: '1081779156041',
  appId: '1:1081779156041:web:6e893fa594797826e9bb98',
};

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Exportar las instancias de los servicios Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
// storage no disponible en plan gratuito

export default app;
