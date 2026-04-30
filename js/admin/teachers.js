/**
 * teachers.js — CRUD de Maestros
 *
 * Gestión completa de maestros: listar, crear, editar y eliminar.
 * Usa suscripción en tiempo real con onSnapshot a través de firestore-helpers.
 *
 * Requisitos: 10.1–10.7
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

let _allTeachers = [];
let _unsubscribe = null;
let _editingId = null;

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Maestros en el elemento contenedor dado.
 * @param {HTMLElement} contentEl — Elemento #admin-content
 */
export function initTeachersSection(contentEl) {
  // Cancelar suscripción previa si existe
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _allTeachers = [];
  _editingId = null;

  contentEl.innerHTML = buildLayout();

  const searchInput = contentEl.querySelector('#teachers-search');
  const newBtn = contentEl.querySelector('#btn-new-teacher');
  const drawer = contentEl.querySelector('#teachers-drawer');
  const form = contentEl.querySelector('#teachers-form');
  const cancelBtn = contentEl.querySelector('#btn-cancel-teacher');

  // Suscripción en tiempo real
  _unsubscribe = subscribeToCollection('maestros', (teachers) => {
    _allTeachers = teachers;
    const query = searchInput?.value ?? '';
    renderTable(contentEl, filterBySearchQuery(_allTeachers, query, ['nombre', 'especialidad']));
  });

  // Búsqueda en tiempo real (Requisito 10.7)
  searchInput?.addEventListener('input', () => {
    renderTable(
      contentEl,
      filterBySearchQuery(_allTeachers, searchInput.value, ['nombre', 'especialidad'])
    );
  });

  // Abrir formulario de nuevo maestro
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
      <h2 class="admin-content-title">Maestros</h2>
      <div style="display:flex;gap:var(--spacing-md);align-items:center;flex-wrap:wrap;">
        <div class="admin-search">
          <svg class="admin-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="teachers-search"
            type="search"
            class="admin-search-input"
            placeholder="Buscar por nombre o especialidad…"
            aria-label="Buscar maestros"
          />
        </div>
        <button id="btn-new-teacher" class="btn btn-primary" type="button">
          + Nuevo Maestro
        </button>
      </div>
    </div>

    <div class="admin-table-wrapper">
      <table class="admin-table" aria-label="Tabla de maestros">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Email</th>
            <th scope="col">Especialidad</th>
            <th scope="col">Cursos Asignados</th>
            <th scope="col">Foto URL</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody id="teachers-tbody">
          <tr>
            <td colspan="6" class="admin-loading">Cargando maestros…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawer de formulario -->
    <div id="teachers-drawer" class="admin-form-drawer" role="dialog" aria-modal="true" aria-labelledby="teachers-drawer-title">
      <h3 id="teachers-drawer-title" class="admin-form-panel-title">Nuevo Maestro</h3>
      <form id="teachers-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="teacher-nombre">Nombre completo <span aria-hidden="true">*</span></label>
          <input id="teacher-nombre" name="nombre" type="text" class="form-input" required autocomplete="name" />
          <span class="form-error" id="teacher-nombre-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="teacher-email">Email <span aria-hidden="true">*</span></label>
          <input id="teacher-email" name="email" type="email" class="form-input" required autocomplete="email" />
          <span class="form-error" id="teacher-email-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="teacher-especialidad">Especialidad <span aria-hidden="true">*</span></label>
          <input id="teacher-especialidad" name="especialidad" type="text" class="form-input" required />
          <span class="form-error" id="teacher-especialidad-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="teacher-descripcion">Descripción</label>
          <textarea id="teacher-descripcion" name="descripcion" class="form-input" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="teacher-foto">URL de foto de perfil</label>
          <input id="teacher-foto" name="fotoPerfil" type="url" class="form-input" placeholder="https://…" />
        </div>
        <div class="admin-form-panel-actions">
          <button id="btn-cancel-teacher" type="button" class="btn btn-outline">Cancelar</button>
          <button id="btn-submit-teacher" type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Renderizado de la tabla
// ---------------------------------------------------------------------------

function renderTable(contentEl, teachers) {
  const tbody = contentEl.querySelector('#teachers-tbody');
  if (!tbody) return;

  if (teachers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">👨‍🏫</div>
            <p class="admin-empty-state-text">No se encontraron maestros</p>
            <p class="admin-empty-state-subtext">Agrega un nuevo maestro con el botón "Nuevo Maestro"</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = teachers
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.nombre ?? '')}</td>
        <td>${escapeHtml(t.email ?? '')}</td>
        <td>${escapeHtml(t.especialidad ?? '—')}</td>
        <td>${Array.isArray(t.cursosAsignados) ? t.cursosAsignados.length : 0}</td>
        <td>
          ${
            t.fotoPerfil
              ? `<a href="${escapeHtml(t.fotoPerfil)}" target="_blank" rel="noopener noreferrer" class="admin-link">Ver foto</a>`
              : '—'
          }
        </td>
        <td class="admin-table-actions">
          <button
            class="btn btn-sm btn-outline"
            data-action="edit"
            data-id="${escapeHtml(t.id)}"
            aria-label="Editar maestro ${escapeHtml(t.nombre ?? '')}"
          >Editar</button>
          <button
            class="btn btn-sm btn-danger"
            data-action="delete"
            data-id="${escapeHtml(t.id)}"
            data-nombre="${escapeHtml(t.nombre ?? '')}"
            aria-label="Eliminar maestro ${escapeHtml(t.nombre ?? '')}"
          >Eliminar</button>
        </td>
      </tr>
    `
    )
    .join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teacher = _allTeachers.find((t) => t.id === btn.dataset.id);
      if (!teacher) return;
      _editingId = teacher.id;
      const drawer = contentEl.querySelector('#teachers-drawer');
      openDrawer(drawer, teacher);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.nombre));
  });
}

// ---------------------------------------------------------------------------
// Drawer (panel lateral)
// ---------------------------------------------------------------------------

function openDrawer(drawer, teacher) {
  if (!drawer) return;
  const title = drawer.querySelector('#teachers-drawer-title');
  const nombreInput = drawer.querySelector('#teacher-nombre');
  const emailInput = drawer.querySelector('#teacher-email');
  const especialidadInput = drawer.querySelector('#teacher-especialidad');
  const descripcionInput = drawer.querySelector('#teacher-descripcion');
  const fotoInput = drawer.querySelector('#teacher-foto');

  if (teacher) {
    if (title) title.textContent = 'Editar Maestro';
    if (nombreInput) nombreInput.value = teacher.nombre ?? '';
    if (emailInput) emailInput.value = teacher.email ?? '';
    if (especialidadInput) especialidadInput.value = teacher.especialidad ?? '';
    if (descripcionInput) descripcionInput.value = teacher.descripcion ?? '';
    if (fotoInput) fotoInput.value = teacher.fotoPerfil ?? '';
  } else {
    if (title) title.textContent = 'Nuevo Maestro';
    drawer.querySelector('#teachers-form')?.reset();
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
  const especialidad = form.especialidad.value.trim();
  const descripcion = form.descripcion.value.trim();
  const fotoPerfil = form.fotoPerfil.value.trim();

  clearErrors(drawer);

  let valid = true;

  if (!isNonEmptyString(nombre)) {
    showFieldError(drawer, 'teacher-nombre-error', 'Este campo es requerido');
    valid = false;
  }
  if (!isNonEmptyString(email)) {
    showFieldError(drawer, 'teacher-email-error', 'Este campo es requerido');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(drawer, 'teacher-email-error', 'Ingresa un correo electrónico válido');
    valid = false;
  }
  if (!isNonEmptyString(especialidad)) {
    showFieldError(drawer, 'teacher-especialidad-error', 'Este campo es requerido');
    valid = false;
  }

  if (!valid) return;

  const submitBtn = drawer.querySelector('#btn-submit-teacher');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = { nombre, email, especialidad, descripcion, fotoPerfil };

    if (_editingId) {
      await updateDocument('maestros', _editingId, data);
      showToast('Maestro actualizado correctamente', 'success');
    } else {
      await createDocument('maestros', { ...data, cursosAsignados: [] });
      showToast('Maestro creado correctamente', 'success');
    }
    closeDrawer(drawer);
  } catch (err) {
    console.error('Error al guardar maestro:', err);
    showToast('Error al guardar el maestro. Intenta de nuevo.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Eliminación
// ---------------------------------------------------------------------------

async function handleDelete(id, nombre) {
  const confirmed = await showModal({
    title: '¿Eliminar maestro?',
    message: `¿Estás seguro de que deseas eliminar a ${escapeHtml(nombre)}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    confirmVariant: 'danger',
  });

  if (!confirmed) return;

  try {
    await deleteDocument('maestros', id);
    showToast('Maestro eliminado correctamente', 'success');
  } catch (err) {
    console.error('Error al eliminar maestro:', err);
    showToast('Error al eliminar el maestro. Intenta de nuevo.', 'error');
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
