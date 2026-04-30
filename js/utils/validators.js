/**
 * @fileoverview Módulo de validadores reutilizables para el sitio web escolar.
 * Provee funciones de validación y utilidad para emails, URLs de YouTube,
 * archivos de video y búsqueda en colecciones de objetos.
 *
 * @module validators
 */

/**
 * Verifica si un string cumple el formato de correo electrónico estándar
 * (RFC 5322 simplificado: local@dominio.tld).
 *
 * @param {string} email - El string a validar.
 * @returns {boolean} `true` si el string tiene formato de email válido, `false` en caso contrario.
 *
 * @example
 * isValidEmail('usuario@escuela.edu.mx'); // true
 * isValidEmail('no-es-un-email');          // false
 * isValidEmail('a@b.c');                   // true
 * isValidEmail('@dominio.com');            // false
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // RFC 5322 simplificado: local@dominio.tld
  // - local: caracteres alfanuméricos, puntos, guiones, subrayados, signos +
  // - dominio: al menos un nivel con letras/números/guiones
  // - tld: al menos 2 caracteres alfabéticos
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Verifica si un valor es un string con al menos un carácter no-espacio.
 *
 * @param {*} value - El valor a verificar.
 * @returns {boolean} `true` si el valor es un string no vacío (ignorando espacios), `false` en caso contrario.
 *
 * @example
 * isNonEmptyString('Hola');    // true
 * isNonEmptyString('  ');      // false
 * isNonEmptyString('');        // false
 * isNonEmptyString(null);      // false
 * isNonEmptyString(42);        // false
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Verifica si el input es una URL válida de YouTube o un ID directo de video.
 *
 * Formatos aceptados:
 * - URL completa: `https://www.youtube.com/watch?v=XXXXXXXXXXX`
 * - URL corta:    `https://youtu.be/XXXXXXXXXXX`
 * - ID directo:   11 caracteres alfanuméricos, guiones o subrayados
 *
 * @param {string} input - La URL o ID a validar.
 * @returns {boolean} `true` si el input corresponde a un video de YouTube válido.
 *
 * @example
 * isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // true
 * isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');                // true
 * isValidYouTubeUrl('dQw4w9WgXcQ');                                  // true
 * isValidYouTubeUrl('https://vimeo.com/123456');                     // false
 */
export function isValidYouTubeUrl(input) {
  if (typeof input !== 'string') return false;
  return extractYouTubeId(input) !== null;
}

/**
 * Extrae el ID del video de YouTube (11 caracteres) desde cualquiera de los
 * formatos válidos: URL completa, URL corta o ID directo.
 *
 * @param {string} input - La URL o ID de YouTube.
 * @returns {string|null} El ID del video (11 caracteres) o `null` si el input no es válido.
 *
 * @example
 * extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // 'dQw4w9WgXcQ'
 * extractYouTubeId('https://youtu.be/dQw4w9WgXcQ');                // 'dQw4w9WgXcQ'
 * extractYouTubeId('dQw4w9WgXcQ');                                  // 'dQw4w9WgXcQ'
 * extractYouTubeId('no-valido');                                     // null
 */
export function extractYouTubeId(input) {
  if (typeof input !== 'string') return null;

  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

  // Formato: https://www.youtube.com/watch?v=XXXXXXXXXXX (con o sin parámetros adicionales)
  const watchUrlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{11})(?:[&#]|$)/);
  if (watchUrlMatch) return watchUrlMatch[1];

  // Formato: https://youtu.be/XXXXXXXXXXX
  const shortUrlMatch = input.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/);
  if (shortUrlMatch) return shortUrlMatch[1];

  // ID directo de 11 caracteres
  if (videoIdPattern.test(input)) return input;

  return null;
}

/**
 * Construye la URL de embed de YouTube a partir de cualquier formato válido de entrada.
 *
 * @param {string} input - La URL completa, URL corta o ID directo de YouTube.
 * @returns {string|null} La URL de embed con formato `https://www.youtube.com/embed/{videoId}`,
 *   o `null` si el input no es válido.
 *
 * @example
 * buildYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 *
 * buildYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
 * // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 *
 * buildYouTubeEmbedUrl('dQw4w9WgXcQ');
 * // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 *
 * buildYouTubeEmbedUrl('no-valido');
 * // null
 */
export function buildYouTubeEmbedUrl(input) {
  const videoId = extractYouTubeId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Verifica si un objeto de archivo es un video válido para subir.
 *
 * Un archivo es válido si y solo si:
 * - Su tipo MIME es `"video/mp4"` o `"video/webm"`
 * - Su tamaño es menor o igual a 524,288,000 bytes (500 MB)
 *
 * @param {{ type: string, size: number }|File} file - Objeto con propiedades `type` y `size`,
 *   o un objeto `File` del DOM.
 * @returns {boolean} `true` si el archivo cumple ambas condiciones, `false` en caso contrario.
 *
 * @example
 * isValidVideoFile({ type: 'video/mp4', size: 1024 });              // true
 * isValidVideoFile({ type: 'video/webm', size: 524288000 });        // true
 * isValidVideoFile({ type: 'video/mp4', size: 524288001 });         // false (supera 500 MB)
 * isValidVideoFile({ type: 'video/avi', size: 1024 });              // false (tipo inválido)
 * isValidVideoFile({ type: 'image/png', size: 100 });               // false
 */
export function isValidVideoFile(file) {
  if (!file || typeof file !== 'object') return false;
  const VALID_TYPES = ['video/mp4', 'video/webm'];
  const MAX_SIZE = 524288000; // 500 MB en bytes
  return VALID_TYPES.includes(file.type) && file.size <= MAX_SIZE;
}

/**
 * Filtra un array de objetos retornando solo los items donde al menos uno de los
 * campos especificados contiene la query como subcadena (comparación case-insensitive).
 * Si la query está vacía o es solo espacios, retorna todos los items sin filtrar.
 *
 * @param {Object[]} items - Array de objetos a filtrar.
 * @param {string} query - Cadena de búsqueda. Si está vacía, retorna todos los items.
 * @param {string[]} fields - Array de nombres de campos en los que buscar.
 * @returns {Object[]} Array filtrado con los items que coinciden con la búsqueda.
 *
 * @example
 * const alumnos = [
 *   { nombre: 'Ana García', email: 'ana@escuela.mx' },
 *   { nombre: 'Luis Pérez', email: 'luis@escuela.mx' },
 * ];
 *
 * filterBySearchQuery(alumnos, 'ana', ['nombre', 'email']);
 * // [{ nombre: 'Ana García', email: 'ana@escuela.mx' }]
 *
 * filterBySearchQuery(alumnos, 'escuela', ['email']);
 * // [{ nombre: 'Ana García', ... }, { nombre: 'Luis Pérez', ... }]
 *
 * filterBySearchQuery(alumnos, '', ['nombre']);
 * // retorna todos los items
 */
export function filterBySearchQuery(items, query, fields) {
  if (!Array.isArray(items)) return [];
  if (!isNonEmptyString(query)) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    return fields.some((field) => {
      const value = item[field];
      if (typeof value !== 'string') return false;
      return value.toLowerCase().includes(lowerQuery);
    });
  });
}
