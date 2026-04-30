/**
 * sections-catalog.js — Catálogo de secciones académicas
 *
 * Requisitos: 4.1–4.7
 *
 * Funciones exportadas:
 *   - initSectionsCatalog() → Consulta Firestore y renderiza las tarjetas de secciones
 */

import { getCollection } from '../utils/firestore-helpers.js';

/**
 * Inicializa el catálogo de secciones académicas en #sections-grid.
 * Consulta la colección `secciones` de Firestore y renderiza una tarjeta por sección.
 * Si la colección está vacía, muestra un mensaje de estado vacío.
 */
export async function initSectionsCatalog() {
  const grid = document.getElementById('sections-grid');
  if (!grid) return;

  try {
    const secciones = await getCollection('secciones');

    // Limpiar contenido previo
    grid.innerHTML = '';

    if (secciones.length === 0) {
      // Estado vacío (Req. 4.4)
      const empty = document.createElement('p');
      empty.className = 'grid-empty-state';
      empty.textContent = 'Próximamente nuevas secciones académicas';
      grid.appendChild(empty);
      return;
    }

    // Renderizar tarjetas
    secciones.forEach((seccion) => {
      const card = _buildSectionCard(seccion);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar secciones académicas:', error);
    grid.innerHTML = `
      <p class="grid-empty-state">
        Contenido temporalmente no disponible. Verifica tu conexión a internet.
      </p>`;
  }
}

/**
 * Construye una tarjeta de sección académica.
 *
 * @param {{ id: string, nombre: string, descripcion: string, icono: string }} seccion
 * @returns {HTMLElement}
 */
function _buildSectionCard(seccion) {
  const card = document.createElement('article');
  card.className = 'section-card';
  card.setAttribute('role', 'listitem');

  // Ícono: solo usar como <img> si parece una URL real (empieza con http/https o /)
  const icono = seccion.icono ?? '';
  const isUrl = icono.startsWith('http://') || icono.startsWith('https://') || icono.startsWith('/');

  if (isUrl) {
    const img = document.createElement('img');
    img.className = 'section-card-icon';
    img.src = icono;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.onerror = () => { img.replaceWith(_buildIconPlaceholder()); };
    card.appendChild(img);
  } else {
    // Es un emoji, texto o está vacío — mostrar como texto en el placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'section-card-icon-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = icono || '📚';
    card.appendChild(placeholder);
  }

  // Nombre
  const nombre = document.createElement('h3');
  nombre.className = 'section-card-name';
  nombre.textContent = seccion.nombre || 'Sección académica';
  card.appendChild(nombre);

  // Descripción
  const descripcion = document.createElement('p');
  descripcion.className = 'section-card-description';
  descripcion.textContent = seccion.descripcion || '';
  card.appendChild(descripcion);

  return card;
}

/**
 * Construye el placeholder de ícono con emoji 📚.
 * @returns {HTMLElement}
 */
function _buildIconPlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'section-card-icon-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = '📚';
  return placeholder;
}
