/**
 * registration-form.js — Formulario público de registro a cursos
 *
 * Requisitos: 8.1–8.7
 *
 * Funciones exportadas:
 *   - initRegistrationForm() → Inicializa el formulario con cursos de Firestore y validación
 */

import { getCollection, createDocument } from '../utils/firestore-helpers.js';
import { isValidEmail, isNonEmptyString } from '../utils/validators.js';

/**
 * Inicializa el formulario de registro en #registration-form.
 * Carga los cursos disponibles desde Firestore para el <select>.
 * Valida los campos y guarda la solicitud en la colección `solicitudes`.
 */
export async function initRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  // Renderizar el HTML del formulario
  _renderFormHTML(form);

  // Cargar cursos en el <select> (Req. 8.2)
  await _loadCursos();

  // Registrar validación en tiempo real y envío
  _attachEventListeners(form);
}

/**
 * Renderiza el HTML interno del formulario.
 * @param {HTMLFormElement} form
 */
function _renderFormHTML(form) {
  form.innerHTML = `
    <!-- Mensaje de éxito (oculto por defecto) -->
    <div id="form-success-msg" class="form-success hidden" role="alert" aria-live="polite"></div>

    <!-- Nombre completo -->
    <div class="form-group" id="group-nombre">
      <label class="form-label" for="reg-nombre">
        Nombre completo <span aria-hidden="true">*</span>
      </label>
      <input
        class="form-input"
        type="text"
        id="reg-nombre"
        name="nombreCompleto"
        autocomplete="name"
        required
        aria-required="true"
        aria-describedby="error-nombre"
      >
      <span class="form-field-error-message hidden" id="error-nombre" role="alert"></span>
    </div>

    <!-- Correo electrónico -->
    <div class="form-group" id="group-email">
      <label class="form-label" for="reg-email">
        Correo electrónico <span aria-hidden="true">*</span>
      </label>
      <input
        class="form-input"
        type="email"
        id="reg-email"
        name="email"
        autocomplete="email"
        required
        aria-required="true"
        aria-describedby="error-email"
      >
      <span class="form-field-error-message hidden" id="error-email" role="alert"></span>
    </div>

    <!-- Teléfono -->
    <div class="form-group" id="group-telefono">
      <label class="form-label" for="reg-telefono">
        Teléfono <span aria-hidden="true">*</span>
      </label>
      <input
        class="form-input"
        type="tel"
        id="reg-telefono"
        name="telefono"
        autocomplete="tel"
        required
        aria-required="true"
        aria-describedby="error-telefono"
      >
      <span class="form-field-error-message hidden" id="error-telefono" role="alert"></span>
    </div>

    <!-- Curso de interés -->
    <div class="form-group" id="group-curso">
      <label class="form-label" for="reg-curso">
        Curso de interés <span aria-hidden="true">*</span>
      </label>
      <select
        class="form-select"
        id="reg-curso"
        name="cursoInteres"
        required
        aria-required="true"
        aria-describedby="error-curso"
      >
        <option value="">Cargando cursos...</option>
      </select>
      <span class="form-field-error-message hidden" id="error-curso" role="alert"></span>
    </div>

    <!-- Mensaje opcional (fila completa) -->
    <div class="form-group form-group--full" id="group-mensaje">
      <label class="form-label" for="reg-mensaje">Mensaje (opcional)</label>
      <textarea
        class="form-textarea"
        id="reg-mensaje"
        name="mensaje"
        rows="3"
        placeholder="¿Tienes alguna pregunta o comentario?"
      ></textarea>
    </div>

    <!-- Botón de envío (fila completa) -->
    <div class="form-submit-col">
      <button type="submit" class="btn btn-primary btn-full" id="btn-submit-registro">
        Enviar solicitud
      </button>
    </div>
  `;
}

/**
 * Carga los cursos desde Firestore y los inserta en el <select>.
 */
async function _loadCursos() {
  const select = document.getElementById('reg-curso');
  if (!select) return;

  try {
    const cursos = await getCollection('cursos');
    select.innerHTML = '<option value="">Selecciona un curso</option>';

    if (cursos.length === 0) {
      select.innerHTML = '<option value="">No hay cursos disponibles</option>';
      return;
    }

    cursos.forEach((curso) => {
      const option = document.createElement('option');
      option.value = curso.id;
      option.textContent = curso.nombre || curso.id;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar cursos:', error);
    select.innerHTML = '<option value="">Error al cargar cursos</option>';
  }
}

/**
 * Registra los event listeners de validación en tiempo real y envío del formulario.
 * @param {HTMLFormElement} form
 */
function _attachEventListeners(form) {
  // Validación en tiempo real al salir de cada campo
  const fields = ['reg-nombre', 'reg-email', 'reg-telefono', 'reg-curso'];
  fields.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('blur', () => _validateField(input));
      input.addEventListener('input', () => {
        // Limpiar error al escribir
        const group = input.closest('.form-group');
        if (group && group.classList.contains('form-field-error')) {
          _clearFieldError(input);
        }
      });
    }
  });

  // Envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleSubmit(form);
  });
}

