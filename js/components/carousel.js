/**
 * carousel.js — Carrusel Principal de Pantalla Completa
 *
 * Requisitos: 1.1–1.9
 *
 * Funciones exportadas:
 *   - initCarousel(imagenes)  → Inicializa el carrusel con un array de {url, alt}
 *   - nextIndex(current, total) → Retorna el índice siguiente (circular)
 *   - prevIndex(current, total) → Retorna el índice anterior (circular)
 */

// --------------------------------------------------------------------------
// Funciones puras de navegación
// --------------------------------------------------------------------------

/**
 * Retorna el índice siguiente de forma circular.
 *
 * @param {number} current - Índice actual.
 * @param {number} total   - Total de slides.
 * @returns {number}
 */
export function nextIndex(current, total) {
  return (current + 1) % total;
}

/**
 * Retorna el índice anterior de forma circular.
 *
 * @param {number} current - Índice actual.
 * @param {number} total   - Total de slides.
 * @returns {number}
 */
export function prevIndex(current, total) {
  return (current - 1 + total) % total;
}

// --------------------------------------------------------------------------
// Inicialización del carrusel
// --------------------------------------------------------------------------

/**
 * Inicializa el carrusel principal en el elemento #carousel-container.
 *
 * @param {Array<{url: string, alt: string}>} imagenes - Array de imágenes a mostrar.
 */
export function initCarousel(imagenes) {
  const container = document.getElementById('carousel-container');
  if (!container) return;

  // Limpiar contenido previo
  container.innerHTML = '';

  let currentIndex = 0;
  let autoAdvanceTimer = null;

  // ------------------------------------------------------------------
  // Renderizar slides
  // ------------------------------------------------------------------
  const slides = imagenes.map((imagen, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Imagen ${i + 1} de ${imagenes.length}`);

    const img = document.createElement('img');
    img.className = 'carousel-img';
    img.src = imagen.url;
    img.alt = imagen.alt || `Imagen ${i + 1}`;
    img.loading = i === 0 ? 'eager' : 'lazy';

    // Req. 1.9 — Mostrar placeholder si la imagen falla
    img.onerror = () => {
      slide.innerHTML = '';
      const placeholder = _buildPlaceholder();
      slide.appendChild(placeholder);
    };

    slide.appendChild(img);
    container.appendChild(slide);
    return slide;
  });

  // ------------------------------------------------------------------
  // Renderizar puntos indicadores (Req. 1.8)
  // ------------------------------------------------------------------
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';
  dotsContainer.setAttribute('role', 'tablist');
  dotsContainer.setAttribute('aria-label', 'Indicadores de diapositiva');

  const dots = imagenes.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Ir a imagen ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => {
      goToSlide(i);
      resetAutoAdvance();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  container.appendChild(dotsContainer);

  // ------------------------------------------------------------------
  // Botón anterior (Req. 1.4)
  // ------------------------------------------------------------------
  const btnPrev = document.createElement('button');
  btnPrev.className = 'carousel-btn carousel-btn-prev';
  btnPrev.setAttribute('aria-label', 'Imagen anterior');
  btnPrev.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>`;
  btnPrev.addEventListener('click', () => {
    goToSlide(prevIndex(currentIndex, imagenes.length));
    resetAutoAdvance();
  });
  container.appendChild(btnPrev);

  // ------------------------------------------------------------------
  // Botón siguiente (Req. 1.5)
  // ------------------------------------------------------------------
  const btnNext = document.createElement('button');
  btnNext.className = 'carousel-btn carousel-btn-next';
  btnNext.setAttribute('aria-label', 'Imagen siguiente');
  btnNext.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`;
  btnNext.addEventListener('click', () => {
    goToSlide(nextIndex(currentIndex, imagenes.length));
    resetAutoAdvance();
  });
  container.appendChild(btnNext);

  // ------------------------------------------------------------------
  // Indicador de scroll — flecha animada (Req. 1.6, 1.7)
  // ------------------------------------------------------------------
  const scrollIndicator = document.createElement('button');
  scrollIndicator.className = 'carousel-scroll-indicator';
  scrollIndicator.setAttribute('aria-label', 'Desplazarse a la siguiente sección');
  scrollIndicator.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
    <span class="carousel-scroll-indicator-label">Explorar</span>`;
  scrollIndicator.addEventListener('click', () => {
    // Req. 1.7 — Desplazamiento suave a la siguiente sección
    const nextSection = document.getElementById('bienvenida');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  container.appendChild(scrollIndicator);

  // ------------------------------------------------------------------
  // Función goToSlide — actualiza slide activa y dots
  // ------------------------------------------------------------------
  function goToSlide(index) {
    // Desactivar slide y dot actuales
    slides[currentIndex].classList.remove('active');
    dots[currentIndex].classList.remove('active');
    dots[currentIndex].setAttribute('aria-selected', 'false');

    // Activar nuevo slide y dot
    currentIndex = index;
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
    dots[currentIndex].setAttribute('aria-selected', 'true');
  }

  // ------------------------------------------------------------------
  // Auto-avance cada 5000ms (Req. 1.3)
  // ------------------------------------------------------------------
  function startAutoAdvance() {
    autoAdvanceTimer = setInterval(() => {
      goToSlide(nextIndex(currentIndex, imagenes.length));
    }, 5000);
  }

  function resetAutoAdvance() {
    clearInterval(autoAdvanceTimer);
    startAutoAdvance();
  }

  startAutoAdvance();
}

// --------------------------------------------------------------------------
// Helpers privados
// --------------------------------------------------------------------------

/**
 * Construye el elemento placeholder SVG para imágenes que fallan al cargar.
 * Usa assets/images/placeholder-carousel.svg como imagen de respaldo.
 *
 * @returns {HTMLElement}
 */
function _buildPlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'carousel-placeholder';

  const img = document.createElement('img');
  img.src = 'assets/images/placeholder-carousel.svg';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';

  // Si el SVG también falla, mostrar texto de respaldo
  img.onerror = () => {
    img.remove();
    const text = document.createElement('p');
    text.className = 'carousel-placeholder-text';
    text.textContent = 'Nuestra Escuela';
    placeholder.appendChild(text);
  };

  placeholder.style.position = 'relative';
  placeholder.appendChild(img);
  return placeholder;
}
