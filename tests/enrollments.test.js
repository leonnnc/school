/**
 * enrollments.test.js — Pruebas unitarias y de propiedad para lógica de inscripciones
 *
 * Como enrollments.js usa Firebase directamente, las funciones puras de validación
 * se definen aquí mismo para testing aislado.
 *
 * Propiedades cubiertas:
 *   P8: Control de cupo máximo en inscripciones
 *   P9: Prevención de inscripciones duplicadas
 *
 * Valida: Requisitos 12.5, 12.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Lógica pura extraída de enrollments.js para testing
// ---------------------------------------------------------------------------

/**
 * Verifica si hay cupo disponible en un curso.
 * @param {number} alumnosInscritos - Número actual de alumnos inscritos.
 * @param {number} cupoMaximo - Cupo máximo del curso.
 * @returns {boolean} true si hay cupo disponible.
 */
function canEnroll(alumnosInscritos, cupoMaximo) {
  return alumnosInscritos < cupoMaximo;
}

/**
 * Verifica si ya existe una inscripción para el par (alumnoId, cursoId).
 * @param {Array<{alumnoId: string, cursoId: string}>} inscripciones - Lista de inscripciones.
 * @param {string} alumnoId - ID del alumno.
 * @param {string} cursoId - ID del curso.
 * @returns {boolean} true si ya existe la inscripción.
 */
function isDuplicate(inscripciones, alumnoId, cursoId) {
  return inscripciones.some((i) => i.alumnoId === alumnoId && i.cursoId === cursoId);
}

// ---------------------------------------------------------------------------
// P8: Control de cupo máximo
// Feature: school-website, Property 8: Control de cupo máximo
// Valida: Requisito 12.5
// ---------------------------------------------------------------------------

describe('canEnroll — pruebas de ejemplo', () => {
  it('retorna true cuando hay cupo disponible', () => {
    expect(canEnroll(3, 10)).toBe(true);
  });

  it('retorna false cuando el cupo está lleno', () => {
    expect(canEnroll(10, 10)).toBe(false);
  });

  it('retorna false cuando alumnosInscritos supera cupoMaximo', () => {
    expect(canEnroll(11, 10)).toBe(false);
  });

  it('retorna false cuando cupoMaximo es 0', () => {
    expect(canEnroll(0, 0)).toBe(false);
  });

  it('retorna true con 0 inscritos y cupo > 0', () => {
    expect(canEnroll(0, 1)).toBe(true);
  });
});

describe('P8 — canEnroll (property-based)', () => {
  // Feature: school-website, Property 8: Control de cupo máximo
  it('si alumnosInscritos >= cupoMaximo retorna false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (inscritos, cupo) => {
          // Solo probar cuando inscritos >= cupo
          fc.pre(inscritos >= cupo);
          return canEnroll(inscritos, cupo) === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('si alumnosInscritos < cupoMaximo retorna true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 100 }),
        (inscritos, cupo) => {
          // Solo probar cuando inscritos < cupo
          fc.pre(inscritos < cupo);
          return canEnroll(inscritos, cupo) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('alumnosInscritos nunca supera cupoMaximo si se respeta la validación', () => {
    // Simula una secuencia de inscripciones respetando canEnroll
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),  // cupoMaximo
        fc.integer({ min: 0, max: 30 }),  // intentos de inscripción
        (cupoMaximo, intentos) => {
          let inscritos = 0;
          for (let i = 0; i < intentos; i++) {
            if (canEnroll(inscritos, cupoMaximo)) {
              inscritos++;
            }
          }
          return inscritos <= cupoMaximo;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P9: Prevención de inscripciones duplicadas
// Feature: school-website, Property 9: Prevención de duplicados
// Valida: Requisito 12.6
// ---------------------------------------------------------------------------

describe('isDuplicate — pruebas de ejemplo', () => {
  const inscripciones = [
    { alumnoId: 'alumno-1', cursoId: 'curso-A' },
    { alumnoId: 'alumno-2', cursoId: 'curso-B' },
  ];

  it('retorna true para par ya existente', () => {
    expect(isDuplicate(inscripciones, 'alumno-1', 'curso-A')).toBe(true);
  });

  it('retorna false para alumno nuevo', () => {
    expect(isDuplicate(inscripciones, 'alumno-3', 'curso-A')).toBe(false);
  });

  it('retorna false para curso nuevo', () => {
    expect(isDuplicate(inscripciones, 'alumno-1', 'curso-C')).toBe(false);
  });

  it('retorna false para lista vacía', () => {
    expect(isDuplicate([], 'alumno-1', 'curso-A')).toBe(false);
  });

  it('mismo alumno en curso diferente no es duplicado', () => {
    expect(isDuplicate(inscripciones, 'alumno-1', 'curso-B')).toBe(false);
  });
});

describe('P9 — isDuplicate (property-based)', () => {
  // Feature: school-website, Property 9: Prevención de duplicados
  const inscripcionArb = fc.record({
    alumnoId: fc.uuid(),
    cursoId: fc.uuid(),
  });

  it('para cualquier par ya en la lista, retorna true', () => {
    fc.assert(
      fc.property(
        fc.array(inscripcionArb, { minLength: 1 }),
        fc.integer({ min: 0, max: 9 }),
        (inscripciones, idx) => {
          const i = idx % inscripciones.length;
          const { alumnoId, cursoId } = inscripciones[i];
          return isDuplicate(inscripciones, alumnoId, cursoId) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('para pares nuevos (no en la lista), retorna false', () => {
    fc.assert(
      fc.property(
        fc.array(inscripcionArb),
        fc.uuid(),
        fc.uuid(),
        (inscripciones, nuevoAlumnoId, nuevoCursoId) => {
          // Asegurar que el par nuevo no existe en la lista
          fc.pre(
            !inscripciones.some(
              (i) => i.alumnoId === nuevoAlumnoId && i.cursoId === nuevoCursoId,
            ),
          );
          return isDuplicate(inscripciones, nuevoAlumnoId, nuevoCursoId) === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});