/**
 * Valida un campo individual y muestra/oculta el mensaje de error.
 * @param {HTMLElement} input
 * @returns {boolean} true si el campo es válido
 */
function _validateField(input) {
  const id = input.id;
  const value = input.value;

  if (id === 'reg-email') {
    if (!isNonEmptyString(value)) {
      return _setFieldError(input, 'Este campo es requerido');
    }
    if (!isValidEmail(value)) {
      return _setFieldError(input, 'Ingresa un correo electrónico válido');
    }
    _clearFieldError(input);
    return true;
  }

  // Campos requeridos genéricos
  if (!isNonEmptyString(value)) {
    return _setFieldError(input, 'Este campo es requerido');
  }

  _clearFieldError(input);
  return true;
}

/**
 * Marca un campo con error y muestra el mensaje.
 * @param {HTMLElement} input
 * @param {string} message
 * @returns {false}
 */
function _setFieldError(input, message) {
  const group = input.closest('.form-group');
  if (group) group.classList.add('form-field-error');

  const errorEl = document.getElementById(`error-${input.id.replace('reg-', '')}`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
  return false;
}

/**
 * Limpia el error de un campo.
 * @param {HTMLElement} input
 */
function _clearFieldError(input) {
  const group = input.closest('.form-group');
  if (group) group.classList.remove('form-field-error');

  const errorEl = document.getElementById(`error-${input.id.replace('reg-', '')}`);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
}

/**
 * Maneja el envío del formulario: valida, guarda en Firestore y muestra feedback.
 * @param {HTMLFormElement} form
 */
async function _handleSubmit(form) {
  // Ocultar mensaje de éxito previo
  const successMsg = document.getElementById('form-success-msg');
  if (successMsg) successMsg.classList.add('hidden');

  // Validar todos los campos requeridos
  const nombreInput = document.getElementById('reg-nombre');
  const emailInput = document.getElementById('reg-email');
  const telefonoInput = document.getElementById('reg-telefono');
  const cursoInput = document.getElementById('reg-curso');

  const validNombre = _validateField(nombreInput);
  const validEmail = _validateField(emailInput);
  const validTelefono = _validateField(telefonoInput);
  const validCurso = _validateField(cursoInput);

  // Si algún campo es inválido, no enviar (Req. 8.5, 8.6)
  if (!validNombre || !validEmail || !validTelefono || !validCurso) {
    // Enfocar el primer campo con error
    const firstError = form.querySelector('.form-field-error .form-input, .form-field-error .form-select');
    if (firstError) firstError.focus();
    return;
  }

  // Deshabilitar botón durante el envío
  const submitBtn = document.getElementById('btn-submit-registro');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
  }

  // Recopilar datos del formulario
  const solicitud = {
    nombreCompleto: nombreInput.value.trim(),
    email: emailInput.value.trim(),
    telefono: telefonoInput.value.trim(),
    cursoInteres: cursoInput.value,
    mensaje: document.getElementById('reg-mensaje')?.value?.trim() || '',
    estado: 'nueva',
  };

  try {
    // Guardar en Firestore (Req. 8.3)
    await createDocument('solicitudes', solicitud);

    // Mostrar mensaje de éxito (Req. 8.4)
    if (successMsg) {
      successMsg.textContent = 'Tu solicitud ha sido enviada. Nos pondremos en contacto contigo pronto.';
      successMsg.classList.remove('hidden');
    }

    // Limpiar el formulario
    form.reset();

    // Restaurar el select con la opción por defecto
    if (cursoInput) cursoInput.selectedIndex = 0;

    // Scroll al mensaje de éxito
    if (successMsg) successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (error) {
    console.error('Error al enviar solicitud:', error);

    // Mostrar error sin perder los datos (Req. 8.7)
    if (successMsg) {
      successMsg.textContent = 'Ocurrió un error al enviar tu solicitud. Intenta de nuevo más tarde.';
      successMsg.classList.remove('hidden');
      successMsg.style.backgroundColor = '#fde8ea';
      successMsg.style.borderColor = 'var(--color-error)';
      successMsg.style.color = 'var(--color-error)';
    }
  } finally {
    // Rehabilitar botón
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar solicitud';
    }
  }
}
