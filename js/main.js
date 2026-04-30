/**
 * main.js — Entry point de index.html
 *
 * Inicializa todos los componentes de la página principal:
 *   - carousel.js           → Carrusel principal de pantalla completa
 *   - scroll-horizontal.js  → Scroll horizontal automático de fotos
 *   - sections-catalog.js   → Catálogo de secciones académicas
 *   - teachers-directory.js → Directorio de maestros
 *   - gallery.js            → Galería de videos (local + YouTube)
 *   - registration-form.js  → Formulario público de registro a cursos
 *   - footer.js             → Footer dinámico con datos de Firestore
 *
 * Cada componente se encarga de:
 *   1. Consultar sus datos desde Firestore
 *   2. Renderizar su sección en el DOM
 *   3. Registrar sus event listeners
 */

import { initCarousel } from './components/carousel.js';
import { initScrollHorizontal } from './components/scroll-horizontal.js';
import { initSectionsCatalog } from './components/sections-catalog.js';
import { initTeachersDirectory } from './components/teachers-directory.js';
import { initGallery } from './components/gallery.js';
import { initRegistrationForm } from './components/registration-form.js';
import { initFooter } from './components/footer.js';
import { getDocument } from './utils/firestore-helpers.js';

// --------------------------------------------------------------------------
// Imágenes placeholder por defecto (usadas cuando Firestore no tiene datos)
// --------------------------------------------------------------------------
const IMAGENES_DEFAULT = [
  {
    url: 'assets/images/placeholder-carousel.svg',
    alt: 'Imagen de bienvenida de la escuela',
  },
  {
    url: 'assets/images/placeholder-carousel.svg',
    alt: 'Instalaciones de la escuela',
  },
  {
    url: 'assets/images/placeholder-carousel.svg',
    alt: 'Actividades académicas',
  },
];

// Textos por defecto para la sección de bienvenida
const BIENVENIDA_DEFAULT = {
  titulo: 'Bienvenido a Nuestra Escuela',
  subtitulo: 'Formando el futuro con excelencia académica',
  parrafo:
    'Somos una institución educativa comprometida con el desarrollo integral de nuestros alumnos, ' +
    'ofreciendo programas académicos de calidad impartidos por maestros altamente capacitados.',
};

// --------------------------------------------------------------------------
// Inicialización al cargar el DOM
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar todos los componentes en paralelo donde sea posible
  await Promise.allSettled([
    initCarouselFromFirestore(),
    initWelcomeFromFirestore(),
    initScrollHorizontalFromFirestore(),
    initSectionsCatalog(),
    initTeachersDirectory(),
    initGallery(),
    initRegistrationForm(),
    initFooter(),
  ]);
});

// --------------------------------------------------------------------------
// Carrusel
// --------------------------------------------------------------------------

/**
 * Obtiene las imágenes del carrusel desde Firestore e inicializa el componente.
 * Si la conexión falla, muestra un mensaje de error.
 * Si no hay imágenes en Firestore, usa el array de imágenes por defecto.
 */
async function initCarouselFromFirestore() {
  try {
    const doc = await getDocument('contenido_sitio', 'carrusel');

    const imagenes =
      doc && Array.isArray(doc.imagenes) && doc.imagenes.length > 0
        ? doc.imagenes
        : IMAGENES_DEFAULT;

    initCarousel(imagenes);
  } catch (error) {
    console.error('Error al cargar el carrusel desde Firestore:', error);

    // Mostrar mensaje de error en el contenedor del carrusel
    const container = document.getElementById('carousel-container');
    if (container) {
      container.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #1a3a5c;
          color: #f8f9fa;
          text-align: center;
          padding: 2rem;
        ">
          <p style="font-size: 1.125rem; max-width: 480px;">
            Contenido temporalmente no disponible. Verifica tu conexión a internet.
          </p>
        </div>`;
    }
  }
}

// --------------------------------------------------------------------------
// Sección de bienvenida
// --------------------------------------------------------------------------

/**
 * Carga el texto de bienvenida desde Firestore y actualiza los elementos del DOM.
 * Si no hay datos en Firestore, usa los textos por defecto.
 *
 * @param {Object} data - Datos de bienvenida desde Firestore.
 */
function initWelcome(data) {
  const titleEl = document.getElementById('welcome-title');
  const subtitleEl = document.querySelector('.welcome-subtitle');
  const paragraphEl = document.querySelector('.welcome-paragraph');

  if (titleEl && data.titulo) {
    titleEl.textContent = data.titulo;
  }
  if (subtitleEl && data.subtitulo) {
    subtitleEl.textContent = data.subtitulo;
  }
  if (paragraphEl && data.parrafo) {
    paragraphEl.textContent = data.parrafo;
  }
}

/**
 * Obtiene los datos de bienvenida desde Firestore e inicializa la sección.
 */
async function initWelcomeFromFirestore() {
  try {
    const doc = await getDocument('contenido_sitio', 'bienvenida');
    const data = doc || BIENVENIDA_DEFAULT;
    initWelcome(data);
  } catch (error) {
    console.error('Error al cargar la sección de bienvenida:', error);
    initWelcome(BIENVENIDA_DEFAULT);
  }
}

// --------------------------------------------------------------------------
// Scroll horizontal
// --------------------------------------------------------------------------

/**
 * Obtiene las imágenes del scroll horizontal desde Firestore e inicializa el componente.
 */
async function initScrollHorizontalFromFirestore() {
  try {
    const doc = await getDocument('contenido_sitio', 'scroll_horizontal');
    const imagenes =
      doc && Array.isArray(doc.imagenes) && doc.imagenes.length > 0
        ? doc.imagenes
        : [];
    initScrollHorizontal(imagenes);
  } catch (error) {
    console.error('Error al cargar el scroll horizontal desde Firestore:', error);
    initScrollHorizontal([]);
  }
}
