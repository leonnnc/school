/**
 * administrators.js — CRUD de Administradores
 *
 * Gestión de cuentas de administrador:
 *  - Listar administradores desde la colección `usuarios` (rol: 'admin')
 *  - Crear: crea documento en `usuarios` con rol 'admin' y muestra instrucciones
 *    para crear la cuenta en Firebase Console (el Admin SDK no está disponible en cliente)
 *  - Editar: solo nombre y estado (activo/inactivo)
 *  - Eliminar: verifica que no sea la propia cuenta antes de eliminar
 *
 * Requisitos: 16.1–16.9
 */

import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../utils/firestore-helpers.js';
import { isValidEmail, isNonEmptyString } from '../utils/validators.js';
import { showToast, showModal } from '../utils/ui-helpers.js';
import { auth } from '../firebase-config.js';

// ---------------------------------------------------------------------------
// Estado del módulo
// ---------------------------------------------------------------------------

let _allAdmins = [];
let _unsubscribe = null;
let _editingId = null;

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Administradores en el elemento contenedor dado.
 * @param {HTMLElement} contentEl — Elemento #admin-content
 */
export function initAdministratorsSection(contentEl) {
  // Cancelar suscripción previa si existe
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _allAdmins = [];
  _editingId = null;

  contentEl.innerHTML = buildLayout();

  const newBtn = contentEl.querySelector('#btn-new-admin');
  const drawer = contentEl.querySelector('#admins-drawer');
  const form = contentEl.querySelector('#admins-form');
  const cancelBtn = contentEl.querySelector('#btn-cancel-admin');

  // Suscripción en tiempo real — solo usuarios con rol 'admin'
  // Nota: el filtro por rol se hace en el cliente ya que las reglas de Firestore
  // restringen la lectura de `usuarios` a admins autenticados.
  _unsubscribe = subscribeToCollection('usuarios', (usuarios) => {
    _allAdmins = usuarios.filter((u) => u.rol === 'admin');
    renderTable(contentEl, _allAdmins);
  });

  // Abrir formulario de nuevo admin
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
// Layout HTML
// ---------------------------------------------------------------------------

function buildLayout() {
  return `
    <div class="admin-content-header">
      <h2 class="admin-content-title">Administradores</h2>
      <button id="btn-new-admin" class="btn btn-primary" type="button">
        + Nuevo Administrador
      </button>
    </div>

    <div class="admin-table-wrapper">
      <table class="admin-table" aria-label="Tabla de administradores">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Email</th>
            <th scope="col">Fecha de Creación</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody id="admins-tbody">
          <tr>
            <td colspan="5" class="admin-loading">Cargando administradores…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawer de formulario -->
    <div id="admins-drawer" class="admin-form-drawer" role="dialog" aria-modal="true" aria-labelledby="admins-drawer-title">
      <h3 id="admins-drawer-title" class="admin-form-panel-title">Nuevo Administrador</h3>
      <form id="admins-form" novalidate>
        <div class="form-group" id="admins-new-fields">
          <!-- Campos solo para creación -->
          <div class="form-group">
            <label class="form-label" for="admin-email">Email <span aria-hidden="true">*</span></label>
            <input id="admin-email" name="email" type="email" class="form-input" required autocomplete="email" />
            <span class="form-error" id="admin-email-error" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="admin-password">Contraseña temporal <span aria-hidden="true">*</span></label>
            <input id="admin-password" name="password" type="password" class="form-input" required autocomplete="new-password" minlength="6" />
            <span class="form-error" id="admin-password-error" aria-live="polite"></span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="admin-nombre">Nombre completo <span aria-hidden="true">*</span></label>
          <input id="admin-nombre" name="nombre" type="text" class="form-input" required autocomplete="name" />
          <span class="form-error" id="admin-nombre-error" aria-live="polite"></span>
        </div>
        <div class="form-group" id="admins-estado-group" hidden>
          <label class="form-label" for="admin-estado">Estado</label>
          <select id="admin-estado" name="estado" class="form-input">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div class="admin-form-panel-actions">
          <button id="btn-cancel-admin" type="button" class="btn btn-outline">Cancelar</button>
          <button id="btn-submit-admin" type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Renderizado de la tabla
// ---------------------------------------------------------------------------

function renderTable(contentEl, admins) {
  const tbody = contentEl.querySelector('#admins-tbody');
  if (!tbody) return;

  if (admins.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="admin-empty-state">
            <div class="admin-empty-state-icon" aria-hidden="true">🔐</div>
            <p class="admin-empty-state-text">No se encontraron administradores</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = admins
    .map((a) => {
      const fecha = a.creadoEn?.toDate
        ? a.creadoEn.toDate().toLocaleDateString('es-MX')
        : '—';
      const estadoBadge =
        a.estado === 'activo'
          ? '<span class="admin-badge admin-badge-success">Activo</span>'
          : '<span class="admin-badge admin-badge-danger">Inactivo</span>';

      return `
        <tr>
          <td>${escapeHtml(a.nombre ?? '—')}</td>
          <td>${escapeHtml(a.email ?? '—')}</td>
          <td>${escapeHtml(fecha)}</td>
          <td>${estadoBadge}</td>
          <td class="admin-table-actions">
            <button
              class="btn btn-sm btn-outline"
              data-action="edit"
              data-id="${escapeHtml(a.id)}"
              aria-label="Editar administrador ${escapeHtml(a.nombre ?? '')}"
            >Editar</button>
            <button
              class="btn btn-sm btn-danger"
              data-action="delete"
              data-id="${escapeHtml(a.id)}"
              data-nombre="${escapeHtml(a.nombre ?? '')}"
              aria-label="Eliminar administrador ${escapeHtml(a.nombre ?? '')}"
            >Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const admin = _allAdmins.find((a) => a.id === btn.dataset.id);
      if (!admin) return;
      _editingId = admin.id;
      const drawer = document.querySelector('#admins-drawer');
      openDrawer(drawer, admin);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.nombre));
  });
}

