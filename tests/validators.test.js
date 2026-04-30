/**
 * validators.test.js — Pruebas unitarias y de propiedad para validators.js
 *
 * Propiedades cubiertas:
 *   P5:  Validación de email
 *   P6:  Rechazo de campos vacíos (isNonEmptyString)
 *   P7:  Filtrado de búsqueda en tablas
 *   P11: Extracción y construcción de URL de YouTube
 *   P12: Validación de archivos de video
 *
 * Valida: Requisitos 8.5, 8.6, 9.9, 10.7, 18.9, 18.10
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidEmail,
  isNonEmptyString,
  extractYouTubeId,
  buildYouTubeEmbedUrl,
  isValidVideoFile,
  filterBySearchQuery,
} from '../js/utils/validators.js';

// ---------------------------------------------------------------------------
// P5: Validación de email
// Feature: school-website, Property 5: Validación de email
// Valida: Requisito 8.5
// ---------------------------------------------------------------------------

describe('isValidEmail — pruebas de ejemplo', () => {
  it('acepta email estándar', () => {
    expect(isValidEmail('usuario@escuela.edu.mx')).toBe(true);
  });

  it('acepta email simple', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rechaza string sin @', () => {
    expect(isValidEmail('no-es-un-email')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rechaza email sin dominio', () => {
    expect(isValidEmail('@dominio.com')).toBe(false);
  });

  it('rechaza null', () => {
    expect(isValidEmail(null)).toBe(false);
  });

  it('rechaza número', () => {
    expect(isValidEmail(42)).toBe(false);
  });
});

describe('P5 — Validación de email (property-based)', () => {
  // Feature: school-website, Property 5: Validación de email
  // La regex usa RFC 5322 simplificado: local parte solo acepta [a-zA-Z0-9._%+\-]
  // fc.emailAddress() puede generar emails RFC 5321 con caracteres adicionales (ej. /)
  // Filtramos para quedarnos solo con los que cumplen el formato simplificado
  it('emails con formato RFC 5322 simplificado siempre retornan true', () => {
    const simplifiedEmailArb = fc
      .emailAddress()
      .filter((email) => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email));
    fc.assert(
      fc.property(simplifiedEmailArb, (email) => {
        return isValidEmail(email) === true;
      }),
      { numRuns: 100 },
    );
  });

  it('strings sin @ siempre retornan false', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('@')),
        (str) => {
          return isValidEmail(str) === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P6: Rechazo de campos vacíos (isNonEmptyString)
// Feature: school-website, Property 6: Rechazo de campos vacíos
// Valida: Requisito 8.6
// ---------------------------------------------------------------------------

describe('isNonEmptyString — pruebas de ejemplo', () => {
  it('acepta string con contenido', () => {
    expect(isNonEmptyString('Hola')).toBe(true);
  });

  it('rechaza string solo espacios', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('rechaza null', () => {
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('rechaza número', () => {
    expect(isNonEmptyString(42)).toBe(false);
  });

  it('acepta string con espacios y contenido', () => {
    expect(isNonEmptyString('  hola  ')).toBe(true);
  });
});

describe('P6 — isNonEmptyString (property-based)', () => {
  // Feature: school-website, Property 6: Rechazo de campos vacíos
  it('strings con solo espacios siempre retornan false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }).map((n) => ' '.repeat(n)),
        (spaces) => {
          return isNonEmptyString(spaces) === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('strings con al menos un char no-espacio retornan true', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim().length > 0),
        (str) => {
          return isNonEmptyString(str) === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P7: Filtrado de búsqueda en tablas
// Feature: school-website, Property 7: Filtrado de búsqueda
// Valida: Requisitos 9.9, 10.7
// ---------------------------------------------------------------------------

describe('filterBySearchQuery — pruebas de ejemplo', () => {
  const items = [
    { nombre: 'Ana García', email: 'ana@escuela.mx' },
    { nombre: 'Luis Pérez', email: 'luis@escuela.mx' },
    { nombre: 'María López', email: 'maria@otro.com' },
  ];

  it('filtra por nombre (case-insensitive)', () => {
    const result = filterBySearchQuery(items, 'ana', ['nombre']);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Ana García');
  });

  it('filtra por email', () => {
    const result = filterBySearchQuery(items, 'escuela', ['email']);
    expect(result).toHaveLength(2);
  });

  it('query vacía retorna todos', () => {
    const result = filterBySearchQuery(items, '', ['nombre']);
    expect(result).toHaveLength(3);
  });

  it('query solo espacios retorna todos', () => {
    const result = filterBySearchQuery(items, '   ', ['nombre']);
    expect(result).toHaveLength(3);
  });

  it('sin coincidencias retorna array vacío', () => {
    const result = filterBySearchQuery(items, 'xyz123', ['nombre', 'email']);
    expect(result).toHaveLength(0);
  });

  it('array vacío retorna array vacío', () => {
    const result = filterBySearchQuery([], 'ana', ['nombre']);
    expect(result).toHaveLength(0);
  });
});

describe('P7 — filterBySearchQuery (property-based)', () => {
  // Feature: school-website, Property 7: Filtrado de búsqueda
  const itemArb = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 30 }),
    email: fc.string({ minLength: 1, maxLength: 30 }),
  });

  it('el resultado siempre es subconjunto del input', () => {
    fc.assert(
      fc.property(fc.array(itemArb), fc.string(), (items, query) => {
        const result = filterBySearchQuery(items, query, ['nombre', 'email']);
        return result.every((r) => items.includes(r));
      }),
      { numRuns: 100 },
    );
  });

  it('si query vacía retorna todos los items', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const result = filterBySearchQuery(items, '', ['nombre', 'email']);
        return result.length === items.length;
      }),
      { numRuns: 100 },
    );
  });

  it('todos los resultados contienen la query (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb),
        // Solo queries no-vacías (con al menos un char no-espacio) para que el filtro aplique
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        (items, query) => {
          const result = filterBySearchQuery(items, query, ['nombre', 'email']);
          const lowerQuery = query.toLowerCase();
          return result.every(
            (r) =>
              r.nombre.toLowerCase().includes(lowerQuery) ||
              r.email.toLowerCase().includes(lowerQuery),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P11: Extracción y construcción de URL de YouTube
// Feature: school-website, Property 11: URL de YouTube
// Valida: Requisito 18.10
// ---------------------------------------------------------------------------

describe('extractYouTubeId / buildYouTubeEmbedUrl — pruebas de ejemplo', () => {
  const validId = 'dQw4w9WgXcQ';

  it('extrae ID de URL completa', () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${validId}`)).toBe(validId);
  });

  it('extrae ID de URL corta', () => {
    expect(extractYouTubeId(`https://youtu.be/${validId}`)).toBe(validId);
  });

  it('extrae ID directo de 11 chars', () => {
    expect(extractYouTubeId(validId)).toBe(validId);
  });

  it('retorna null para URL inválida', () => {
    expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
  });

  it('retorna null para string corto', () => {
    expect(extractYouTubeId('abc')).toBeNull();
  });

  it('buildYouTubeEmbedUrl produce URL correcta', () => {
    expect(buildYouTubeEmbedUrl(validId)).toBe(`https://www.youtube.com/embed/${validId}`);
  });

  it('buildYouTubeEmbedUrl retorna null para entrada inválida', () => {
    expect(buildYouTubeEmbedUrl('no-valido')).toBeNull();
  });
});

describe('P11 — extractYouTubeId / buildYouTubeEmbedUrl (property-based)', () => {
  // Feature: school-website, Property 11: URL de YouTube
  // Generador de IDs válidos de YouTube: 11 chars alfanuméricos, guiones o subrayados
  const validYouTubeIdArb = fc
    .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'), {
      minLength: 11,
      maxLength: 11,
    });

  it('IDs de 11 chars válidos siempre producen embed URL correcta', () => {
    fc.assert(
      fc.property(validYouTubeIdArb, (id) => {
        const embedUrl = buildYouTubeEmbedUrl(id);
        return embedUrl === `https://www.youtube.com/embed/${id}`;
      }),
      { numRuns: 100 },
    );
  });

  it('URL completa con ID válido produce embed URL correcta', () => {
    fc.assert(
      fc.property(validYouTubeIdArb, (id) => {
        const url = `https://www.youtube.com/watch?v=${id}`;
        const embedUrl = buildYouTubeEmbedUrl(url);
        return embedUrl === `https://www.youtube.com/embed/${id}`;
      }),
      { numRuns: 100 },
    );
  });

  it('URL corta con ID válido produce embed URL correcta', () => {
    fc.assert(
      fc.property(validYouTubeIdArb, (id) => {
        const url = `https://youtu.be/${id}`;
        const embedUrl = buildYouTubeEmbedUrl(url);
        return embedUrl === `https://www.youtube.com/embed/${id}`;
      }),
      { numRuns: 100 },
    );
  });

  it('strings inválidos (sin formato YouTube) retornan null', () => {
    fc.assert(
      fc.property(
        // Strings que no son IDs de 11 chars ni URLs de YouTube
        fc.string({ minLength: 1, maxLength: 8 }).filter((s) => !/^[a-zA-Z0-9_-]{11}$/.test(s)),
        (str) => {
          return extractYouTubeId(str) === null;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P12: Validación de archivos de video
// Feature: school-website, Property 12: Validación de archivos de video
// Valida: Requisito 18.9
// ---------------------------------------------------------------------------

describe('isValidVideoFile — pruebas de ejemplo', () => {
  it('acepta mp4 con tamaño válido', () => {
    expect(isValidVideoFile({ type: 'video/mp4', size: 1024 })).toBe(true);
  });

  it('acepta webm con tamaño exactamente 500 MB', () => {
    expect(isValidVideoFile({ type: 'video/webm', size: 524288000 })).toBe(true);
  });

  it('rechaza mp4 que supera 500 MB', () => {
    expect(isValidVideoFile({ type: 'video/mp4', size: 524288001 })).toBe(false);
  });

  it('rechaza tipo avi', () => {
    expect(isValidVideoFile({ type: 'video/avi', size: 1024 })).toBe(false);
  });

  it('rechaza imagen', () => {
    expect(isValidVideoFile({ type: 'image/png', size: 100 })).toBe(false);
  });

  it('rechaza null', () => {
    expect(isValidVideoFile(null)).toBe(false);
  });

  it('rechaza objeto sin propiedades', () => {
    expect(isValidVideoFile({})).toBe(false);
  });
});

describe('P12 — isValidVideoFile (property-based)', () => {
  // Feature: school-website, Property 12: Validación de archivos de video
  const MAX_SIZE = 524288000;

  it('solo acepta mp4/webm con size <= 524288000', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('video/mp4', 'video/webm'),
          size: fc.integer({ min: 0, max: MAX_SIZE }),
        }),
        (file) => {
          return isValidVideoFile(file) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rechaza mp4/webm con size > 524288000', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('video/mp4', 'video/webm'),
          size: fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE + 1_000_000 }),
        }),
        (file) => {
          return isValidVideoFile(file) === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rechaza tipos MIME que no son mp4 ni webm', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string().filter((s) => s !== 'video/mp4' && s !== 'video/webm'),
          size: fc.integer({ min: 0, max: MAX_SIZE }),
        }),
        (file) => {
          return isValidVideoFile(file) === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});
