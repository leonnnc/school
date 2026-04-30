/**
 * students.js — CRUD de Alumnos
 *
 * Gestión completa de alumnos: listar, crear, editar y eliminar.
 * Usa suscripción en tiempo real con onSnapshot a través de firestore-helpers.
 *
 * Requisitos: 9.1–9.9
 */

import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../utils/firestore-helpers.js';
import { filterBySearchQuery, isValidEmail, isNonEmptyString } from '../utils/validators.js';
import { showToast, showModal } from '../utils/ui-helpers.js';

// ---------------------------------------------------------------------------
// Estado del módulo
// ---------------------------------------------------------------------------

let _allStudents = [];
let _unsubscribe = null;
let _editingId = null;

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Alumnos en el elemento contenedor dado.
 * @param {HTMLElement} contentEl — Elemento #admin-content
 */
export function initStudentsSection(contentEl) {
  // Cancelar suscripción previa si existe
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _allStudents = [];
  _editingId = null;

  contentEl.innerHTML = buildLayout();

  // Referencias a elementos del DOM
  const searchInput = contentEl.querySelector('#students-search');
  const newBtn = contentEl.querySelector('#btn-new-student');
  const drawer = contentEl.querySelector('#students-drawer');
  const form = contentEl.querySelector('#students-form');
  const cancelBtn = contentEl.querySelector('#btn-cancel-student');

  // Suscripción en tiempo real
  _unsubscribe = subscribeToCollection('alumnos', (students) => {
    _allStudents = students;
    const query = searchInput?.value ?? '';
    renderTable(contentEl, filterBySearchQuery(_allStudents, query, ['nombre', 'email']));
  });

  // Búsqueda en tiempo real (Requisito 9.9)
  searchInput?.addEventListener('input', () => {
    renderTable(
      contentEl,
      filterBySearchQuery(_allStudents, searchInput.value, ['nombre', 'email'])
    );
  });

  // Abrir formulario de nuevo alumno
  newBtn?.addEventListener('click', () => {
    _editingId = null;
    openDrawer(drawer, null);
  });

  // Cancelar formulario
  cancelBtn?.addEventListener('click', () => closeDrawer(drawer));

  // Enviar formulario
  form?.addEventListener('submit', (e) => handleFormSubmit(e, drawer));
}

// ---------------------------------------------------------------------------
// Construcción del layout HTML
// ---------------------------------------------------------------------------

function buildLayout() {
  return `
    <div class="admin-content-header">
      <h2 class="admin-content-title">Alumnos</h2>
      <div style="display:flex;gap:var(--spacing-md);align-items:center;flex-wrap:wrap;">
        <div class="admin-search">
          <svg class="admin-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="students-search"
            type="search"
            class="admin-search-input"
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar alumnos"
          />
        </div>
        <button id="btn-new-student" class="btn btn-primary" type="button">
          + Nuevo Alumno
        </button>
      </div>
    </div>

    <div class="admin-table-wrapper">
      <table class="admin-table" aria-label="Tabla de alumnos">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Email</th>
            <th scope="col">Teléfono</th>
            <th scope="col">Cursos Inscritos</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody id="students-tbody">
          <tr>
            <td colspan="5" class="admin-loading">Cargando alumnos…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawer de formulario -->
    <div id="students-drawer" class="admin-form-drawer" role="dialog" aria-modal="true" aria-labelledby="students-drawer-title">
      <h3 id="students-drawer-title" class="admin-form-panel-title">Nuevo Alumno</h3>
      <form id="students-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="student-nombre">Nombre completo <span aria-hidden="true">*</span></label>
          <input id="student-nombre" name="nombre" type="text" class="form-input" required autocomplete="name" />
          <span class="form-error" id="student-nombre-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="student-email">Email <span aria-hidden="true">*</span></label>
          <input id="student-email" name="email" type="email" class="form-input" required autocomplete="email" />
          <span class="form-error" id="student-email-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="student-telefono">Teléfono</label>
          <input id="student-telefono" name="telefono" type="tel" class="form-input" autocomplete="tel" />
        </div>
        <div class="admin-form-panel-actions">
          <button id="btn-cancel-student" type="button" class="btn btn-outline">Cancelar</button>
          <button id="btn-submit-student" type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Renderizado de la tabla
// ---------------------------------------------------------------------------

function renderTable(contentEl, students) {
  const tbody = contentEl.querySelector('#students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">👤</div>
            <p class="admin-empty-state-text">No se encontraron alumnos</p>
            <p class="admin-empty-state-subtext">Agrega un nuevo alumno con el botón "Nuevo Alumno"</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.nombre ?? '')}</td>
        <td>${escapeHtml(s.email ?? '')}</td>
        <td>${escapeHtml(s.telefono ?? '—')}</td>
        <td>${Array.isArray(s.cursosInscritos) ? s.cursosInscritos.length : 0}</td>
        <td class="admin-table-actions">
          <button
            class="btn btn-sm btn-outline"
            data-action="edit"
            data-id="${escapeHtml(s.id)}"
            aria-label="Editar alumno ${escapeHtml(s.nombre ?? '')}"
          >Editar</button>
          <button
            class="btn btn-sm btn-danger"
            data-action="delete"
            data-id="${escapeHtml(s.id)}"
            data-nombre="${escapeHtml(s.nombre ?? '')}"
            aria-label="Eliminar alumno ${escapeHtml(s.nombre ?? '')}"
          >Eliminar</button>
        </td>
      </tr>
    `
    )
    .join('');

  // Delegar eventos de la tabla
  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const student = _allStudents.find((s) => s.id === btn.dataset.id);
      if (!student) return;
      _editingId = student.id;
      const drawer = contentEl.querySelector('#students-drawer');
      openDrawer(drawer, student);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.nombre));
  });
}

