/**
 * maestro-profile.js — Vistas del Panel del Maestro
 *
 * Exporta `initMaestroProfile(contentEl, user, section, cursoId?)` para renderizar
 * las distintas secciones del panel: perfil, secciones, cursos y alumnos.
 *
 * Requisitos: 17.1–17.10
 */

import { getCollection, getDocument, updateDocument } from '../utils/firestore-helpers.js';
import { showToast } from '../utils/ui-helpers.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../firebase-config.js';

// ---------------------------------------------------------------------------
// Función auxiliar: iniciales del nombre
// ---------------------------------------------------------------------------

/**
 * Extrae las iniciales de un nombre completo.
 * @param {string} nombre
 * @returns {string} Iniciales en mayúsculas (máx. 2 caracteres).
 */
export function getInitials(nombre) {
  if (!nombre || typeof nombre !== 'string') return '?';
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Función auxiliar: escape HTML
// ---------------------------------------------------------------------------

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Función auxiliar: obtener maestroId del usuario autenticado
// ---------------------------------------------------------------------------

/**
 * Obtiene el maestroId asociado al usuario autenticado.
 * Primero busca el campo `maestroId` en el documento de `usuarios/{uid}`.
 * Si no existe, busca en `maestros` donde `email === user.email`.
 *
 * @param {{ uid: string, email: string }} user
 * @returns {Promise<{ maestroId: string, maestroDoc: Object }|null>}
 */
async function getMaestroData(user) {
  // 1. Intentar obtener maestroId desde el documento de usuario
  try {
    const userDoc = await getDocument('usuarios', user.uid);
    if (userDoc?.maestroId) {
      const maestroDoc = await getDocument('maestros', userDoc.maestroId);
      if (maestroDoc) {
        return { maestroId: userDoc.maestroId, maestroDoc };
      }
    }
  } catch (err) {
    console.warn('No se pudo obtener maestroId desde usuarios:', err);
  }

  // 2. Fallback: buscar en maestros por email
  try {
    const q = query(collection(db, 'maestros'), where('email', '==', user.email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { maestroId: docSnap.id, maestroDoc: { id: docSnap.id, ...docSnap.data() } };
    }
  } catch (err) {
    console.warn('No se pudo buscar maestro por email:', err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Punto de entrada principal
// ---------------------------------------------------------------------------

/**
 * Inicializa y renderiza la sección indicada del panel del maestro.
 *
 * @param {HTMLElement} contentEl - Contenedor donde se renderiza el contenido.
 * @param {{ uid: string, email: string }} user - Usuario autenticado de Firebase Auth.
 * @param {'perfil'|'secciones'|'cursos'|'alumnos'} section - Sección a mostrar.
 * @param {string} [cursoId] - ID del curso (requerido para la vista 'alumnos').
 */
export async function initMaestroProfile(contentEl, user, section, cursoId) {
  if (!contentEl) return;

  // Mostrar spinner mientras carga
  contentEl.innerHTML = `
    <div class="spinner-container" role="status" aria-label="Cargando...">
      <div class="spinner" aria-hidden="true"></div>
      <span class="sr-only">Cargando...</span>
    </div>
  `;

  try {
    switch (section) {
      case 'perfil':
        await renderPerfil(contentEl, user);
        break;
      case 'secciones':
        await renderSecciones(contentEl, user);
        break;
      case 'cursos':
        await renderCursos(contentEl, user);
        break;
      case 'alumnos':
        await renderAlumnos(contentEl, user, cursoId);
        break;
      default:
        contentEl.innerHTML = `<p class="maestro-error">Sección desconocida: ${escapeHtml(section)}</p>`;
    }
  } catch (err) {
    console.error(`Error al cargar la sección "${section}":`, err);
    contentEl.innerHTML = `
      <div class="maestro-error-container" role="alert">
        <p class="maestro-error">No se pudo cargar la sección <strong>${escapeHtml(section)}</strong>. Verifica tu conexión e intenta de nuevo.</p>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Vista: Perfil
// ---------------------------------------------------------------------------

/**
 * Renderiza la vista de perfil del maestro.
 * Requisitos: 17.2, 17.3, 17.4
 *
 * @param {HTMLElement} contentEl
 * @param {{ uid: string, email: string }} user
 */
async function renderPerfil(contentEl, user) {
  const result = await getMaestroData(user);

  if (!result) {
    contentEl.innerHTML = `
      <div class="maestro-error-container" role="alert">
        <p class="maestro-error">No se encontró tu perfil de maestro. Contacta al administrador.</p>
      </div>
    `;
    return;
  }

  const { maestroId, maestroDoc } = result;
  renderPerfilUI(contentEl, maestroId, maestroDoc, user);
}

/**
 * Construye y monta el HTML del perfil del maestro.
 *
 * @param {HTMLElement} contentEl
 * @param {string} maestroId
 * @param {Object} maestro
 * @param {{ uid: string, email: string }} user
 */
function renderPerfilUI(contentEl, maestroId, maestro, user) {
  const nombre = maestro.nombre ?? '';
  const email = maestro.email ?? user.email ?? '';
  const especialidad = maestro.especialidad ?? '';
  const descripcion = maestro.descripcion ?? '';
  const fotoPerfil = maestro.fotoPerfil ?? '';
  const telefono = maestro.telefono ?? '';

  const avatarHtml = fotoPerfil
    ? `<img
        src="${escapeHtml(fotoPerfil)}"
        alt="Foto de perfil de ${escapeHtml(nombre)}"
        class="maestro-profile-photo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="maestro-profile-avatar" style="display:none;" aria-hidden="true">
        ${escapeHtml(getInitials(nombre))}
      </div>`
    : `<div class="maestro-profile-avatar" aria-label="Avatar de ${escapeHtml(nombre)}">
        ${escapeHtml(getInitials(nombre))}
      </div>`;

  contentEl.innerHTML = `
    <section class="maestro-perfil" aria-labelledby="perfil-heading">
      <h2 id="perfil-heading" class="maestro-section-title">Mi Perfil</h2>

      <div class="maestro-perfil-card">
        <div class="maestro-perfil-avatar-wrapper">
          ${avatarHtml}
        </div>

        <div class="maestro-perfil-info">
          <p class="maestro-perfil-nombre">${escapeHtml(nombre)}</p>
          <p class="maestro-perfil-email">${escapeHtml(email)}</p>
          ${especialidad ? `<p class="maestro-perfil-especialidad"><strong>Especialidad:</strong> ${escapeHtml(especialidad)}</p>` : ''}
          ${descripcion ? `<p class="maestro-perfil-descripcion">${escapeHtml(descripcion)}</p>` : ''}
        </div>
      </div>

      <button
        type="button"
        class="btn btn-primary maestro-btn-editar"
        id="btn-editar-perfil"
        aria-expanded="false"
        aria-controls="form-editar-perfil"
      >
        Editar perfil
      </button>

      <div id="form-editar-perfil" class="maestro-edit-form" hidden aria-live="polite">
        <h3 class="maestro-edit-form-title">Editar perfil</h3>
        <form id="perfil-form" novalidate>
          <div class="form-group">
            <label for="input-nombre" class="form-label">Nombre completo</label>
            <input
              type="text"
              id="input-nombre"
              name="nombre"
              class="form-input"
              value="${escapeHtml(nombre)}"
              required
              aria-required="true"
            />
          </div>
          <div class="form-group">
            <label for="input-telefono" class="form-label">Teléfono</label>
            <input
              type="tel"
              id="input-telefono"
              name="telefono"
              class="form-input"
              value="${escapeHtml(telefono)}"
            />
          </div>
          <div class="form-group">
            <label for="input-descripcion" class="form-label">Descripción</label>
            <textarea
              id="input-descripcion"
              name="descripcion"
              class="form-input"
              rows="4"
            >${escapeHtml(descripcion)}</textarea>
          </div>
          <div class="form-group">
            <label for="input-foto" class="form-label">URL de foto de perfil</label>
            <input
              type="url"
              id="input-foto"
              name="fotoPerfil"
              class="form-input"
              value="${escapeHtml(fotoPerfil)}"
              placeholder="https://..."
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
            <button type="button" class="btn btn-outline" id="btn-cancelar-edicion">Cancelar</button>
          </div>
        </form>
      </div>
    </section>
  `;

  // Toggle del formulario de edición
  const btnEditar = contentEl.querySelector('#btn-editar-perfil');
  const formContainer = contentEl.querySelector('#form-editar-perfil');

  btnEditar.addEventListener('click', () => {
    const isHidden = formContainer.hidden;
    formContainer.hidden = !isHidden;
    btnEditar.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) {
      formContainer.querySelector('#input-nombre')?.focus();
    }
  });

  const btnCancelar = contentEl.querySelector('#btn-cancelar-edicion');
  btnCancelar.addEventListener('click', () => {
    formContainer.hidden = true;
    btnEditar.setAttribute('aria-expanded', 'false');
  });

  // Envío del formulario
  const form = contentEl.querySelector('#perfil-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    const data = {
      nombre: form.nombre.value.trim(),
      telefono: form.telefono.value.trim(),
      descripcion: form.descripcion.value.trim(),
      fotoPerfil: form.fotoPerfil.value.trim(),
    };

    try {
      await updateDocument('maestros', maestroId, data);
      showToast('Perfil actualizado', 'success');
      // Re-renderizar con los datos actualizados
      const updatedMaestro = { ...maestro, ...data };
      renderPerfilUI(contentEl, maestroId, updatedMaestro, user);
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      showToast('Error al actualizar el perfil', 'error');
      submitBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Vista: Secciones
// ---------------------------------------------------------------------------

/**
 * Renderiza la lista de secciones académicas asignadas al maestro.
 * Requisito: 17.5
 *
 * @param {HTMLElement} contentEl
 * @param {{ uid: string, email: string }} user
 */
async function renderSecciones(contentEl, user) {
  const result = await getMaestroData(user);

  if (!result) {
    contentEl.innerHTML = `
      <div class="maestro-error-container" role="alert">
        <p class="maestro-error">No se encontró tu perfil de maestro. Contacta al administrador.</p>
      </div>
    `;
    return;
  }

  const { maestroId } = result;

  // Consultar secciones donde maestroId === maestroId
  const q = query(collection(db, 'secciones'), where('maestroId', '==', maestroId));
  const snapshot = await getDocs(q);
  const secciones = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (secciones.length === 0) {
    contentEl.innerHTML = `
      <section class="maestro-secciones" aria-labelledby="secciones-heading">
        <h2 id="secciones-heading" class="maestro-section-title">Mis Secciones</h2>
        <p class="maestro-empty-state">No tienes secciones asignadas actualmente.</p>
      </section>
    `;
    return;
  }

  const itemsHtml = secciones
    .map(
      (sec) => `
      <li class="maestro-seccion-item">
        ${sec.icono ? `<span class="maestro-seccion-icono" aria-hidden="true">${escapeHtml(sec.icono)}</span>` : ''}
        <div class="maestro-seccion-info">
          <h3 class="maestro-seccion-nombre">${escapeHtml(sec.nombre ?? '')}</h3>
          ${sec.descripcion ? `<p class="maestro-seccion-descripcion">${escapeHtml(sec.descripcion)}</p>` : ''}
        </div>
      </li>
    `
    )
    .join('');

  contentEl.innerHTML = `
    <section class="maestro-secciones" aria-labelledby="secciones-heading">
      <h2 id="secciones-heading" class="maestro-section-title">Mis Secciones</h2>
      <ul class="maestro-secciones-list" role="list">
        ${itemsHtml}
      </ul>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Vista: Cursos
// ---------------------------------------------------------------------------

/**
 * Renderiza la lista de cursos asignados al maestro.
 * Requisito: 17.6
 *
 * @param {HTMLElement} contentEl
 * @param {{ uid: string, email: string }} user
 */
async function renderCursos(contentEl, user) {
  const result = await getMaestroData(user);

  if (!result) {
    contentEl.innerHTML = `
      <div class="maestro-error-container" role="alert">
        <p class="maestro-error">No se encontró tu perfil de maestro. Contacta al administrador.</p>
      </div>
    `;
    return;
  }

  const { maestroId } = result;

  // Consultar cursos donde maestroId === maestroId
  const q = query(collection(db, 'cursos'), where('maestroId', '==', maestroId));
  const snapshot = await getDocs(q);
  const cursos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (cursos.length === 0) {
    contentEl.innerHTML = `
      <section class="maestro-cursos" aria-labelledby="cursos-heading">
        <h2 id="cursos-heading" class="maestro-section-title">Mis Cursos</h2>
        <p class="maestro-empty-state">No tienes cursos asignados actualmente.</p>
      </section>
    `;
    return;
  }

  const itemsHtml = cursos
    .map(
      (curso) => `
      <li class="maestro-curso-item" role="listitem">
        <button
          type="button"
          class="maestro-curso-btn"
          data-curso-id="${escapeHtml(curso.id)}"
          aria-label="Ver alumnos del curso ${escapeHtml(curso.nombre ?? '')}"
        >
          <div class="maestro-curso-info">
            <h3 class="maestro-curso-nombre">${escapeHtml(curso.nombre ?? '')}</h3>
            ${curso.descripcion ? `<p class="maestro-curso-descripcion">${escapeHtml(curso.descripcion)}</p>` : ''}
            <div class="maestro-curso-meta">
              ${curso.cupoMaximo != null ? `<span class="maestro-curso-cupo">Cupo máximo: ${escapeHtml(String(curso.cupoMaximo))}</span>` : ''}
              ${curso.inscritos != null ? `<span class="maestro-curso-inscritos">Inscritos: ${escapeHtml(String(curso.inscritos))}</span>` : ''}
            </div>
          </div>
          <span class="maestro-curso-arrow" aria-hidden="true">›</span>
        </button>
      </li>
    `
    )
    .join('');

  contentEl.innerHTML = `
    <section class="maestro-cursos" aria-labelledby="cursos-heading">
      <h2 id="cursos-heading" class="maestro-section-title">Mis Cursos</h2>
      <ul class="maestro-cursos-list" role="list">
        ${itemsHtml}
      </ul>
    </section>
  `;

  // Eventos de click en cada curso
  contentEl.querySelectorAll('.maestro-curso-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.cursoId;
      if (id) {
        initMaestroProfile(contentEl, user, 'alumnos', id);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Vista: Alumnos
// ---------------------------------------------------------------------------

/**
 * Renderiza la lista de alumnos inscritos en un curso específico.
 * Requisitos: 17.7
 *
 * @param {HTMLElement} contentEl
 * @param {{ uid: string, email: string }} user
 * @param {string} [cursoId]
 */
async function renderAlumnos(contentEl, user, cursoId) {
  if (!cursoId) {
    contentEl.innerHTML = `
      <div class="maestro-error-container" role="alert">
        <p class="maestro-error">No se especificó un curso. Selecciona un curso desde "Mis Cursos".</p>
      </div>
    `;
    return;
  }

  // Consultar inscripciones del curso
  const q = query(collection(db, 'inscripciones'), where('cursoId', '==', cursoId));
  const inscSnapshot = await getDocs(q);
  const inscripciones = inscSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Botón de regreso
  const backBtnHtml = `
    <button type="button" class="btn btn-outline maestro-btn-volver" id="btn-volver-cursos">
      ← Volver a mis cursos
    </button>
  `;

  if (inscripciones.length === 0) {
    contentEl.innerHTML = `
      <section class="maestro-alumnos" aria-labelledby="alumnos-heading">
        <h2 id="alumnos-heading" class="maestro-section-title">Alumnos inscritos</h2>
        ${backBtnHtml}
        <p class="maestro-empty-state">No hay alumnos inscritos en este curso.</p>
      </section>
    `;
    attachBackButton(contentEl, user);
    return;
  }

  // Obtener datos de cada alumno
  const alumnosData = await Promise.all(
    inscripciones.map(async (insc) => {
      if (!insc.alumnoId) return null;
      try {
        return await getDocument('alumnos', insc.alumnoId);
      } catch {
        return null;
      }
    })
  );

  const alumnos = alumnosData.filter(Boolean);

  if (alumnos.length === 0) {
    contentEl.innerHTML = `
      <section class="maestro-alumnos" aria-labelledby="alumnos-heading">
        <h2 id="alumnos-heading" class="maestro-section-title">Alumnos inscritos</h2>
        ${backBtnHtml}
        <p class="maestro-empty-state">No hay alumnos inscritos en este curso.</p>
      </section>
    `;
    attachBackButton(contentEl, user);
    return;
  }

  const rowsHtml = alumnos
    .map(
      (alumno) => `
      <tr>
        <td data-label="Nombre">${escapeHtml(alumno.nombre ?? '')}</td>
        <td data-label="Email">${escapeHtml(alumno.email ?? '')}</td>
        <td data-label="Teléfono">${escapeHtml(alumno.telefono ?? '')}</td>
      </tr>
    `
    )
    .join('');

  contentEl.innerHTML = `
    <section class="maestro-alumnos" aria-labelledby="alumnos-heading">
      <h2 id="alumnos-heading" class="maestro-section-title">Alumnos inscritos</h2>
      ${backBtnHtml}
      <div class="maestro-table-wrapper" role="region" aria-label="Lista de alumnos" tabindex="0">
        <table class="maestro-alumnos-table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Email</th>
              <th scope="col">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </section>
  `;

  attachBackButton(contentEl, user);
}

/**
 * Adjunta el evento del botón "Volver a mis cursos".
 * @param {HTMLElement} contentEl
 * @param {{ uid: string, email: string }} user
 */
function attachBackButton(contentEl, user) {
  const btn = contentEl.querySelector('#btn-volver-cursos');
  if (btn) {
    btn.addEventListener('click', () => {
      initMaestroProfile(contentEl, user, 'cursos');
    });
  }
}
