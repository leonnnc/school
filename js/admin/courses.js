/**
 * courses.js — CRUD de Cursos
 *
 * Gestión completa de cursos: listar, crear, editar y eliminar.
 * El formulario carga dinámicamente los selects de maestros y secciones desde Firestore.
 *
 * Requisitos: 11.1–11.6
 */

import {
  subscribeToCollection,
  getCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../utils/firestore-helpers.js';
import { isNonEmptyString } from '../utils/validators.js';
import { showToast, showModal } from '../utils/ui-helpers.js';

// ---------------------------------------------------------------------------
// Estado del módulo
// ---------------------------------------------------------------------------

let _allCourses = [];
let _unsubscribe = null;
let _editingId = null;

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Cursos en el elemento contenedor dado.
 * @param {HTMLElement} contentEl — Elemento #admin-content
 */
export function initCoursesSection(contentEl) {
  // Cancelar suscripción previa si existe
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _allCourses = [];
  _editingId = null;

  contentEl.innerHTML = buildLayout();

  const newBtn = contentEl.querySelector('#btn-new-course');
  const drawer = contentEl.querySelector('#courses-drawer');
  const form = contentEl.querySelector('#courses-form');
  const cancelBtn = contentEl.querySelector('#btn-cancel-course');

  // Suscripción en tiempo real
  _unsubscribe = subscribeToCollection('cursos', (courses) => {
    _allCourses = courses;
    renderTable(contentEl, _allCourses);
  });

  // Abrir formulario de nuevo curso
  newBtn?.addEventListener('click', async () => {
    _editingId = null;
    await openDrawer(drawer, null);
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
      <h2 class="admin-content-title">Cursos</h2>
      <button id="btn-new-course" class="btn btn-primary" type="button">
        + Nuevo Curso
      </button>
    </div>

    <div class="admin-table-wrapper">
      <table class="admin-table" aria-label="Tabla de cursos">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Descripción</th>
            <th scope="col">Maestro</th>
            <th scope="col">Sección</th>
            <th scope="col">Cupo Máx.</th>
            <th scope="col">Inscritos</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody id="courses-tbody">
          <tr>
            <td colspan="7" class="admin-loading">Cargando cursos…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawer de formulario -->
    <div id="courses-drawer" class="admin-form-drawer" role="dialog" aria-modal="true" aria-labelledby="courses-drawer-title">
      <h3 id="courses-drawer-title" class="admin-form-panel-title">Nuevo Curso</h3>
      <form id="courses-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="course-nombre">Nombre del curso <span aria-hidden="true">*</span></label>
          <input id="course-nombre" name="nombre" type="text" class="form-input" required />
          <span class="form-error" id="course-nombre-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="course-descripcion">Descripción</label>
          <textarea id="course-descripcion" name="descripcion" class="form-input" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="course-maestro">Maestro <span aria-hidden="true">*</span></label>
          <select id="course-maestro" name="maestroId" class="form-input" required>
            <option value="">Cargando maestros…</option>
          </select>
          <span class="form-error" id="course-maestro-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="course-seccion">Sección <span aria-hidden="true">*</span></label>
          <select id="course-seccion" name="seccionId" class="form-input" required>
            <option value="">Cargando secciones…</option>
          </select>
          <span class="form-error" id="course-seccion-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="course-cupo">Cupo máximo <span aria-hidden="true">*</span></label>
          <input id="course-cupo" name="cupoMaximo" type="number" class="form-input" min="1" required />
          <span class="form-error" id="course-cupo-error" aria-live="polite"></span>
        </div>
        <div class="admin-form-panel-actions">
          <button id="btn-cancel-course" type="button" class="btn btn-outline">Cancelar</button>
          <button id="btn-submit-course" type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Renderizado de la tabla
// ---------------------------------------------------------------------------

function renderTable(contentEl, courses) {
  const tbody = contentEl.querySelector('#courses-tbody');
  if (!tbody) return;

  if (courses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">📚</div>
            <p class="admin-empty-state-text">No se encontraron cursos</p>
            <p class="admin-empty-state-subtext">Agrega un nuevo curso con el botón "Nuevo Curso"</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = courses
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.nombre ?? '')}</td>
        <td>${escapeHtml(truncate(c.descripcion ?? '', 60))}</td>
        <td>${escapeHtml(c.maestroId ?? '—')}</td>
        <td>${escapeHtml(c.seccionId ?? '—')}</td>
        <td>${c.cupoMaximo ?? '—'}</td>
        <td>${c.alumnosInscritos ?? 0}</td>
        <td class="admin-table-actions">
          <button
            class="btn btn-sm btn-outline"
            data-action="edit"
            data-id="${escapeHtml(c.id)}"
            aria-label="Editar curso ${escapeHtml(c.nombre ?? '')}"
          >Editar</button>
          <button
            class="btn btn-sm btn-danger"
            data-action="delete"
            data-id="${escapeHtml(c.id)}"
            data-nombre="${escapeHtml(c.nombre ?? '')}"
            aria-label="Eliminar curso ${escapeHtml(c.nombre ?? '')}"
          >Eliminar</button>
        </td>
      </tr>
    `
    )
    .join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const course = _allCourses.find((c) => c.id === btn.dataset.id);
      if (!course) return;
      _editingId = course.id;
      const drawer = contentEl.querySelector('#courses-drawer');
      await openDrawer(drawer, course);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.nombre));
  });
}

// ---------------------------------------------------------------------------
// Drawer (panel lateral)
// ---------------------------------------------------------------------------

async function openDrawer(drawer, course) {
  if (!drawer) return;

  const title = drawer.querySelector('#courses-drawer-title');
  if (title) title.textContent = course ? 'Editar Curso' : 'Nuevo Curso';

  // Cargar maestros y secciones para los selects
  await Promise.all([
    loadMaestrosSelect(drawer, course?.maestroId),
    loadSeccionesSelect(drawer, course?.seccionId),
  ]);

  if (course) {
    const nombreInput = drawer.querySelector('#course-nombre');
    const descripcionInput = drawer.querySelector('#course-descripcion');
    const cupoInput = drawer.querySelector('#course-cupo');
    if (nombreInput) nombreInput.value = course.nombre ?? '';
    if (descripcionInput) descripcionInput.value = course.descripcion ?? '';
    if (cupoInput) cupoInput.value = course.cupoMaximo ?? '';
  } else {
    drawer.querySelector('#courses-form')?.reset();
  }

  clearErrors(drawer);
  drawer.classList.add('open');
  drawer.querySelector('#course-nombre')?.focus();
}

function closeDrawer(drawer) {
  if (!drawer) return;
  drawer.classList.remove('open');
  _editingId = null;
}

async function loadMaestrosSelect(drawer, selectedId) {
  const select = drawer.querySelector('#course-maestro');
  if (!select) return;

  select.innerHTML = '<option value="">Cargando…</option>';
  try {
    const maestros = await getCollection('maestros');
    select.innerHTML =
      '<option value="">— Selecciona un maestro —</option>' +
      maestros
        .map(
          (m) =>
            `<option value="${escapeHtml(m.id)}" ${m.id === selectedId ? 'selected' : ''}>${escapeHtml(m.nombre ?? m.id)}</option>`
        )
        .join('');
  } catch (err) {
    console.error('Error al cargar maestros:', err);
    select.innerHTML = '<option value="">Error al cargar maestros</option>';
  }
}

async function loadSeccionesSelect(drawer, selectedId) {
  const select = drawer.querySelector('#course-seccion');
  if (!select) return;

  select.innerHTML = '<option value="">Cargando…</option>';
  try {
    const secciones = await getCollection('secciones');
    select.innerHTML =
      '<option value="">— Selecciona una sección —</option>' +
      secciones
        .map(
          (s) =>
            `<option value="${escapeHtml(s.id)}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.nombre ?? s.id)}</option>`
        )
        .join('');
  } catch (err) {
    console.error('Error al cargar secciones:', err);
    select.innerHTML = '<option value="">Error al cargar secciones</option>';
  }
}

// ---------------------------------------------------------------------------
// Manejo del formulario
// ---------------------------------------------------------------------------

async function handleFormSubmit(e, drawer) {
  e.preventDefault();
  const form = e.target;
  const nombre = form.nombre.value.trim();
  const descripcion = form.descripcion.value.trim();
  const maestroId = form.maestroId.value;
  const seccionId = form.seccionId.value;
  const cupoMaximo = parseInt(form.cupoMaximo.value, 10);

  clearErrors(drawer);

  let valid = true;

  if (!isNonEmptyString(nombre)) {
    showFieldError(drawer, 'course-nombre-error', 'Este campo es requerido');
    valid = false;
  }
  if (!maestroId) {
    showFieldError(drawer, 'course-maestro-error', 'Selecciona un maestro');
    valid = false;
  }
  if (!seccionId) {
    showFieldError(drawer, 'course-seccion-error', 'Selecciona una sección');
    valid = false;
  }
  if (!cupoMaximo || cupoMaximo < 1) {
    showFieldError(drawer, 'course-cupo-error', 'Ingresa un cupo máximo válido (mínimo 1)');
    valid = false;
  }

  if (!valid) return;

  const submitBtn = drawer.querySelector('#btn-submit-course');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = { nombre, descripcion, maestroId, seccionId, cupoMaximo };

    if (_editingId) {
      await updateDocument('cursos', _editingId, data);
      showToast('Curso actualizado correctamente', 'success');
    } else {
      await createDocument('cursos', { ...data, alumnosInscritos: 0 });
      showToast('Curso creado correctamente', 'success');
    }
    closeDrawer(drawer);
  } catch (err) {
    console.error('Error al guardar curso:', err);
    showToast('Error al guardar el curso. Intenta de nuevo.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Eliminación
// ---------------------------------------------------------------------------

async function handleDelete(id, nombre) {
  const confirmed = await showModal({
    title: '¿Eliminar curso?',
    message: `¿Estás seguro de que deseas eliminar el curso "${escapeHtml(nombre)}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    confirmVariant: 'danger',
  });

  if (!confirmed) return;

  try {
    await deleteDocument('cursos', id);
    showToast('Curso eliminado correctamente', 'success');
  } catch (err) {
    console.error('Error al eliminar curso:', err);
    showToast('Error al eliminar el curso. Intenta de nuevo.', 'error');
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

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
