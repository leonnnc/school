/**
 * carousel.test.js — Pruebas unitarias y de propiedad para carousel.js
 *
 * Propiedades cubiertas:
 *   P1: Navegación circular del carrusel
 *
 * Valida: Requisitos 1.3, 1.4, 1.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { nextIndex, prevIndex } from '../js/components/carousel.js';

// ---------------------------------------------------------------------------
// Pruebas de ejemplo
// ---------------------------------------------------------------------------

describe('nextIndex — pruebas de ejemplo', () => {
  it('avanza al siguiente índice', () => {
    expect(nextIndex(0, 5)).toBe(1);
    expect(nextIndex(3, 5)).toBe(4);
  });

  it('hace wrap al llegar al final', () => {
    expect(nextIndex(4, 5)).toBe(0);
  });

  it('con total=1 siempre retorna 0', () => {
    expect(nextIndex(0, 1)).toBe(0);
  });
});

describe('prevIndex — pruebas de ejemplo', () => {
  it('retrocede al índice anterior', () => {
    expect(prevIndex(3, 5)).toBe(2);
    expect(prevIndex(1, 5)).toBe(0);
  });

  it('hace wrap al llegar al inicio', () => {
    expect(prevIndex(0, 5)).toBe(4);
  });

  it('con total=1 siempre retorna 0', () => {
    expect(prevIndex(0, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// P1: Navegación circular del carrusel
// Feature: school-website, Property 1: Navegación circular del carrusel
// Valida: Requisitos 1.3, 1.4, 1.5
// ---------------------------------------------------------------------------

describe('P1 — Navegación circular del carrusel (property-based)', () => {
  // N: tamaño del carrusel (1–50)
  // i: índice actual (se normaliza con % N para mantenerlo en rango)
  const nArb = fc.integer({ min: 1, max: 50 });
  const iArb = fc.nat();

  it('nextIndex(i, N) siempre produce (i+1) % N', () => {
    // Feature: school-website, Property 1: Navegación circular del carrusel
    fc.assert(
      fc.property(nArb, iArb, (N, rawI) => {
        const i = rawI % N;
        return nextIndex(i, N) === (i + 1) % N;
      }),
      { numRuns: 100 },
    );
  });

  it('prevIndex(i, N) siempre produce (i-1+N) % N', () => {
    // Feature: school-website, Property 1: Navegación circular del carrusel
    fc.assert(
      fc.property(nArb, iArb, (N, rawI) => {
        const i = rawI % N;
        return prevIndex(i, N) === (i - 1 + N) % N;
      }),
      { numRuns: 100 },
    );
  });

  it('nextIndex siempre produce resultado en [0, N-1]', () => {
    fc.assert(
      fc.property(nArb, iArb, (N, rawI) => {
        const i = rawI % N;
        const result = nextIndex(i, N);
        return result >= 0 && result < N;
      }),
      { numRuns: 100 },
    );
  });

  it('prevIndex siempre produce resultado en [0, N-1]', () => {
    fc.assert(
      fc.property(nArb, iArb, (N, rawI) => {
        const i = rawI % N;
        const result = prevIndex(i, N);
        return result >= 0 && result < N;
      }),
      { numRuns: 100 },
    );
  });
});
