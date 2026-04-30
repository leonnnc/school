/**
 * gallery.js — Galería de videos con soporte dual (local y YouTube)
 *
 * Requisitos: 6.1–6.11
 *
 * Funciones exportadas:
 *   - filterActiveVideos(videos)         → Retorna solo los videos con activo === true
 *   - renderLocalVideo(url, urlWebm)     → Retorna elemento <video> con <source>
 *   - renderYouTubeEmbed(embedUrl)       → Retorna <iframe> para YouTube
 *   - renderVideoPlayer(video)           → Renderiza el reproductor según el tipo
 *   - initGallery()                      → Inicializa la galería desde Firestore
 */

import { getCollection } from '../utils/firestore-helpers.js';

// Máximo de videos a mostrar (Req. 6.1)
const MAX_VIDEOS = 12;

/**
 * Filtra un array de videos retornando solo los que tienen `activo === true`.
 *
 * @param {Array<{activo: boolean}>} videos - Array de documentos de video.
 * @returns {Array} Videos activos.
 */
export function filterActiveVideos(videos) {
  if (!Array.isArray(videos)) return [];
  return videos.filter((v) => v && v.activo === true);
}

/**
 * Construye un elemento <video> nativo con soporte para mp4 y opcionalmente webm.
 *
 * @param {string} url      - URL del archivo mp4.
 * @param {string} [urlWebm] - URL del archivo webm (opcional).
 * @returns {HTMLVideoElement}
 */
export function renderLocalVideo(url, urlWebm) {
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;';

  // Fuente mp4
  const sourceMp4 = document.createElement('source');
  sourceMp4.src = url;
  sourceMp4.type = 'video/mp4';
  video.appendChild(sourceMp4);

  // Fuente webm (si está disponible) — Req. 6.6
  if (urlWebm) {
    const sourceWebm = document.createElement('source');
    sourceWebm.src = urlWebm;
    sourceWebm.type = 'video/webm';
    video.appendChild(sourceWebm);
  }

  return video;
}

/**
 * Construye un elemento <iframe> para embeber un video de YouTube.
 *
 * @param {string} embedUrl - URL de embed con formato https://www.youtube.com/embed/{id}
 * @returns {HTMLIFrameElement}
 */
export function renderYouTubeEmbed(embedUrl) {
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  // Sin autoplay (Req. 6.5)
  return iframe;
}

/**
 * Renderiza el reproductor de video adecuado según el tipo del documento.
 * En caso de error, retorna un elemento con mensaje de error.
 *
 * @param {{ tipo: string, url: string, urlWebm?: string }} video - Documento de video.
 * @returns {HTMLElement}
 */
export function renderVideoPlayer(video) {
  try {
    if (video.tipo === 'local') {
      if (!video.url) return _buildVideoError();
      return renderLocalVideo(video.url, video.urlWebm || null);
    }

    if (video.tipo === 'youtube') {
      if (!video.url) return _buildVideoError();
      return renderYouTubeEmbed(video.url);
    }

    // Tipo desconocido
    return _buildVideoError();
  } catch {
    return _buildVideoError();
  }
}

/**
 * Inicializa la galería de videos en #videos-grid.
 * Consulta la colección `videos` de Firestore, filtra los activos y renderiza hasta 12.
 */
export async function initGallery() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  try {
    const todosLosVideos = await getCollection('videos');
    const videosActivos = filterActiveVideos(todosLosVideos);
    const videosAMostrar = videosActivos.slice(0, MAX_VIDEOS);

    // Limpiar contenido previo
    grid.innerHTML = '';

    if (videosAMostrar.length === 0) {
      grid.innerHTML = `<p class="grid-empty-state">Próximamente nuevos videos</p>`;
      return;
    }

    videosAMostrar.forEach((video) => {
      const slot = document.createElement('div');
      slot.className = 'video-slot';

      const player = renderVideoPlayer(video);

      // Manejo de error para video local (Req. 6.10)
      if (video.tipo === 'local' && player.tagName === 'VIDEO') {
        player.addEventListener('error', () => {
          slot.innerHTML = '';
          slot.appendChild(_buildVideoError());
        });
      }

      slot.appendChild(player);
      grid.appendChild(slot);
    });
  } catch (error) {
    console.error('Error al cargar la galería de videos:', error);
    grid.innerHTML = `
      <p class="grid-empty-state">
        Contenido temporalmente no disponible. Verifica tu conexión a internet.
      </p>`;
  }
}

/**
 * Construye el elemento de error para un slot de video.
 * @returns {HTMLElement}
 */
function _buildVideoError() {
  const error = document.createElement('div');
  error.className = 'video-error';
  error.textContent = 'Video no disponible';
  return error;
}
