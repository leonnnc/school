/**
 * admin-main.js — Entry point del Panel de Administración
 *
 * Responsabilidades:
 * - Proteger la ruta: solo usuarios con rol 'admin' pueden acceder
 * - Mostrar email y rol del usuario autenticado en la barra superior
 * - Gestionar la navegación entre secciones del panel
 * - Implementar el botón de cierre de sesión
 *
 * Requisitos: 13.1, 13.6, 13.7, 17.1, 17.10
 */

import { requireRole, getUserRole, signOut } from '../auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from '../firebase-config.js';
import { initStudentsSection } from './students.js';
import { initTeachersSection } from './teachers.js';
import { initCoursesSection } from './courses.js';
import { initEnrollmentsSection } from './enrollments.js';
import { initAdministratorsSection } from './administrators.js';
import { initContentSection } from './content-manager.js';

// ---------------------------------------------------------------------------
// Secciones disponibles del panel
// ---------------------------------------------------------------------------

const SECTIONS = {
  alumnos: 'Alumnos',
  maestros: 'Maestros',
  cursos: 'Cursos',
  inscripciones: 'Inscripciones',
  administradores: 'Administradores',
  contenido: 'Contenido del Sitio',
};

// ---------------------------------------------------------------------------
// Protección de ruta — debe ejecutarse primero
// ---------------------------------------------------------------------------

requireRole('admin', '../login.html');

// ---------------------------------------------------------------------------
// Inicialización del panel tras confirmar autenticación
// ---------------------------------------------------------------------------

onAuthStateChanged(auth, async (user) => {
  if (!user) return; // requireRole ya maneja la redirección

  // Mostrar email y rol del usuario en la barra superior (Requisito 13.7)
  await renderUserInfo(user);

  // Inicializar navegación
  initNavigation();

  // Renderizar la sección activa por defecto (primera sección)
  const defaultSection = document.querySelector('.admin-nav-item.active');
  const defaultSectionName = defaultSection?.dataset?.section ?? 'alumnos';
  renderSection(defaultSectionName);
});

// ---------------------------------------------------------------------------
// Funciones de UI
// ---------------------------------------------------------------------------

/**
 * Muestra el email y rol del usuario autenticado en #admin-user-info.
 * @param {import('firebase/auth').User} user
 */
async function renderUserInfo(user) {
  const userInfoEl = document.getElementById('admin-user-info');
  if (!userInfoEl) return;

  const role = await getUserRole(user.uid);
  const roleLabel = role === 'admin' ? 'Administrador' : (role ?? 'Usuario');

  userInfoEl.innerHTML = `
    <span class="admin-user-email" aria-label="Usuario autenticado">${escapeHtml(user.email ?? '')}</span>
    <span class="admin-user-role admin-badge">${escapeHtml(roleLabel)}</span>
  `;
}

/**
 * Inicializa la navegación del sidebar y el botón de cierre de sesión.
 */
function initNavigation() {
  // Navegación entre secciones
  const navItems = document.querySelectorAll('.admin-nav-item');
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
 * Renderiza el contenido de la sección seleccionada en #admin-content.
 * Delega a cada módulo CRUD según la sección activa.
 * @param {string} sectionKey — Clave de la sección (ej. 'alumnos')
 */
function renderSection(sectionKey) {
  const contentEl = document.getElementById('admin-content');
  if (!contentEl) return;

  switch (sectionKey) {
    case 'alumnos':
      initStudentsSection(contentEl);
      break;
    case 'maestros':
      initTeachersSection(contentEl);
      break;
    case 'cursos':
      initCoursesSection(contentEl);
      break;
    case 'inscripciones':
      initEnrollmentsSection(contentEl);
      break;
    case 'administradores':
      initAdministratorsSection(contentEl);
      break;
    case 'contenido':
      initContentSection(contentEl);
      break;
    default: {
      const sectionName = SECTIONS[sectionKey] ?? sectionKey;
      contentEl.innerHTML = `
        <div class="admin-section-placeholder">
          <h2 class="admin-section-title">${escapeHtml(sectionName)}</h2>
          <p class="admin-section-coming-soon">Sección ${escapeHtml(sectionName)} — próximamente</p>
        </div>
      `;
    }
  }
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