// ---------------------------------------------------------------------------
// Drawer (panel lateral)
// ---------------------------------------------------------------------------

function openDrawer(drawer, student) {
  if (!drawer) return;
  const title = drawer.querySelector('#students-drawer-title');
  const nombreInput = drawer.querySelector('#student-nombre');
  const emailInput = drawer.querySelector('#student-email');
  const telefonoInput = drawer.querySelector('#student-telefono');

  if (student) {
    if (title) title.textContent = 'Editar Alumno';
    if (nombreInput) nombreInput.value = student.nombre ?? '';
    if (emailInput) emailInput.value = student.email ?? '';
    if (telefonoInput) telefonoInput.value = student.telefono ?? '';
  } else {
    if (title) title.textContent = 'Nuevo Alumno';
    drawer.querySelector('#students-form')?.reset();
  }

  clearErrors(drawer);
  drawer.classList.add('open');
  nombreInput?.focus();
}

function closeDrawer(drawer) {
  if (!drawer) return;
  drawer.classList.remove('open');
  _editingId = null;
}

// ---------------------------------------------------------------------------
// Manejo del formulario
// ---------------------------------------------------------------------------

async function handleFormSubmit(e, drawer) {
  e.preventDefault();
  const form = e.target;
  const nombre = form.nombre.value.trim();
  const email = form.email.value.trim();
  const telefono = form.telefono.value.trim();

  clearErrors(drawer);

  let valid = true;

  if (!isNonEmptyString(nombre)) {
    showFieldError(drawer, 'student-nombre-error', 'Este campo es requerido');
    valid = false;
  }
  if (!isNonEmptyString(email)) {
    showFieldError(drawer, 'student-email-error', 'Este campo es requerido');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(drawer, 'student-email-error', 'Ingresa un correo electrónico válido');
    valid = false;
  }

  if (!valid) return;

  const submitBtn = drawer.querySelector('#btn-submit-student');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (_editingId) {
      await updateDocument('alumnos', _editingId, { nombre, email, telefono });
      showToast('Alumno actualizado correctamente', 'success');
    } else {
      await createDocument('alumnos', {
        nombre,
        email,
        telefono,
        cursosInscritos: [],
      });
      showToast('Alumno creado correctamente', 'success');
    }
    closeDrawer(drawer);
  } catch (err) {
    console.error('Error al guardar alumno:', err);
    showToast('Error al guardar el alumno. Intenta de nuevo.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Eliminación
// ---------------------------------------------------------------------------

async function handleDelete(id, nombre) {
  const confirmed = await showModal({
    title: '¿Eliminar alumno?',
    message: `¿Estás seguro de que deseas eliminar a ${escapeHtml(nombre)}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    confirmVariant: 'danger',
  });

  if (!confirmed) return;

  try {
    await deleteDocument('alumnos', id);
    showToast('Alumno eliminado correctamente', 'success');
  } catch (err) {
    console.error('Error al eliminar alumno:', err);
    showToast('Error al eliminar el alumno. Intenta de nuevo.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function showFieldError(container, errorId, message) {
  const el = container?.querySelector(`#${errorId}`);
  if (el) el.textContent = message;
}

function clearErrors(container) {
  container?.querySelectorAll('.form-error').forEach((el) => {
    el.textContent = '';
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
