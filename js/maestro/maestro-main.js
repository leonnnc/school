/**
 * maestro-main.js — Entry point del Panel del Maestro
 *
 * Responsabilidades:
 * - Proteger la ruta: solo usuarios con rol 'maestro' pueden acceder
 * - Mostrar nombre y email del maestro autenticado en la barra superior
 * - Gestionar la navegación entre secciones del panel
 * - Implementar el botón de cierre de sesión
 *
 * Requisitos: 13.1, 13.6, 13.7, 17.1, 17.10
 */

import { requireRole, getUserRole, signOut } from '../auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db } from '../firebase-config.js';
import { initMaestroProfile } from './maestro-profile.js';

// ---------------------------------------------------------------------------
// Secciones disponibles del panel del maestro
// ---------------------------------------------------------------------------

const SECTIONS = {
  perfil: 'Mi Perfil',
  secciones: 'Mis Secciones',
  cursos: 'Mis Cursos',
  alumnos: 'Mis Alumnos',
};

// ---------------------------------------------------------------------------
// Estado del módulo
// ---------------------------------------------------------------------------

/** @type {import('firebase/auth').User|null} */
let currentUser = null;

// ---------------------------------------------------------------------------
// Protección de ruta — debe ejecutarse primero
// ---------------------------------------------------------------------------

requireRole('maestro', '../../login.html');

// ---------------------------------------------------------------------------
// Inicialización del panel tras confirmar autenticación
// ---------------------------------------------------------------------------

onAuthStateChanged(auth, async (user) => {
  if (!user) return; // requireRole ya maneja la redirección

  // Guardar el usuario en la variable de módulo
  currentUser = user;

  // Mostrar nombre y email del maestro en la barra superior (Requisito 13.7)
  await renderUserInfo(user);

  // Inicializar navegación
  initNavigation();

  // Renderizar la sección activa por defecto
  const defaultSection = document.querySelector('.maestro-nav-item.active');
  const defaultSectionName = defaultSection?.dataset?.section ?? 'perfil';
  renderSection(defaultSectionName);
});

// ---------------------------------------------------------------------------
// Funciones de UI
// ---------------------------------------------------------------------------

/**
 * Muestra el nombre y email del maestro autenticado en #maestro-user-info.
 * Intenta obtener el nombre desde la colección `usuarios`; si no existe, usa el email.
 * @param {import('firebase/auth').User} user
 */
async function renderUserInfo(user) {
  const userInfoEl = document.getElementById('maestro-user-info');
  if (!userInfoEl) return;

  let displayName = user.displayName ?? '';

  // Intentar obtener el nombre desde Firestore
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      displayName = userDoc.data().nombre ?? displayName;
    }
  } catch (error) {
    console.error('Error al obtener datos del maestro:', error);
  }

  const nameHtml = displayName
    ? `<span class="maestro-user-name">${escapeHtml(displayName)}</span>`
    : '';

  userInfoEl.innerHTML = `
    ${nameHtml}
    <span class="maestro-user-email" aria-label="Correo del maestro">${escapeHtml(user.email ?? '')}</span>
  `;
}

/**
 * Inicializa la navegación del sidebar y el botón de cierre de sesión.
 */
function initNavigation() {
  // Navegación entre secciones
  const navItems = document.querySelectorAll('.maestro-nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      if (!section) return;

      // Actualizar estado activo
      navItems.forEach((nav) => {
        nav.classList.remove('active');
        nav.removeAttribute('aria-current');
      });
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');

      // Renderizar contenido de la sección
      renderSection(section);
    });
  });

  // Botón de cierre de sesión (Requisito 13.6)
  const signOutBtn = document.getElementById('btn-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      signOut();
    });
  }
}

/**
 * Renderiza el contenido de la sección seleccionada en #maestro-content.
 * Delega en initMaestroProfile para todas las secciones del panel.
 * @param {string} sectionKey — Clave de la sección (ej. 'perfil')
 */
function renderSection(sectionKey) {
  const contentEl = document.getElementById('maestro-content');
  if (!contentEl) return;

  initMaestroProfile(contentEl, currentUser, sectionKey);
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
