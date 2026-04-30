/**
 * content-manager.js — Gestión de Contenido del Sitio Web (Admin)
 *
 * Sin Firebase Storage — las imágenes se gestionan por URL externa.
 * Los videos soportan YouTube (URL/ID) y URL directa de video (mp4/webm).
 *
 * Requisitos: 18.1–18.14, 15.6
 */

import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { getCollection, createDocument, updateDocument, deleteDocument } from '../utils/firestore-helpers.js';
import { isValidYouTubeUrl, buildYouTubeEmbedUrl } from '../utils/validators.js';
import { showToast, showModal } from '../utils/ui-helpers.js';

// ---------------------------------------------------------------------------
// Helpers
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
// Entry point
// ---------------------------------------------------------------------------

/**
 * Inicializa la sección de Gestión de Contenido del Sitio en el panel admin.
 * Renderiza tabs para las 5 sub-secciones y activa la primera por defecto.
 *
 * @param {HTMLElement} contentEl - Contenedor principal del panel admin.
 */
export function initContentSection(contentEl) {
  const tabs = [
    { key: 'carrusel', label: 'Carrusel' },
    { key: 'scroll', label: 'Scroll Horizontal' },
    { key: 'bienvenida', label: 'Bienvenida' },
    { key: 'footer', label: 'Footer' },
    { key: 'videos', label: 'Videos' },
  ];

  contentEl.innerHTML = `
    <div class="admin-section-header">
      <h2 class="admin-section-title">Gestión de Contenido del Sitio</h2>
    </div>
    <nav class="content-tabs" role="tablist" aria-label="Secciones de contenido">
      ${tabs
        .map(
          (t, i) => `
        <button
          class="content-tab-btn${i === 0 ? ' active' : ''}"
          role="tab"
          aria-selected="${i === 0 ? 'true' : 'false'}"
          aria-controls="content-tab-panel"
          data-tab="${t.key}"
          type="button"
        >${escapeHtml(t.label)}</button>
      `
        )
        .join('')}
    </nav>
    <div id="content-tab-panel" class="content-tab-panel" role="tabpanel"></div>
  `;

  const tabPanel = contentEl.querySelector('#content-tab-panel');
  const tabBtns = contentEl.querySelectorAll('.content-tab-btn');

  function activateTab(key) {
    tabBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderTabContent(key, tabPanel);
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Activate first tab by default
  activateTab('carrusel');
}

// ---------------------------------------------------------------------------
// Tab router
// ---------------------------------------------------------------------------

/**
 * Renderiza el contenido de la sub-sección seleccionada.
 * @param {string} key
 * @param {HTMLElement} panel
 */
function renderTabContent(key, panel) {
  panel.innerHTML = '<div class="spinner-container" role="status" aria-label="Cargando..."><div class="spinner" aria-hidden="true"></div><span class="sr-only">Cargando...</span></div>';

  switch (key) {
    case 'carrusel':
      initCarruselSection(panel);
      break;
    case 'scroll':
      initScrollSection(panel);
      break;
    case 'bienvenida':
      initBienvenidaSection(panel);
      break;
    case 'footer':
      initFooterSection(panel);
      break;
    case 'videos':
      initVideosSection(panel);
      break;
    default:
      panel.innerHTML = '<p>Sección no encontrada.</p>';
  }
}

// ---------------------------------------------------------------------------
// Sub-sección 1: Carrusel
// ---------------------------------------------------------------------------

/**
 * Inicializa la gestión del Carrusel Principal.
 * Carga imágenes desde Firestore, permite subir, reordenar y eliminar.
 * Requisitos: 18.2, 18.3
 *
 * @param {HTMLElement} panel
 */
async function initCarruselSection(panel) {
  await initImageGallerySection({
    panel,
    firestoreDoc: 'carrusel',
    title: 'Carrusel Principal',
  });
}

// ---------------------------------------------------------------------------
// Sub-sección 2: Scroll Horizontal
// ---------------------------------------------------------------------------

/**
 * Inicializa la gestión del Scroll Horizontal.
 * Igual que Carrusel pero para scroll_horizontal.
 * Requisitos: 18.4
 *
 * @param {HTMLElement} panel
 */
async function initScrollSection(panel) {
  await initImageGallerySection({
    panel,
    firestoreDoc: 'scroll_horizontal',
    title: 'Scroll Horizontal',
  });
}

// ---------------------------------------------------------------------------
// Shared image gallery section (Carrusel + Scroll Horizontal)
// ---------------------------------------------------------------------------

/**
 * Lógica compartida para gestionar galerías de imágenes (Carrusel y Scroll Horizontal).
 * Las imágenes se agregan por URL externa (sin Firebase Storage).
 */
async function initImageGallerySection({ panel, firestoreDoc, title }) {
  let imagenes = [];
  try {
    const snap = await getDoc(doc(db, 'contenido_sitio', firestoreDoc));
    if (snap.exists()) {
      imagenes = snap.data().imagenes ?? [];
    }
  } catch (err) {
    panel.innerHTML = `<p class="admin-error">Error al cargar las imágenes: ${escapeHtml(err.message)}</p>`;
    return;
  }

  renderImageGallery({ panel, imagenes, firestoreDoc, title });
}

function renderImageGallery({ panel, imagenes, firestoreDoc, title }) {
  panel.innerHTML = `
    <section class="content-subsection" aria-label="${escapeHtml(title)}">
      <h3 class="content-subsection-title">${escapeHtml(title)}</h3>

      <div class="image-list" id="img-list-${firestoreDoc}" aria-label="Lista de imágenes actuales">
        ${imagenes.length === 0
          ? '<p class="admin-empty-state">No hay imágenes cargadas.</p>'
          : imagenes.map((img, idx) => `
            <div class="image-list-item" data-index="${idx}">
              <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt ?? '')}"
                class="image-list-thumb" loading="lazy"
                onerror="this.style.display='none'" />
              <span class="image-list-alt">${escapeHtml(img.alt ?? '(sin descripción)')}</span>
              <div class="image-list-actions">
                <button type="button" class="btn btn-sm btn-outline img-move-up"
                  data-index="${idx}" aria-label="Mover arriba" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="btn btn-sm btn-outline img-move-down"
                  data-index="${idx}" aria-label="Mover abajo"
                  ${idx === imagenes.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="btn btn-sm btn-danger img-delete"
                  data-index="${idx}" aria-label="Eliminar imagen">Eliminar</button>
              </div>
            </div>`).join('')}
      </div>

      <div class="image-upload-form" style="margin-top:var(--spacing-lg);">
        <h4>Agregar imagen por URL</h4>
        <p class="text-muted" style="font-size:var(--font-size-sm);margin-bottom:var(--spacing-sm);">
          Puedes usar URLs de Google Drive, Imgur, Cloudinary u otro servicio de imágenes.
        </p>
        <div class="form-group">
          <label for="img-url-${firestoreDoc}" class="form-label">URL de la imagen <span aria-hidden="true">*</span></label>
          <input type="url" id="img-url-${firestoreDoc}" class="form-input"
            placeholder="https://ejemplo.com/imagen.jpg" />
        </div>
        <div class="form-group">
          <label for="img-alt-${firestoreDoc}" class="form-label">Descripción (alt)</label>
          <input type="text" id="img-alt-${firestoreDoc}" class="form-input"
            placeholder="Descripción de la imagen" maxlength="200" />
        </div>
        <button type="button" class="btn btn-primary" id="img-add-btn-${firestoreDoc}">
          Agregar imagen
        </button>
      </div>
    </section>
  `;

  // Mover arriba
  panel.querySelectorAll('.img-move-up').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (idx <= 0) return;
      [imagenes[idx - 1], imagenes[idx]] = [imagenes[idx], imagenes[idx - 1]];
      await saveImageArray(firestoreDoc, imagenes);
      renderImageGallery({ panel, imagenes, firestoreDoc, title });
    });
  });

  // Mover abajo
  panel.querySelectorAll('.img-move-down').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (idx >= imagenes.length - 1) return;
      [imagenes[idx], imagenes[idx + 1]] = [imagenes[idx + 1], imagenes[idx]];
      await saveImageArray(firestoreDoc, imagenes);
      renderImageGallery({ panel, imagenes, firestoreDoc, title });
    });
  });

  // Eliminar
  panel.querySelectorAll('.img-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index, 10);
      const confirmed = await showModal({
        title: 'Eliminar imagen',
        message: '¿Estás seguro de que deseas eliminar esta imagen?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
      imagenes.splice(idx, 1);
      await saveImageArray(firestoreDoc, imagenes);
      renderImageGallery({ panel, imagenes, firestoreDoc, title });
    });
  });

  // Agregar por URL
  const addBtn = panel.querySelector(`#img-add-btn-${firestoreDoc}`);
  addBtn.addEventListener('click', async () => {
    const urlInput = panel.querySelector(`#img-url-${firestoreDoc}`);
    const altInput = panel.querySelector(`#img-alt-${firestoreDoc}`);
    const url = urlInput.value.trim();

    if (!url) {
      showToast('Ingresa la URL de la imagen.', 'warning');
      urlInput.focus();
      return;
    }

    addBtn.disabled = true;
    try {
      imagenes.push({ url, alt: altInput.value.trim() });
      await saveImageArray(firestoreDoc, imagenes);
      showToast('Imagen agregada correctamente.', 'success');
      renderImageGallery({ panel, imagenes, firestoreDoc, title });
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, 'error');
      addBtn.disabled = false;
    }
  });
}

