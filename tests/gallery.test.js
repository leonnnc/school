/**
 * gallery.test.js — Pruebas unitarias y de propiedad para gallery.js
 *
 * Propiedades cubiertas:
 *   P2: Filtrado de videos activos
 *   P3: Renderizado correcto según tipo de video
 *   P4: Múltiples fuentes para video local
 *
 * Valida: Requisitos 6.3, 6.4, 6.5, 6.6
 *
 * Nota: renderLocalVideo, renderYouTubeEmbed y renderVideoPlayer crean elementos DOM.
 * El entorno jsdom (configurado en vitest.config.js) permite que funcionen correctamente.
 *
 * gallery.js importa firestore-helpers.js que usa el SDK de Firebase vía CDN (https://).
 * Se mockea ese módulo para que las pruebas de funciones puras funcionen sin Firebase.
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Mock de firestore-helpers para evitar la importación del SDK de Firebase vía https://
vi.mock('../js/utils/firestore-helpers.js', () => ({
  getCollection: vi.fn().mockResolvedValue([]),
}));

// Mock de firebase-config.js (importado transitivamente)
vi.mock('../js/firebase-config.js', () => ({
  db: {},
  auth: {},
  storage: {},
}));

// Importar después de los mocks
const { filterActiveVideos, renderLocalVideo, renderYouTubeEmbed, renderVideoPlayer } =
  await import('../js/components/gallery.js');

// ---------------------------------------------------------------------------
// P2: Filtrado de videos activos
// Feature: school-website, Property 2: Filtrado de videos activos
// Valida: Requisito 6.3
// ---------------------------------------------------------------------------

describe('filterActiveVideos — pruebas de ejemplo', () => {
  it('retorna solo videos con activo === true', () => {
    const videos = [
      { titulo: 'A', activo: true },
      { titulo: 'B', activo: false },
      { titulo: 'C', activo: true },
    ];
    const result = filterActiveVideos(videos);
    expect(result).toHaveLength(2);
    expect(result.every((v) => v.activo === true)).toBe(true);
  });

  it('retorna array vacío si ninguno está activo', () => {
    const videos = [{ activo: false }, { activo: false }];
    expect(filterActiveVideos(videos)).toHaveLength(0);
  });

  it('retorna todos si todos están activos', () => {
    const videos = [{ activo: true }, { activo: true }];
    expect(filterActiveVideos(videos)).toHaveLength(2);
  });

  it('retorna array vacío para input vacío', () => {
    expect(filterActiveVideos([])).toHaveLength(0);
  });

  it('retorna array vacío para input no-array', () => {
    expect(filterActiveVideos(null)).toHaveLength(0);
  });
});

describe('P2 — filterActiveVideos (property-based)', () => {
  // Feature: school-website, Property 2: Filtrado de videos activos
  const videoArb = fc.record({
    titulo: fc.string(),
    activo: fc.boolean(),
    tipo: fc.constantFrom('local', 'youtube'),
    url: fc.string(),
  });

  it('resultado solo contiene videos con activo === true', () => {
    fc.assert(
      fc.property(fc.array(videoArb), (videos) => {
        const result = filterActiveVideos(videos);
        return result.every((v) => v.activo === true);
      }),
      { numRuns: 100 },
    );
  });

  it('ningún video con activo === false aparece en el resultado', () => {
    fc.assert(
      fc.property(fc.array(videoArb), (videos) => {
        const result = filterActiveVideos(videos);
        const inactivos = videos.filter((v) => v.activo === false);
        return inactivos.every((v) => !result.includes(v));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P3: Renderizado correcto según tipo de video
// Feature: school-website, Property 3: Renderizado por tipo
// Valida: Requisitos 6.4, 6.5
// ---------------------------------------------------------------------------

describe('renderVideoPlayer — pruebas de ejemplo', () => {
  it('tipo "local" produce elemento VIDEO', () => {
    const el = renderVideoPlayer({ tipo: 'local', url: 'https://example.com/video.mp4' });
    expect(el.tagName).toBe('VIDEO');
  });

  it('tipo "youtube" produce elemento IFRAME', () => {
    const el = renderVideoPlayer({
      tipo: 'youtube',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
    expect(el.tagName).toBe('IFRAME');
  });

  it('tipo desconocido produce elemento de error (no VIDEO ni IFRAME)', () => {
    const el = renderVideoPlayer({ tipo: 'vimeo', url: 'https://vimeo.com/123' });
    expect(el.tagName).not.toBe('VIDEO');
    expect(el.tagName).not.toBe('IFRAME');
  });
});

describe('P3 — renderVideoPlayer (property-based)', () => {
  // Feature: school-website, Property 3: Renderizado por tipo
  it('tipo "local" siempre produce elemento VIDEO', () => {
    fc.assert(
      fc.property(
        fc.record({
          tipo: fc.constant('local'),
          url: fc.string({ minLength: 1 }),
        }),
        (video) => {
          const el = renderVideoPlayer(video);
          return el.tagName === 'VIDEO';
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tipo "youtube" siempre produce elemento IFRAME', () => {
    fc.assert(
      fc.property(
        fc.record({
          tipo: fc.constant('youtube'),
          url: fc.string({ minLength: 1 }),
        }),
        (video) => {
          const el = renderVideoPlayer(video);
          return el.tagName === 'IFRAME';
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P4: Múltiples fuentes para video local
// Feature: school-website, Property 4: Múltiples fuentes para video local
// Valida: Requisito 6.6
// ---------------------------------------------------------------------------

describe('renderLocalVideo — pruebas de ejemplo', () => {
  it('con urlWebm tiene 2 elementos <source>', () => {
    const video = renderLocalVideo(
      'https://example.com/video.mp4',
      'https://example.com/video.webm',
    );
    const sources = video.querySelectorAll('source');
    expect(sources).toHaveLength(2);
  });

  it('sin urlWebm tiene 1 elemento <source>', () => {
    const video = renderLocalVideo('https://example.com/video.mp4');
    const sources = video.querySelectorAll('source');
    expect(sources).toHaveLength(1);
  });

  it('la primera fuente es mp4', () => {
    const video = renderLocalVideo('https://example.com/video.mp4');
    const source = video.querySelector('source');
    expect(source.type).toBe('video/mp4');
  });

  it('la segunda fuente es webm cuando se pasa urlWebm', () => {
    const video = renderLocalVideo(
      'https://example.com/video.mp4',
      'https://example.com/video.webm',
    );
    const sources = video.querySelectorAll('source');
    expect(sources[1].type).toBe('video/webm');
  });

  it('el elemento tiene controls', () => {
    const video = renderLocalVideo('https://example.com/video.mp4');
    expect(video.controls).toBe(true);
  });
});

describe('P4 — renderLocalVideo (property-based)', () => {
  // Feature: school-website, Property 4: Múltiples fuentes para video local
  it('con urlWebm el <video> tiene 2 <source>', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (url, urlWebm) => {
          const video = renderLocalVideo(url, urlWebm);
          return video.querySelectorAll('source').length === 2;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sin urlWebm el <video> tiene 1 <source>', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (url) => {
        const video = renderLocalVideo(url);
        return video.querySelectorAll('source').length === 1;
      }),
      { numRuns: 100 },
    );
  });

  it('con urlWebm=null el <video> tiene 1 <source>', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (url) => {
        const video = renderLocalVideo(url, null);
        return video.querySelectorAll('source').length === 1;
      }),
      { numRuns: 100 },
    );
  });
});
