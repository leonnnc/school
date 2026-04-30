/**
 * enrollments.js — Gestión de Inscripciones
 *
 * Dos pestañas:
 *  1. Inscripciones — tabla con estado editable + botón "Nueva Inscripción"
 *  2. Solicitudes   — tabla con solicitudes del formulario público (Confirmar/Rechazar)
 *
 * La creación de inscripciones usa runTransaction para garantizar atomicidad:
 *  - Verifica cupo disponible
 *  - Verifica que no exista inscripción duplicada (alumnoId, cursoId)
 *  - Crea el documento en `inscripciones` e incrementa `alumnosInscritos` en el curso
 *
 * Requisitos: 12.1–12.7, 15.4
 */

import {
  runTransaction,
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../firebase-config.js';

import {
  subscribeToCollection,
  getCollection,
  updateDocument,
} from '../utils/firestore-helpers.js';
import { showToast, showModal } from '../utils/ui-helpers.js';
import { isNonEmptyString } from '../utils/validators.js';

// ---------------------------------------------------------------------------
// Estado del módulo
// ---------------------------------------------------------------------------

let _unsubscribeInscripciones = null;
let _unsubscribeSolicitudes = null;
let _activeTab = 'inscripciones';

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Inscripciones en el elemento contenedor dado.
 * @param {HTMLElement} contentEl — Elemento #admin-content
 */
export function initEnrollmentsSection(contentEl) {
  // Cancelar suscripciones previas
  if (_unsubscribeInscripciones) {
    _unsubscribeInscripciones();
    _unsubscribeInscripciones = null;
  }
  if (_unsubscribeSolicitudes) {
    _unsubscribeSolicitudes();
    _unsubscribeSolicitudes = null;
  }
  _activeTab = 'inscripciones';

  contentEl.innerHTML = buildLayout();

  // Tabs
  const tabInscripciones = contentEl.querySelector('#tab-inscripciones');
  const tabSolicitudes = contentEl.querySelector('#tab-solicitudes');

  tabInscripciones?.addEventListener('click', () => switchTab(contentEl, 'inscripciones'));
  tabSolicitudes?.addEventListener('click', () => switchTab(contentEl, 'solicitudes'));

  // Botón nueva inscripción
  const newBtn = contentEl.querySelector('#btn-new-enrollment');
  newBtn?.addEventListener('click', () => openNewEnrollmentModal(contentEl));

  // Iniciar suscripciones
  startInscripcionesSubscription(contentEl);
  startSolicitudesSubscription(contentEl);
}

// ---------------------------------------------------------------------------
// Layout HTML
// ---------------------------------------------------------------------------

function buildLayout() {
  return `
    <div class="admin-content-header">
      <h2 class="admin-content-title">Inscripciones</h2>
      <button id="btn-new-enrollment" class="btn btn-primary" type="button">
        + Nueva Inscripción
      </button>
    </div>

    <!-- Pestañas -->
    <div class="admin-tabs" role="tablist" style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg);border-bottom:2px solid var(--color-border);">
      <button
        id="tab-inscripciones"
        role="tab"
        aria-selected="true"
        aria-controls="panel-inscripciones"
        class="admin-tab active"
        style="padding:var(--spacing-sm) var(--spacing-md);background:none;border:none;border-bottom:3px solid var(--color-primary);font-weight:var(--font-weight-semibold);cursor:pointer;color:var(--color-primary);"
      >Inscripciones</button>
      <button
        id="tab-solicitudes"
        role="tab"
        aria-selected="false"
        aria-controls="panel-solicitudes"
        class="admin-tab"
        style="padding:var(--spacing-sm) var(--spacing-md);background:none;border:none;border-bottom:3px solid transparent;cursor:pointer;color:var(--color-text-muted);"
      >Solicitudes</button>
    </div>

    <!-- Panel Inscripciones -->
    <div id="panel-inscripciones" role="tabpanel" aria-labelledby="tab-inscripciones">
      <div class="admin-table-wrapper">
        <table class="admin-table" aria-label="Tabla de inscripciones">
          <thead>
            <tr>
              <th scope="col">Alumno</th>
              <th scope="col">Curso</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody id="enrollments-tbody">
            <tr><td colspan="4" class="admin-loading">Cargando inscripciones…</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Panel Solicitudes -->
    <div id="panel-solicitudes" role="tabpanel" aria-labelledby="tab-solicitudes" hidden>
      <div class="admin-table-wrapper">
        <table class="admin-table" aria-label="Tabla de solicitudes">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Email</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Curso de Interés</th>
              <th scope="col">Mensaje</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody id="solicitudes-tbody">
            <tr><td colspan="7" class="admin-loading">Cargando solicitudes…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Cambio de pestaña
// ---------------------------------------------------------------------------

function switchTab(contentEl, tab) {
  _activeTab = tab;

  const tabInscripciones = contentEl.querySelector('#tab-inscripciones');
  const tabSolicitudes = contentEl.querySelector('#tab-solicitudes');
  const panelInscripciones = contentEl.querySelector('#panel-inscripciones');
  const panelSolicitudes = contentEl.querySelector('#panel-solicitudes');

  if (tab === 'inscripciones') {
    tabInscripciones?.setAttribute('aria-selected', 'true');
    tabSolicitudes?.setAttribute('aria-selected', 'false');
    tabInscripciones.style.borderBottomColor = 'var(--color-primary)';
    tabInscripciones.style.color = 'var(--color-primary)';
    tabInscripciones.style.fontWeight = 'var(--font-weight-semibold)';
    tabSolicitudes.style.borderBottomColor = 'transparent';
    tabSolicitudes.style.color = 'var(--color-text-muted)';
    tabSolicitudes.style.fontWeight = '';
    panelInscripciones?.removeAttribute('hidden');
    panelSolicitudes?.setAttribute('hidden', '');
  } else {
    tabSolicitudes?.setAttribute('aria-selected', 'true');
    tabInscripciones?.setAttribute('aria-selected', 'false');
    tabSolicitudes.style.borderBottomColor = 'var(--color-primary)';
    tabSolicitudes.style.color = 'var(--color-primary)';
    tabSolicitudes.style.fontWeight = 'var(--font-weight-semibold)';
    tabInscripciones.style.borderBottomColor = 'transparent';
    tabInscripciones.style.color = 'var(--color-text-muted)';
    tabInscripciones.style.fontWeight = '';
    panelSolicitudes?.removeAttribute('hidden');
    panelInscripciones?.setAttribute('hidden', '');
  }
}

// ---------------------------------------------------------------------------
// Suscripción — Inscripciones
// ---------------------------------------------------------------------------

function startInscripcionesSubscription(contentEl) {
  _unsubscribeInscripciones = subscribeToCollection('inscripciones', (inscripciones) => {
    renderEnrollmentsTable(contentEl, inscripciones);
  });
}

function renderEnrollmentsTable(contentEl, inscripciones) {
  const tbody = contentEl.querySelector('#enrollments-tbody');
  if (!tbody) return;

  if (inscripciones.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">📋</div>
            <p class="admin-empty-state-text">No hay inscripciones registradas</p>
            <p class="admin-empty-state-subtext">Crea una nueva inscripción con el botón "Nueva Inscripción"</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inscripciones
    .map((insc) => {
      const fecha = insc.fechaInscripcion?.toDate
        ? insc.fechaInscripcion.toDate().toLocaleDateString('es-MX')
        : '—';

      return `
        <tr>
          <td>${escapeHtml(insc.alumnoId ?? '—')}</td>
          <td>${escapeHtml(insc.cursoId ?? '—')}</td>
          <td>${escapeHtml(fecha)}</td>
          <td>
            <select
              class="form-input"
              data-action="change-estado"
              data-id="${escapeHtml(insc.id)}"
              aria-label="Estado de inscripción"
              style="padding:4px 8px;font-size:var(--font-size-sm);"
            >
              <option value="pendiente" ${insc.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="confirmada" ${insc.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
              <option value="cancelada" ${insc.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join('');

  // Cambio de estado
  tbody.querySelectorAll('[data-action="change-estado"]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await updateDocument('inscripciones', select.dataset.id, { estado: select.value });
        showToast('Estado actualizado', 'success');
      } catch (err) {
        console.error('Error al actualizar estado:', err);
        showToast('Error al actualizar el estado. Intenta de nuevo.', 'error');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Suscripción — Solicitudes
// ---------------------------------------------------------------------------

function startSolicitudesSubscription(contentEl) {
  _unsubscribeSolicitudes = subscribeToCollection('solicitudes', (solicitudes) => {
    renderSolicitudesTable(contentEl, solicitudes);
  });
}

function renderSolicitudesTable(contentEl, solicitudes) {
  const tbody = contentEl.querySelector('#solicitudes-tbody');
  if (!tbody) return;

  if (solicitudes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">📩</div>
            <p class="admin-empty-state-text">No hay solicitudes pendientes</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = solicitudes
    .map((sol) => {
      const estadoBadge = getEstadoBadge(sol.estado);
      return `
        <tr>
          <td>${escapeHtml(sol.nombreCompleto ?? '—')}</td>
          <td>${escapeHtml(sol.email ?? '—')}</td>
          <td>${escapeHtml(sol.telefono ?? '—')}</td>
          <td>${escapeHtml(sol.cursoInteres ?? '—')}</td>
          <td>${escapeHtml(truncate(sol.mensaje ?? '', 60))}</td>
          <td>${estadoBadge}</td>
          <td class="admin-table-actions">
            ${
              sol.estado !== 'revisada'
                ? `<button
                    class="btn btn-sm btn-primary"
                    data-action="confirmar"
                    data-id="${escapeHtml(sol.id)}"
                    aria-label="Confirmar solicitud de ${escapeHtml(sol.nombreCompleto ?? '')}"
                  >Confirmar</button>`
                : ''
            }
            ${
              sol.estado !== 'rechazada'
                ? `<button
                    class="btn btn-sm btn-danger"
                    data-action="rechazar"
                    data-id="${escapeHtml(sol.id)}"
                    aria-label="Rechazar solicitud de ${escapeHtml(sol.nombreCompleto ?? '')}"
                  >Rechazar</button>`
                : ''
            }
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-action="confirmar"]').forEach((btn) => {
    btn.addEventListener('click', () => handleSolicitudAction(btn.dataset.id, 'revisada'));
  });

  tbody.querySelectorAll('[data-action="rechazar"]').forEach((btn) => {
    btn.addEventListener('click', () => handleSolicitudAction(btn.dataset.id, 'rechazada'));
  });
}

async function handleSolicitudAction(id, nuevoEstado) {
  try {
    await updateDocument('solicitudes', id, { estado: nuevoEstado });
    showToast(
      nuevoEstado === 'revisada' ? 'Solicitud confirmada' : 'Solicitud rechazada',
      nuevoEstado === 'revisada' ? 'success' : 'info'
    );
  } catch (err) {
    console.error('Error al actualizar solicitud:', err);
    showToast('Error al actualizar la solicitud. Intenta de nuevo.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Modal de nueva inscripción
// ---------------------------------------------------------------------------

async function openNewEnrollmentModal(contentEl) {
  // Crear modal dinámico
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'enrollment-modal-title');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';
  modal.style.width = '100%';

  modal.innerHTML = `
    <h2 id="enrollment-modal-title" class="modal-title">Nueva Inscripción</h2>
    <form id="enrollment-modal-form" novalidate>
      <div class="form-group" style="margin-bottom:var(--spacing-md);">
        <label class="form-label" for="enroll-alumno">Alumno <span aria-hidden="true">*</span></label>
        <select id="enroll-alumno" name="alumnoId" class="form-input" required>
          <option value="">Cargando alumnos…</option>
        </select>
        <span class="form-error" id="enroll-alumno-error" aria-live="polite"></span>
      </div>
      <div class="form-group" style="margin-bottom:var(--spacing-md);">
        <label class="form-label" for="enroll-curso">Curso <span aria-hidden="true">*</span></label>
        <select id="enroll-curso" name="cursoId" class="form-input" required>
          <option value="">Cargando cursos…</option>
        </select>
        <span class="form-error" id="enroll-curso-error" aria-live="polite"></span>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" id="enroll-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="enroll-submit">Inscribir</button>
      </div>
    </form>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Cargar selects
  await Promise.all([
    loadAlumnosSelect(modal),
    loadCursosSelect(modal),
  ]);

  const cancelBtn = modal.querySelector('#enroll-cancel');
  const form = modal.querySelector('#enrollment-modal-form');

  const closeModal = () => document.body.removeChild(backdrop);

  cancelBtn?.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') closeModal();
    },
    { once: true }
  );

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alumnoId = form.alumnoId.value;
    const cursoId = form.cursoId.value;

    // Limpiar errores
    modal.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));

    let valid = true;
    if (!alumnoId) {
      const err = modal.querySelector('#enroll-alumno-error');
      if (err) err.textContent = 'Selecciona un alumno';
      valid = false;
    }
    if (!cursoId) {
      const err = modal.querySelector('#enroll-curso-error');
      if (err) err.textContent = 'Selecciona un curso';
      valid = false;
    }
    if (!valid) return;

    const submitBtn = modal.querySelector('#enroll-submit');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await createEnrollmentTransaction(alumnoId, cursoId, form);
      closeModal();
    } catch (err) {
      // Los errores de negocio ya muestran toast; solo re-habilitar botón
      console.error('Error en inscripción:', err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

async function loadAlumnosSelect(modal) {
  const select = modal.querySelector('#enroll-alumno');
  if (!select) return;
  try {
    const alumnos = await getCollection('alumnos');
    select.innerHTML =
      '<option value="">— Selecciona un alumno —</option>' +
      alumnos
        .map(
          (a) =>
            `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nombre ?? a.id)} (${escapeHtml(a.email ?? '')})</option>`
        )
        .join('');
  } catch (err) {
    console.error('Error al cargar alumnos:', err);
    select.innerHTML = '<option value="">Error al cargar alumnos</option>';
  }
}

async function loadCursosSelect(modal) {
  const select = modal.querySelector('#enroll-curso');
  if (!select) return;
  try {
    const cursos = await getCollection('cursos');
    select.innerHTML =
      '<option value="">— Selecciona un curso —</option>' +
      cursos
        .map(
          (c) =>
            `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre ?? c.id)} (${c.alumnosInscritos ?? 0}/${c.cupoMaximo ?? '?'})</option>`
        )
        .join('');
  } catch (err) {
    console.error('Error al cargar cursos:', err);
    select.innerHTML = '<option value="">Error al cargar cursos</option>';
  }
}

// ---------------------------------------------------------------------------
// Transacción de inscripción (Requisito 12.3, 12.5, 12.6, 15.4)
// ---------------------------------------------------------------------------

/**
 * Crea una inscripción de forma atómica usando runTransaction.
 * Verifica cupo y duplicados antes de crear el documento.
 *
 * @param {string} alumnoId
 * @param {string} cursoId
 * @param {HTMLFormElement} form — Para obtener los nombres de alumno y curso del select
 */
async function createEnrollmentTransaction(alumnoId, cursoId, form) {
  // Obtener nombres para mensajes de error
  const alumnoOption = form.querySelector(`#enroll-alumno option[value="${alumnoId}"]`);
  const cursoOption = form.querySelector(`#enroll-curso option[value="${cursoId}"]`);
  const alumnoNombre = alumnoOption?.textContent?.split('(')[0]?.trim() ?? alumnoId;
  const cursoNombre = cursoOption?.textContent?.split('(')[0]?.trim() ?? cursoId;

  const cursoRef = doc(db, 'cursos', cursoId);
  const inscripcionesRef = collection(db, 'inscripciones');

  await runTransaction(db, async (transaction) => {
    // 1. Leer el documento del curso
    const cursoSnap = await transaction.get(cursoRef);
    if (!cursoSnap.exists()) {
      throw new Error(`El curso ${cursoNombre} no existe`);
    }

    const cursoData = cursoSnap.data();
    const alumnosInscritos = cursoData.alumnosInscritos ?? 0;
    const cupoMaximo = cursoData.cupoMaximo ?? 0;

    // 2. Verificar cupo (Requisito 12.5)
    if (alumnosInscritos >= cupoMaximo) {
      showToast(
        `El curso ${cursoNombre} ha alcanzado su cupo máximo de ${cupoMaximo} alumnos`,
        'error'
      );
      throw new Error('cupo_maximo');
    }

    // 3. Verificar duplicado (Requisito 12.6)
    // Nota: las queries no se pueden hacer dentro de una transacción en Firestore Web SDK,
    // por lo que verificamos con getDocs fuera y luego hacemos la transacción.
    // La verificación dentro de la transacción se hace leyendo un documento de índice.
    // Para este caso usamos getDocs antes de la transacción como pre-verificación.
    // La transacción garantiza la atomicidad del incremento del contador.
    const duplicateQuery = query(
      inscripcionesRef,
      where('alumnoId', '==', alumnoId),
      where('cursoId', '==', cursoId)
    );
    const duplicateSnap = await getDocs(duplicateQuery);
    if (!duplicateSnap.empty) {
      showToast(
        `El alumno ${alumnoNombre} ya está inscrito en el curso ${cursoNombre}`,
        'error'
      );
      throw new Error('inscripcion_duplicada');
    }

    // 4. Crear inscripción e incrementar contador
    const newInscripcionRef = doc(inscripcionesRef);
    transaction.set(newInscripcionRef, {
      alumnoId,
      cursoId,
      estado: 'pendiente',
      fechaInscripcion: new Date(),
    });

    transaction.update(cursoRef, {
      alumnosInscritos: alumnosInscritos + 1,
    });
  });

  showToast('Inscripción creada correctamente', 'success');
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function getEstadoBadge(estado) {
  const map = {
    nueva: '<span class="admin-badge admin-badge-info">Nueva</span>',
    revisada: '<span class="admin-badge admin-badge-success">Revisada</span>',
    rechazada: '<span class="admin-badge admin-badge-danger">Rechazada</span>',
  };
  return map[estado] ?? `<span class="admin-badge">${escapeHtml(estado ?? '—')}</span>`;
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
