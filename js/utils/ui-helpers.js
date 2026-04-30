/**
 * ui-helpers.js — Utilidades de interfaz de usuario
 *
 * Funciones reutilizables para mostrar notificaciones, modales y spinners
 * en cualquier página del sitio web escolar.
 */

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------

/**
 * Obtiene o crea el contenedor de toasts en el DOM.
 * @returns {HTMLElement} El contenedor de toasts.
 */
function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Muestra una notificación flotante (toast) que desaparece automáticamente.
 *
 * @param {string} message - El mensaje a mostrar.
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - El tipo de notificación.
 * @param {number} [duration=3000] - Duración en milisegundos antes de desaparecer.
 * @returns {HTMLElement} El elemento toast creado.
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Ícono según el tipo
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };
  const icon = icons[type] || icons.info;

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-eliminar después de la duración especificada
  const removeToast = () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  };

  const timer = setTimeout(removeToast, duration);

  // Permitir cerrar manualmente al hacer clic
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    removeToast();
  });

  return toast;
}

// --------------------------------------------------------------------------
// Modal de Confirmación
// --------------------------------------------------------------------------

/**
 * Muestra un modal de confirmación con título, mensaje y botones.
 *
 * @param {Object} config - Configuración del modal.
 * @param {string} config.title - Título del modal.
 * @param {string} config.message - Mensaje o descripción del modal.
 * @param {string} [config.confirmText='Confirmar'] - Texto del botón de confirmación.
 * @param {string} [config.cancelText='Cancelar'] - Texto del botón de cancelación.
 * @param {'primary'|'danger'} [config.confirmVariant='primary'] - Variante visual del botón de confirmación.
 * @returns {Promise<boolean>} Resuelve con `true` si el usuario confirma, `false` si cancela.
 */
export function showModal(config) {
  const {
    title = 'Confirmar acción',
    message = '¿Estás seguro?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmVariant = 'primary',
  } = config;

  return new Promise((resolve) => {
    // Crear el backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'modal-title');
    backdrop.setAttribute('aria-describedby', 'modal-message');

    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'modal';

    const confirmBtnClass = confirmVariant === 'danger'
      ? 'btn btn-danger'
      : 'btn btn-primary';

    modal.innerHTML = `
      <h2 id="modal-title" class="modal-title">${title}</h2>
      <p id="modal-message" class="modal-message">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" id="modal-cancel">${cancelText}</button>
        <button type="button" class="${confirmBtnClass}" id="modal-confirm">${confirmText}</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Enfocar el botón de cancelar por defecto (más seguro)
    const cancelBtn = modal.querySelector('#modal-cancel');
    const confirmBtn = modal.querySelector('#modal-confirm');

    cancelBtn.focus();

    // Función para cerrar el modal
    const closeModal = (result) => {
      document.body.removeChild(backdrop);
      resolve(result);
    };

    // Event listeners
    confirmBtn.addEventListener('click', () => closeModal(true));
    cancelBtn.addEventListener('click', () => closeModal(false));

    // Cerrar con Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        closeModal(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Cerrar al hacer clic fuera del modal
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(false);
      }
    });
  });
}

// --------------------------------------------------------------------------
// Spinner de Carga
// --------------------------------------------------------------------------

/**
 * Muestra un spinner de carga dentro del contenedor especificado.
 * Guarda el contenido original para restaurarlo con hideSpinner.
 *
 * @param {HTMLElement} container - El elemento contenedor donde mostrar el spinner.
 * @returns {void}
 */
export function showSpinner(container) {
  if (!container) return;

  // Guardar el contenido original como atributo de datos
  container.dataset.originalContent = container.innerHTML;
  container.setAttribute('aria-busy', 'true');

  container.innerHTML = `
    <div class="spinner-container" role="status" aria-label="Cargando...">
      <div class="spinner" aria-hidden="true"></div>
      <span class="sr-only">Cargando...</span>
    </div>
  `;
}

/**
 * Oculta el spinner de carga y restaura el contenido original del contenedor.
 *
 * @param {HTMLElement} container - El elemento contenedor donde ocultar el spinner.
 * @returns {void}
 */
export function hideSpinner(container) {
  if (!container) return;

  container.removeAttribute('aria-busy');

  // Restaurar el contenido original si existe
  if (container.dataset.originalContent !== undefined) {
    container.innerHTML = container.dataset.originalContent;
    delete container.dataset.originalContent;
  } else {
    // Si no hay contenido guardado, limpiar el spinner
    const spinnerContainer = container.querySelector('.spinner-container');
    if (spinnerContainer) {
      spinnerContainer.remove();
    }
  }
}
