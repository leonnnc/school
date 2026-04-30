/**
 * auth.js — Sistema de autenticación y control de acceso por roles
 *
 * Gestiona:
 * - Login con Firebase Authentication
 * - Protección de rutas por autenticación y rol
 * - Cierre de sesión
 * - Enrutamiento por rol
 *
 * Requisitos: 13.1–13.7
 */

import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ---------------------------------------------------------------------------
// Funciones exportadas
// ---------------------------------------------------------------------------

/**
 * Obtiene el rol del usuario desde Firestore.
 * @param {string} uid — UID del usuario autenticado
 * @returns {Promise<string|null>} — El campo `rol` del documento, o null si no existe
 */
export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', uid));
    if (userDoc.exists()) {
      return userDoc.data().rol ?? null;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener el rol del usuario:', error);
    return null;
  }
}

/**
 * Retorna la URL del panel correspondiente al rol dado.
 * @param {string} role — Rol del usuario ('admin' | 'maestro' | otro)
 * @returns {string} — URL de redirección
 */
export function getRoleRedirectUrl(role) {
  if (role === 'admin') return 'panel_admin.html';
  if (role === 'maestro') return 'panel_maestro.html';
  return 'login.html';
}

/**
 * Verifica que el usuario esté autenticado; si no, redirige a `redirectTo`.
 * @param {string} redirectTo — URL a la que redirigir si no hay sesión activa
 */
export function requireAuth(redirectTo) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectTo;
    }
  });
}

/**
 * Verifica que el usuario esté autenticado Y tenga el rol requerido.
 * Si no cumple alguna condición, redirige a `redirectTo`.
 * Si el rol no coincide, muestra el mensaje de error antes de redirigir.
 * @param {string} role — Rol requerido ('admin' | 'maestro')
 * @param {string} redirectTo — URL a la que redirigir si no tiene permiso
 */
export function requireRole(role, redirectTo) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = redirectTo;
      return;
    }

    const userRole = await getUserRole(user.uid);

    if (userRole !== role) {
      // Mostrar mensaje de error antes de redirigir (Requisito 13.4)
      const errorContainer = document.getElementById('access-error');
      if (errorContainer) {
        errorContainer.textContent = 'No tienes permisos para acceder a esta sección.';
        errorContainer.removeAttribute('hidden');
      } else {
        // Si no hay contenedor de error en el DOM, usar alert como fallback
        // y redirigir al panel correcto según el rol real
        alert('No tienes permisos para acceder a esta sección.');
      }

      // Redirigir al panel correcto según el rol real, o a login si no tiene rol
      const targetUrl = userRole ? getRoleRedirectUrl(userRole) : redirectTo;
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);
    }
  });
}

/**
 * Cierra la sesión del usuario en Firebase Authentication y redirige a login.
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  } finally {
    window.location.href = 'login.html';
  }
}

// ---------------------------------------------------------------------------
// Lógica de login (solo se activa cuando estamos en login.html)
// ---------------------------------------------------------------------------

const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-login');

    const email = emailInput?.value?.trim() ?? '';
    const password = passwordInput?.value ?? '';

    // Limpiar error previo
    if (loginError) {
      loginError.textContent = '';
      loginError.classList.add('hidden');
    }

    // Deshabilitar botón durante el proceso (Requisito 13.5 — UX)
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Iniciando sesión...';
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Obtener rol y redirigir al panel correspondiente (Requisito 13.3)
      const role = await getUserRole(uid);
      window.location.href = getRoleRedirectUrl(role);
    } catch (error) {
      // Mostrar mensaje genérico sin revelar cuál campo es incorrecto (Requisito 13.5)
      if (loginError) {
        loginError.textContent = 'Correo electrónico o contraseña incorrectos';
        loginError.classList.remove('hidden');
      }

      // Re-habilitar botón
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
      }
    }
  });
}