/**
 * Guarda el array de imágenes en Firestore.
 * @param {string} firestoreDoc
 * @param {Array} imagenes
 */
async function saveImageArray(firestoreDoc, imagenes) {
  try {
    await setDoc(doc(db, 'contenido_sitio', firestoreDoc), { imagenes });
    showToast('Cambios guardados.', 'success');
  } catch (err) {
    showToast(`Error al guardar: ${err.message}`, 'error');
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Sub-sección 3: Bienvenida
// ---------------------------------------------------------------------------

/**
 * Inicializa la gestión de la Sección de Bienvenida.
 * Formulario con título, subtítulo y párrafo + vista previa.
 * Requisitos: 18.5, 18.6, 18.14
 *
 * @param {HTMLElement} panel
 */
async function initBienvenidaSection(panel) {
  let data = { titulo: '', subtitulo: '', parrafo: '' };

  try {
    const snap = await getDoc(doc(db, 'contenido_sitio', 'bienvenida'));
    if (snap.exists()) {
      data = { ...data, ...snap.data() };
    }
  } catch (err) {
    panel.innerHTML = `<p class="admin-error">Error al cargar la sección de bienvenida: ${escapeHtml(err.message)}</p>`;
    return;
  }

  panel.innerHTML = `
    <section class="content-subsection" aria-label="Sección de Bienvenida">
      <h3 class="content-subsection-title">Sección de Bienvenida</h3>

      <form id="bienvenida-form" novalidate>
        <div class="form-group">
          <label for="bienvenida-titulo" class="form-label">Título principal <span aria-hidden="true">*</span></label>
          <input
            type="text"
            id="bienvenida-titulo"
            class="form-control"
            value="${escapeHtml(data.titulo)}"
            placeholder="Ej. Bienvenidos a nuestra escuela"
            required
            maxlength="200"
          />
        </div>
        <div class="form-group">
          <label for="bienvenida-subtitulo" class="form-label">Subtítulo</label>
          <input
            type="text"
            id="bienvenida-subtitulo"
            class="form-control"
            value="${escapeHtml(data.subtitulo)}"
            placeholder="Ej. Formando el futuro desde 1990"
            maxlength="300"
          />
        </div>
        <div class="form-group">
          <label for="bienvenida-parrafo" class="form-label">Párrafo de presentación</label>
          <textarea
            id="bienvenida-parrafo"
            class="form-control"
            rows="5"
            placeholder="Descripción de la escuela..."
            maxlength="2000"
          >${escapeHtml(data.parrafo)}</textarea>
        </div>

        <button type="button" class="btn btn-outline" id="bienvenida-preview-btn">Vista previa</button>
        <button type="submit" class="btn btn-primary" id="bienvenida-save-btn">Guardar cambios</button>
      </form>

      <div id="bienvenida-preview" class="content-preview" aria-live="polite" hidden>
        <h4 class="content-preview-label">Vista previa</h4>
        <div class="welcome-preview-box">
          <h2 id="preview-titulo" class="welcome-preview-title"></h2>
          <h3 id="preview-subtitulo" class="welcome-preview-subtitle"></h3>
          <p id="preview-parrafo" class="welcome-preview-paragraph"></p>
        </div>
      </div>
    </section>
  `;

  const form = panel.querySelector('#bienvenida-form');
  const previewBtn = panel.querySelector('#bienvenida-preview-btn');
  const previewEl = panel.querySelector('#bienvenida-preview');

  // Vista previa
  previewBtn.addEventListener('click', () => {
    const titulo = panel.querySelector('#bienvenida-titulo').value.trim();
    const subtitulo = panel.querySelector('#bienvenida-subtitulo').value.trim();
    const parrafo = panel.querySelector('#bienvenida-parrafo').value.trim();

    panel.querySelector('#preview-titulo').textContent = titulo || '(sin título)';
    panel.querySelector('#preview-subtitulo').textContent = subtitulo || '(sin subtítulo)';
    panel.querySelector('#preview-parrafo').textContent = parrafo || '(sin párrafo)';

    previewEl.hidden = false;
    previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Guardar
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = panel.querySelector('#bienvenida-titulo').value.trim();
    const subtitulo = panel.querySelector('#bienvenida-subtitulo').value.trim();
    const parrafo = panel.querySelector('#bienvenida-parrafo').value.trim();

    if (!titulo) {
      showToast('El título es requerido.', 'warning');
      panel.querySelector('#bienvenida-titulo').focus();
      return;
    }

    const saveBtn = panel.querySelector('#bienvenida-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      await setDoc(doc(db, 'contenido_sitio', 'bienvenida'), { titulo, subtitulo, parrafo });
      showToast('Sección de bienvenida actualizada.', 'success');
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  });
}

// ---------------------------------------------------------------------------
// Sub-sección 4: Footer
// ---------------------------------------------------------------------------

/**
 * Inicializa la gestión del Footer del sitio.
 * Formulario con datos de contacto y redes sociales.
 * Requisitos: 18.11, 18.12
 *
 * @param {HTMLElement} panel
 */
async function initFooterSection(panel) {
  let data = {
    nombreEscuela: '',
    descripcion: '',
    direccion: '',
    telefono: '',
    email: '',
    redesSociales: { facebook: '', instagram: '', twitter: '', youtube: '' },
  };

  try {
    const snap = await getDoc(doc(db, 'contenido_sitio', 'footer'));
    if (snap.exists()) {
      const d = snap.data();
      data = {
        nombreEscuela: d.nombreEscuela ?? '',
        descripcion: d.descripcion ?? '',
        direccion: d.direccion ?? '',
        telefono: d.telefono ?? '',
        email: d.email ?? '',
        redesSociales: {
          facebook: d.redesSociales?.facebook ?? '',
          instagram: d.redesSociales?.instagram ?? '',
          twitter: d.redesSociales?.twitter ?? '',
          youtube: d.redesSociales?.youtube ?? '',
        },
      };
    }
  } catch (err) {
    panel.innerHTML = `<p class="admin-error">Error al cargar el footer: ${escapeHtml(err.message)}</p>`;
    return;
  }

  panel.innerHTML = `
    <section class="content-subsection" aria-label="Footer del sitio">
      <h3 class="content-subsection-title">Footer</h3>

      <form id="footer-form" novalidate>
        <fieldset class="form-fieldset">
          <legend class="form-legend">Información general</legend>
          <div class="form-group">
            <label for="footer-nombre" class="form-label">Nombre de la escuela</label>
            <input type="text" id="footer-nombre" class="form-control" value="${escapeHtml(data.nombreEscuela)}" maxlength="200" />
          </div>
          <div class="form-group">
            <label for="footer-descripcion" class="form-label">Descripción</label>
            <textarea id="footer-descripcion" class="form-control" rows="3" maxlength="500">${escapeHtml(data.descripcion)}</textarea>
          </div>
        </fieldset>

        <fieldset class="form-fieldset">
          <legend class="form-legend">Información de contacto</legend>
          <div class="form-group">
            <label for="footer-direccion" class="form-label">Dirección</label>
            <input type="text" id="footer-direccion" class="form-control" value="${escapeHtml(data.direccion)}" maxlength="300" />
          </div>
          <div class="form-group">
            <label for="footer-telefono" class="form-label">Teléfono</label>
            <input type="tel" id="footer-telefono" class="form-control" value="${escapeHtml(data.telefono)}" maxlength="30" />
          </div>
          <div class="form-group">
            <label for="footer-email" class="form-label">Correo electrónico</label>
            <input type="email" id="footer-email" class="form-control" value="${escapeHtml(data.email)}" maxlength="200" />
          </div>
        </fieldset>

        <fieldset class="form-fieldset">
          <legend class="form-legend">Redes sociales</legend>
          <div class="form-group">
            <label for="footer-facebook" class="form-label">Facebook (URL)</label>
            <input type="url" id="footer-facebook" class="form-control" value="${escapeHtml(data.redesSociales.facebook)}" placeholder="https://facebook.com/..." maxlength="300" />
          </div>
          <div class="form-group">
            <label for="footer-instagram" class="form-label">Instagram (URL)</label>
            <input type="url" id="footer-instagram" class="form-control" value="${escapeHtml(data.redesSociales.instagram)}" placeholder="https://instagram.com/..." maxlength="300" />
          </div>
          <div class="form-group">
            <label for="footer-twitter" class="form-label">Twitter / X (URL)</label>
            <input type="url" id="footer-twitter" class="form-control" value="${escapeHtml(data.redesSociales.twitter)}" placeholder="https://twitter.com/..." maxlength="300" />
          </div>
          <div class="form-group">
            <label for="footer-youtube" class="form-label">YouTube (URL)</label>
            <input type="url" id="footer-youtube" class="form-control" value="${escapeHtml(data.redesSociales.youtube)}" placeholder="https://youtube.com/..." maxlength="300" />
          </div>
        </fieldset>

        <button type="submit" class="btn btn-primary" id="footer-save-btn">Guardar cambios</button>
      </form>
    </section>
  `;

  const form = panel.querySelector('#footer-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombreEscuela = panel.querySelector('#footer-nombre').value.trim();
    const descripcion = panel.querySelector('#footer-descripcion').value.trim();
    const direccion = panel.querySelector('#footer-direccion').value.trim();
    const telefono = panel.querySelector('#footer-telefono').value.trim();
    const email = panel.querySelector('#footer-email').value.trim();
    const facebook = panel.querySelector('#footer-facebook').value.trim();
    const instagram = panel.querySelector('#footer-instagram').value.trim();
    const twitter = panel.querySelector('#footer-twitter').value.trim();
    const youtube = panel.querySelector('#footer-youtube').value.trim();

    const saveBtn = panel.querySelector('#footer-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      await setDoc(doc(db, 'contenido_sitio', 'footer'), {
        nombreEscuela,
        descripcion,
        direccion,
        telefono,
        email,
        redesSociales: { facebook, instagram, twitter, youtube },
      });
      showToast('Footer actualizado correctamente.', 'success');
    } catch (err) {
      showToast(`Error al guardar el footer: ${err.message}`, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  });
}

// ---------------------------------------------------------------------------
// Sub-sección 5: Videos
// ---------------------------------------------------------------------------

/**
 * Inicializa la gestión de la Galería de Videos.
 * Lista videos con opciones de agregar, editar y eliminar.
 * Requisitos: 18.7–18.10, 18.13, 18.14
 *
 * @param {HTMLElement} panel
 */
async function initVideosSection(panel) {
  let videos = [];

  try {
    videos = await getCollection('videos');
  } catch (err) {
    panel.innerHTML = `<p class="admin-error">Error al cargar los videos: ${escapeHtml(err.message)}</p>`;
    return;
  }

  renderVideosList(panel, videos);
}

/**
 * Renderiza la lista de videos y los controles de gestión.
 *
 * @param {HTMLElement} panel
 * @param {Array} videos
 */
function renderVideosList(panel, videos) {
  panel.innerHTML = `
    <section class="content-subsection" aria-label="Galería de Videos">
      <div class="content-subsection-header">
        <h3 class="content-subsection-title">Galería de Videos</h3>
        <button type="button" class="btn btn-primary" id="video-add-btn">Agregar Video</button>
      </div>

      <div class="admin-table-wrapper" role="region" aria-label="Lista de videos">
        ${
          videos.length === 0
            ? '<p class="admin-empty-state">No hay videos registrados.</p>'
            : `
          <table class="admin-table" aria-label="Videos">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${videos
                .map(
                  (v) => `
                <tr data-id="${escapeHtml(v.id)}">
                  <td>${escapeHtml(v.titulo ?? '(sin título)')}</td>
                  <td>
                    <span class="admin-badge admin-badge-${v.tipo === 'youtube' ? 'info' : 'secondary'}">
                      ${escapeHtml(v.tipo ?? 'local')}
                    </span>
                  </td>
                  <td>
                    <span class="admin-badge admin-badge-${v.activo ? 'success' : 'warning'}">
                      ${v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td class="admin-table-actions">
                    <button type="button" class="btn btn-sm btn-outline video-edit-btn" data-id="${escapeHtml(v.id)}" aria-label="Editar video ${escapeHtml(v.titulo ?? '')}">Editar</button>
                    <button type="button" class="btn btn-sm btn-danger video-delete-btn" data-id="${escapeHtml(v.id)}" aria-label="Eliminar video ${escapeHtml(v.titulo ?? '')}">Eliminar</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
        }
      </div>
    </section>
  `;

  // Add video
  panel.querySelector('#video-add-btn').addEventListener('click', () => {
    openAddVideoModal(panel, videos);
  });

  // Edit video
  panel.querySelectorAll('.video-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const video = videos.find((v) => v.id === id);
      if (video) openEditVideoModal(panel, video, videos);
    });
  });

  // Delete video
  panel.querySelectorAll('.video-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const video = videos.find((v) => v.id === id);
      const confirmed = await showModal({
        title: 'Eliminar video',
        message: `¿Estás seguro de que deseas eliminar el video "${escapeHtml(video?.titulo ?? id)}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;

      try {
        await deleteDocument('videos', id);
        showToast('Video eliminado correctamente.', 'success');
        // Reload list
        const updated = await getCollection('videos');
        renderVideosList(panel, updated);
      } catch (err) {
        showToast(`Error al eliminar el video: ${err.message}`, 'error');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Modal: Agregar Video
// ---------------------------------------------------------------------------

/**
 * Abre el modal para agregar un nuevo video.
 * Sin Firebase Storage: soporta YouTube (URL/ID) y URL directa de video (mp4/webm).
 */
function openAddVideoModal(panel, videos) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'add-video-modal-title');

  backdrop.innerHTML = `
    <div class="modal modal-lg">
      <h2 id="add-video-modal-title" class="modal-title">Agregar Video</h2>
      <form id="add-video-form" novalidate>

        <div class="form-group">
          <label for="video-tipo" class="form-label">Tipo de video <span aria-hidden="true">*</span></label>
          <select id="video-tipo" class="form-input" required>
            <option value="">-- Selecciona el tipo --</option>
            <option value="youtube">YouTube (URL o ID)</option>
            <option value="local">URL directa de video (mp4/webm)</option>
          </select>
        </div>

        <div id="video-youtube-fields" hidden>
          <div class="form-group">
            <label for="video-yt-url" class="form-label">URL o ID de YouTube <span aria-hidden="true">*</span></label>
            <input type="text" id="video-yt-url" class="form-input"
              placeholder="https://www.youtube.com/watch?v=... o ID de 11 caracteres" />
          </div>
        </div>

        <div id="video-local-fields" hidden>
          <div class="form-group">
            <label for="video-direct-url" class="form-label">URL del video <span aria-hidden="true">*</span></label>
            <input type="url" id="video-direct-url" class="form-input"
              placeholder="https://ejemplo.com/video.mp4" />
            <span class="form-hint">URL pública de un archivo mp4 o webm alojado en cualquier servidor.</span>
          </div>
        </div>

        <div class="form-group">
          <label for="video-titulo" class="form-label">Título <span aria-hidden="true">*</span></label>
          <input type="text" id="video-titulo" class="form-input" required maxlength="200"
            placeholder="Título del video" />
        </div>
        <div class="form-group">
          <label for="video-descripcion" class="form-label">Descripción</label>
          <textarea id="video-descripcion" class="form-input" rows="3" maxlength="1000"
            placeholder="Descripción opcional"></textarea>
        </div>

        <div id="add-video-preview" hidden style="margin-bottom:var(--spacing-md);">
          <h4 style="margin-bottom:var(--spacing-sm);">Vista previa</h4>
          <div id="add-video-preview-content" style="aspect-ratio:16/9;max-width:480px;background:#000;"></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="add-video-cancel">Cancelar</button>
          <button type="button" class="btn btn-outline" id="add-video-preview-btn">Vista previa</button>
          <button type="submit" class="btn btn-primary" id="add-video-submit">Guardar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);

  const tipoSelect = backdrop.querySelector('#video-tipo');
  const ytFields = backdrop.querySelector('#video-youtube-fields');
  const localFields = backdrop.querySelector('#video-local-fields');
  const previewSection = backdrop.querySelector('#add-video-preview');
  const previewContent = backdrop.querySelector('#add-video-preview-content');

  tipoSelect.addEventListener('change', () => {
    ytFields.hidden = tipoSelect.value !== 'youtube';
    localFields.hidden = tipoSelect.value !== 'local';
  });

  // Vista previa
  backdrop.querySelector('#add-video-preview-btn').addEventListener('click', () => {
    const tipo = tipoSelect.value;
    const titulo = backdrop.querySelector('#video-titulo').value.trim();

    if (tipo === 'youtube') {
      const embedUrl = buildYouTubeEmbedUrl(backdrop.querySelector('#video-yt-url').value.trim());
      if (embedUrl) {
        previewContent.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" allowfullscreen
          style="width:100%;height:100%;border:none;" title="${escapeHtml(titulo)}"></iframe>`;
        previewSection.hidden = false;
      } else {
        showToast('Ingresa una URL o ID de YouTube válido.', 'warning');
      }
    } else if (tipo === 'local') {
      const url = backdrop.querySelector('#video-direct-url').value.trim();
      if (url) {
        previewContent.innerHTML = `<video controls preload="metadata" style="width:100%;height:100%;">
          <source src="${escapeHtml(url)}" />
        </video>`;
        previewSection.hidden = false;
      } else {
        showToast('Ingresa la URL del video.', 'warning');
      }
    } else {
      showToast('Selecciona el tipo de video primero.', 'warning');
    }
  });

  const closeModal = () => document.body.removeChild(backdrop);
  backdrop.querySelector('#add-video-cancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); closeModal(); }
  });

  backdrop.querySelector('#add-video-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = tipoSelect.value;
    const titulo = backdrop.querySelector('#video-titulo').value.trim();
    const descripcion = backdrop.querySelector('#video-descripcion').value.trim();

    if (!tipo) { showToast('Selecciona el tipo de video.', 'warning'); return; }
    if (!titulo) { showToast('El título es requerido.', 'warning'); return; }

    const submitBtn = backdrop.querySelector('#add-video-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      if (tipo === 'youtube') {
        const ytInput = backdrop.querySelector('#video-yt-url').value.trim();
        if (!isValidYouTubeUrl(ytInput)) {
          showToast('Ingresa una URL o ID de YouTube válido.', 'error');
          submitBtn.disabled = false; submitBtn.textContent = 'Guardar'; return;
        }
        await createDocument('videos', {
          titulo, descripcion, tipo: 'youtube',
          url: buildYouTubeEmbedUrl(ytInput), activo: true,
        });
      } else {
        const url = backdrop.querySelector('#video-direct-url').value.trim();
        if (!url) {
          showToast('Ingresa la URL del video.', 'warning');
          submitBtn.disabled = false; submitBtn.textContent = 'Guardar'; return;
        }
        await createDocument('videos', { titulo, descripcion, tipo: 'local', url, activo: true });
      }

      showToast('Video agregado correctamente.', 'success');
      closeModal();
      const updated = await getCollection('videos');
      renderVideosList(panel, updated);
    } catch (err) {
      showToast(`Error al guardar el video: ${err.message}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar';
    }
  });
}

// ---------------------------------------------------------------------------
// Modal: Editar Video
// ---------------------------------------------------------------------------

/**
 * Abre el modal para editar un video existente (título, descripción, activo).
 * Requisito: 18.7
 *
 * @param {HTMLElement} panel
 * @param {Object} video - Datos del video a editar
 * @param {Array} videos - Lista actual de videos para re-renderizar tras guardar
 */
function openEditVideoModal(panel, video, videos) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'edit-video-modal-title');

  backdrop.innerHTML = `
    <div class="modal">
      <h2 id="edit-video-modal-title" class="modal-title">Editar Video</h2>

      <form id="edit-video-form" novalidate>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <p class="form-static-value">
            <span class="admin-badge admin-badge-${video.tipo === 'youtube' ? 'info' : 'secondary'}">
              ${escapeHtml(video.tipo ?? 'local')}
            </span>
          </p>
        </div>
        <div class="form-group">
          <label for="edit-video-titulo" class="form-label">Título <span aria-hidden="true">*</span></label>
          <input
            type="text"
            id="edit-video-titulo"
            class="form-control"
            value="${escapeHtml(video.titulo ?? '')}"
            required
            maxlength="200"
          />
        </div>
        <div class="form-group">
          <label for="edit-video-descripcion" class="form-label">Descripción</label>
          <textarea id="edit-video-descripcion" class="form-control" rows="3" maxlength="1000">${escapeHtml(video.descripcion ?? '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label form-label-checkbox">
            <input
              type="checkbox"
              id="edit-video-activo"
              ${video.activo ? 'checked' : ''}
            />
            Video activo (visible en el sitio)
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="edit-video-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="edit-video-submit">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeModal = () => document.body.removeChild(backdrop);
  backdrop.querySelector('#edit-video-cancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); closeModal(); }
  });

  backdrop.querySelector('#edit-video-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = backdrop.querySelector('#edit-video-titulo').value.trim();
    const descripcion = backdrop.querySelector('#edit-video-descripcion').value.trim();
    const activo = backdrop.querySelector('#edit-video-activo').checked;

    if (!titulo) {
      showToast('El título es requerido.', 'warning');
      backdrop.querySelector('#edit-video-titulo').focus();
      return;
    }

    const submitBtn = backdrop.querySelector('#edit-video-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      await updateDocument('videos', video.id, { titulo, descripcion, activo });
      showToast('Video actualizado correctamente.', 'success');
      closeModal();

      // Reload list
      const updated = await getCollection('videos');
      renderVideosList(panel, updated);

    } catch (err) {
      showToast(`Error al actualizar el video: ${err.message}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar cambios';
    }
  });
}