// ---------------------------------------------------------------------------
// Drawer (panel lateral)
// ---------------------------------------------------------------------------

function openDrawer(drawer, admin) {
  if (!drawer) return;

  const title = drawer.querySelector('#admins-drawer-title');
  const nombreInput = drawer.querySelector('#admin-nombre');
  const emailInput = drawer.querySelector('#admin-email');
  const passwordInput = drawer.querySelector('#admin-password');
  const estadoSelect = drawer.querySelector('#admin-estado');
  const newFields = drawer.querySelector('#admins-new-fields');
  const estadoGroup = drawer.querySelector('#admins-estado-group');

  if (admin) {
    // Modo edición: solo nombre y estado
    if (title) title.textContent = 'Editar Administrador';
    if (nombreInput) nombreInput.value = admin.nombre ?? '';
    if (estadoSelect) estadoSelect.value = admin.estado ?? 'activo';
    // Ocultar campos de creación
    if (newFields) newFields.hidden = true;
    if (emailInput) emailInput.removeAttribute('required');
    if (passwordInput) passwordInput.removeAttribute('required');
    // Mostrar campo de estado
    if (estadoGroup) estadoGroup.hidden = false;
  } else {
    // Modo creación
    if (title) title.textContent = 'Nuevo Administrador';
    drawer.querySelector('#admins-form')?.reset();
    if (newFields) newFields.hidden = false;
    if (emailInput) emailInput.setAttribute('required', '');
    if (passwordInput) passwordInput.setAttribute('required', '');
    if (estadoGroup) estadoGroup.hidden = true;
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
  const email = form.email?.value?.trim() ?? '';
  const password = form.password?.value ?? '';
  const estado = form.estado?.value ?? 'activo';

  clearErrors(drawer);

  let valid = true;

  if (!isNonEmptyString(nombre)) {
    showFieldError(drawer, 'admin-nombre-error', 'Este campo es requerido');
    valid = false;
  }

  if (!_editingId) {
    // Validaciones solo para creación
    if (!isNonEmptyString(email)) {
      showFieldError(drawer, 'admin-email-error', 'Este campo es requerido');
      valid = false;
    } else if (!isValidEmail(email)) {
      showFieldError(drawer, 'admin-email-error', 'Ingresa un correo electrónico válido');
      valid = false;
    }
    if (password.length < 6) {
      showFieldError(drawer, 'admin-password-error', 'La contraseña debe tener al menos 6 caracteres');
      valid = false;
    }
  }

  if (!valid) return;

  const submitBtn = drawer.querySelector('#btn-submit-admin');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (_editingId) {
      // Editar: solo nombre y estado (Requisito 16.4, 16.5)
      await updateDocument('usuarios', _editingId, { nombre, estado });
      showToast('Administrador actualizado correctamente', 'success');
      closeDrawer(drawer);
    } else {
      // Crear: guardar en `usuarios` con rol 'admin' (Requisito 16.3)
      // El Admin SDK no está disponible en el cliente, por lo que creamos el documento
      // en Firestore y mostramos instrucciones para crear la cuenta en Firebase Console.
      await createDocument('usuarios', {
        nombre,
        email,
        rol: 'admin',
        estado: 'activo',
      });

      closeDrawer(drawer);

      // Mostrar instrucciones para crear la cuenta en Firebase Console
      await showModal({
        title: 'Administrador registrado',
        message: `El perfil de "${nombre}" ha sido creado en la base de datos con rol admin. Para activar el acceso, crea la cuenta en Firebase Console → Authentication → Add user con el email "${email}" y la contraseña temporal proporcionada.`,
        confirmText: 'Entendido',
        cancelText: '',
      });

      showToast('Administrador creado. Recuerda crear la cuenta en Firebase Console.', 'info', 6000);
    }
  } catch (err) {
    console.error('Error al guardar administrador:', err);
    showToast('Error al guardar el administrador. Intenta de nuevo.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Eliminación
// ---------------------------------------------------------------------------

async function handleDelete(id, nombre) {
  // Verificar que no sea la propia cuenta (Requisito 16.8)
  const currentUid = auth.currentUser?.uid;
  if (currentUid && currentUid === id) {
    showToast('No puedes eliminar tu propia cuenta de administrador', 'error');
    return;
  }

  const confirmed = await showModal({
    title: '¿Eliminar administrador?',
    message: `¿Estás seguro de que deseas eliminar al administrador ${escapeHtml(nombre)}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    confirmVariant: 'danger',
  });

  if (!confirmed) return;

  try {
    await deleteDocument('usuarios', id);
    showToast('Administrador eliminado correctamente', 'success');
  } catch (err) {
    console.error('Error al eliminar administrador:', err);
    showToast('Error al eliminar el administrador. Intenta de nuevo.', 'error');
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
