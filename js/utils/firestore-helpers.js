/**
 * firestore-helpers.js — Wrappers de operaciones Firestore
 *
 * Abstrae las operaciones comunes de Firestore para simplificar el código
 * en los módulos de la aplicación. Todos los errores se propagan al llamador.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from '../firebase-config.js';

// --------------------------------------------------------------------------
// Operaciones de Lectura
// --------------------------------------------------------------------------

/**
 * Obtiene todos los documentos de una colección, con constraints opcionales.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {import('firebase/firestore').QueryConstraint[]} [constraints=[]] - Array de constraints de query (where, orderBy, limit, etc.).
 * @returns {Promise<Array<{id: string, ...}>>} Array de documentos con su id incluido.
 *
 * @example
 * const cursos = await getCollection('cursos', [where('activo', '==', true), orderBy('nombre')]);
 */
export async function getCollection(collectionName, constraints = []) {
  const colRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/**
 * Obtiene un documento específico por su ID.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {string} docId - ID del documento.
 * @returns {Promise<{id: string, ...}|null>} El documento con su id, o `null` si no existe.
 *
 * @example
 * const alumno = await getDocument('alumnos', 'abc123');
 */
export async function getDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

// --------------------------------------------------------------------------
// Operaciones de Escritura
// --------------------------------------------------------------------------

/**
 * Crea un nuevo documento en una colección con ID generado automáticamente.
 * Agrega automáticamente el campo `creadoEn` con el timestamp del servidor.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {Object} data - Datos del documento a crear.
 * @returns {Promise<string>} El ID del documento creado.
 *
 * @example
 * const newId = await createDocument('alumnos', { nombre: 'Juan', email: 'juan@ejemplo.com' });
 */
export async function createDocument(collectionName, data) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    creadoEn: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Actualiza campos específicos de un documento existente.
 * Solo actualiza los campos proporcionados; no sobreescribe el documento completo.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {string} docId - ID del documento a actualizar.
 * @param {Object} data - Campos a actualizar.
 * @returns {Promise<void>}
 *
 * @example
 * await updateDocument('alumnos', 'abc123', { telefono: '555-1234' });
 */
export async function updateDocument(collectionName, docId, data) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

/**
 * Elimina un documento de una colección.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {string} docId - ID del documento a eliminar.
 * @returns {Promise<void>}
 *
 * @example
 * await deleteDocument('alumnos', 'abc123');
 */
export async function deleteDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// --------------------------------------------------------------------------
// Suscripción en Tiempo Real
// --------------------------------------------------------------------------

/**
 * Suscribe a cambios en tiempo real de una colección mediante onSnapshot.
 * Útil para las tablas del panel de administración que deben reflejar cambios en vivo.
 *
 * @param {string} collectionName - Nombre de la colección en Firestore.
 * @param {Function} callback - Función llamada con el array de documentos cada vez que hay cambios.
 *   Recibe `Array<{id: string, ...}>`.
 * @param {import('firebase/firestore').QueryConstraint[]} [constraints=[]] - Array de constraints de query.
 * @returns {Function} Función de unsubscribe para detener la suscripción.
 *
 * @example
 * const unsubscribe = subscribeToCollection('alumnos', (alumnos) => {
 *   renderTable(alumnos);
 * }, [orderBy('nombre')]);
 *
 * // Para detener la suscripción:
 * unsubscribe();
 */
export function subscribeToCollection(collectionName, callback, constraints = []) {
  const colRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(docs);
  });

  return unsubscribe;
}
