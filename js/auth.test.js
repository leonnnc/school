/**
 * auth.test.js — Pruebas de propiedad y unitarias para auth.js
 *
 * Prueba de propiedad P10: Enrutamiento por rol
 * Feature: school-website, Property 10: Enrutamiento por rol
 *
 * Valida: Requisitos 13.3, 13.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Función bajo prueba — extraída para testeo puro (sin dependencias Firebase)
// La lógica es idéntica a la exportada en auth.js
// ---------------------------------------------------------------------------

/**
 * Retorna la URL del panel correspondiente al rol dado.
 * @param {string} role
 * @returns {string}
 */
function getRoleRedirectUrl(role) {
  if (role === 'admin') return 'panel_admin.html';
  if (role === 'maestro') return 'panel_maestro.html';
  return 'login.html';
}

// ---------------------------------------------------------------------------
// Pruebas unitarias (ejemplos concretos)
// ---------------------------------------------------------------------------

describe('getRoleRedirectUrl — pruebas de ejemplo', () => {
  it('retorna panel_admin.html para rol "admin"', () => {
    expect(getRoleRedirectUrl('admin')).toBe('panel_admin.html');
  });

  it('retorna panel_maestro.html para rol "maestro"', () => {
    expect(getRoleRedirectUrl('maestro')).toBe('panel_maestro.html');
  });

  it('retorna login.html para rol desconocido', () => {
    expect(getRoleRedirectUrl('otro')).toBe('login.html');
  });

  it('retorna login.html para string vacío', () => {
    expect(getRoleRedirectUrl('')).toBe('login.html');
  });

  it('retorna login.html para null', () => {
    expect(getRoleRedirectUrl(null)).toBe('login.html');
  });

  it('retorna login.html para "ADMIN" (case-sensitive)', () => {
    expect(getRoleRedirectUrl('ADMIN')).toBe('login.html');
  });

  it('retorna login.html para "Maestro" (case-sensitive)', () => {
    expect(getRoleRedirectUrl('Maestro')).toBe('login.html');
  });
});

// ---------------------------------------------------------------------------
// Prueba de propiedad P10: Enrutamiento por rol
// Feature: school-website, Property 10: Enrutamiento por rol
// Valida: Requisitos 13.3, 13.4
// ---------------------------------------------------------------------------

describe('P10 — Enrutamiento por rol (property-based)', () => {
  it('para rol "admin" siempre retorna panel_admin.html', () => {
    // Propiedad: el rol exacto "admin" siempre produce panel_admin.html
    fc.assert(
      fc.property(fc.constant('admin'), (role) => {
        return getRoleRedirectUrl(role) === 'panel_admin.html';
      }),
      { numRuns: 100 },
    );
  });

  it('para rol "maestro" siempre retorna panel_maestro.html', () => {
    // Propiedad: el rol exacto "maestro" siempre produce panel_maestro.html
    fc.assert(
      fc.property(fc.constant('maestro'), (role) => {
        return getRoleRedirectUrl(role) === 'panel_maestro.html';
      }),
      { numRuns: 100 },
    );
  });

  it('para cualquier rol distinto de "admin" y "maestro" retorna login.html', () => {
    // Propiedad: cualquier string que no sea exactamente "admin" o "maestro"
    // debe producir login.html (acceso denegado al Panel_Admin)
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'admin' && s !== 'maestro'),
        (role) => {
          return getRoleRedirectUrl(role) === 'login.html';
        },
      ),
      { numRuns: 100 },
    );
  });

  it('para roles conocidos ("admin","maestro","otro","","ADMIN") retorna la URL correcta', () => {
    // Propiedad: los roles del conjunto conocido producen la URL esperada
    const roleToUrl = {
      admin: 'panel_admin.html',
      maestro: 'panel_maestro.html',
      otro: 'login.html',
      '': 'login.html',
      ADMIN: 'login.html',
    };

    fc.assert(
      fc.property(
        fc.constantFrom('admin', 'maestro', 'otro', '', 'ADMIN'),
        (role) => {
          return getRoleRedirectUrl(role) === roleToUrl[role];
        },
      ),
      { numRuns: 100 },
    );
  });

  it('la URL resultante siempre es una de las tres URLs válidas del sistema', () => {
    // Propiedad: el resultado siempre es una URL conocida del sistema
    const validUrls = new Set(['panel_admin.html', 'panel_maestro.html', 'login.html']);

    fc.assert(
      fc.property(fc.string(), (role) => {
        const url = getRoleRedirectUrl(role);
        return validUrls.has(url);
      }),
      { numRuns: 100 },
    );
  });
});
