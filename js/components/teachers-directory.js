/**
 * teachers-directory.js — Directorio de maestros
 *
 * Requisitos: 5.1–5.8
 *
 * Funciones exportadas:
 *   - initTeachersDirectory() → Consulta Firestore y renderiza las tarjetas de maestros
 *   - getInitials(nombre)     → Extrae las iniciales del nombre completo
 */

import { getCollection } from '../utils/firestore-helpers.js';

/**
 * Inicializa el directorio de maestros en #teachers-grid.
 * Consulta la colección `maestros` de Firestore y renderiza una tarjeta por maestro.
 * Si la colección está vacía, muestra un mensaje de estado vacío.
 */
export async function initTeachersDirectory() {
  const grid = document.getElementById('teachers-grid');
  if (!grid) return;

  try {
    const maestros = await getCollection('maestros');

    // Limpiar contenido previo
    grid.innerHTML = '';

    if (maestros.length === 0) {
      // Estado vacío (Req. 5.5)
      const empty = document.createElement('p');
      empty.className = 'grid-empty-state';
      empty.textContent = 'Directorio de maestros próximamente disponible';
      grid.appendChild(empty);
      return;
    }

    // Renderizar tarjetas
    maestros.forEach((maestro) => {
      const card = _buildTeacherCard(maestro);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar directorio de maestros:', error);
    grid.innerHTML = `
      <p class="grid-empty-state">
        Contenido temporalmente no disponible. Verifica tu conexión a internet.
      </p>`;
  }
}

/**
 * Extrae las primeras letras del nombre y apellido de un nombre completo.
 *
 * @param {string} nombre - Nombre completo del maestro.
 * @returns {string} Iniciales en mayúsculas (máximo 2 caracteres).
 *
 * @example
 * getInitials('María García');  // 'MG'
 * getInitials('Juan');          // 'J'
 * getInitials('');              // '?'
 */
export function getInitials(nombre) {
  if (typeof nombre !== 'string' || nombre.trim().length === 0) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Construye una tarjeta de maestro.
 *
 * @param {{ id: string, nombre: string, fotoPerfil: string, descripcion: string, cursosAsignados: string[] }} maestro
 * @returns {HTMLElement}
 */
function _buildTeacherCard(maestro) {
  const card = document.createElement('article');
  card.className = 'teacher-card';
  card.setAttribute('role', 'listitem');

  // Foto o avatar con iniciales (Req. 5.3, 5.4)
  if (maestro.fotoPerfil) {
    const img = document.createElement('img');
    img.className = 'teacher-card-photo';
    img.src = maestro.fotoPerfil;
    img.alt = maestro.nombre ? `Foto de ${maestro.nombre}` : 'Foto del maestro';
    img.onerror = () => {
      img.replaceWith(_buildAvatar(maestro.nombre));
    };
    card.appendChild(img);
  } else {
    card.appendChild(_buildAvatar(maestro.nombre));
  }

  // Nombre
  const nombre = document.createElement('h3');
  nombre.className = 'teacher-card-name';
  nombre.textContent = maestro.nombre || 'Maestro';
  card.appendChild(nombre);

  // Curso (especialidad o primer curso asignado)
  const curso = document.createElement('p');
  curso.className = 'teacher-card-course';
  curso.textContent = maestro.especialidad || maestro.curso || '';
  card.appendChild(curso);

  // Descripción
  const descripcion = document.createElement('p');
  descripcion.className = 'teacher-card-description';
  descripcion.textContent = maestro.descripcion || '';
  card.appendChild(descripcion);

  return card;
}

/**
 * Construye el avatar con iniciales del maestro.
 *
 * @param {string} nombre - Nombre del maestro.
 * @returns {HTMLElement}
 */
function _buildAvatar(nombre) {
  const avatar = document.createElement('div');
  avatar.className = 'teacher-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = getInitials(nombre);
  return avatar;
}
