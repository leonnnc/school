/**
 * scroll-horizontal.js — Scroll horizontal automático de fotos
 *
 * Requisitos: 3.1–3.6
 *
 * Funciones exportadas:
 *   - initScrollHorizontal(imagenes) → Inicializa el scroll con un array de {url, alt}
 */

/**
 * Inicializa el scroll horizontal automático en #scroll-horizontal-container.
 * Duplica las imágenes para crear un loop infinito sin espacios vacíos.
 * Agrega soporte de swipe táctil para dispositivos móviles.
 *
 * @param {Array<{url: string, alt: string}>} imagenes - Array de imágenes a mostrar.
 */
export function initScrollHorizontal(imagenes) {
  const container = document.getElementById('scroll-horizontal-container');
  if (!container) return;

  // Si no hay imágenes, ocultar la sección
  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    const section = container.closest('.scroll-horizontal-section');
    if (section) section.style.display = 'none';
    return;
  }

  // Limpiar contenido previo
  container.innerHTML = '';

  // Crear el track de imágenes
  const track = document.createElement('div');
  track.className = 'scroll-horizontal-track';

  // Duplicar imágenes para el loop infinito (Req. 3.2)
  const allImages = [...imagenes, ...imagenes];

  allImages.forEach((imagen) => {
    const img = document.createElement('img');
    img.className = 'scroll-horizontal-img';
    img.src = imagen.url;
    img.alt = imagen.alt || '';
    img.loading = 'lazy';
    // Si la imagen falla, ocultarla sin romper el layout
    img.onerror = () => {
      img.style.display = 'none';
    };
    track.appendChild(img);
  });

  container.appendChild(track);

  // ------------------------------------------------------------------
  // Soporte de swipe táctil (Req. 3.5)
  // ------------------------------------------------------------------
  let touchStartX = 0;
  let touchStartScrollLeft = 0;
  let isDragging = false;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    // Pausar animación durante el swipe
    track.style.animationPlayState = 'paused';
    isDragging = true;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    // Reanudar animación al soltar
    track.style.animationPlayState = '';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const deltaX = touchStartX - e.touches[0].clientX;
    // Desplazar el track manualmente durante el swipe
    const currentTranslate = _getCurrentTranslate(track);
    track.style.transform = `translateX(${currentTranslate - deltaX}px)`;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
}

/**
 * Obtiene el valor actual de translateX del track.
 * @param {HTMLElement} el
 * @returns {number}
 */
function _getCurrentTranslate(el) {
  const style = window.getComputedStyle(el);
  const matrix = new DOMMatrix(style.transform);
  return matrix.m41;
}
