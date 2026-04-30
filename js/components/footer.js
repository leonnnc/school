/**
 * footer.js — Footer dinámico
 *
 * Requisitos: 7.1–7.6
 *
 * Funciones exportadas:
 *   - initFooter() → Carga datos de Firestore y renderiza el footer en #footer
 */

import { getDocument } from '../utils/firestore-helpers.js';

// Datos por defecto cuando Firestore no tiene información
const FOOTER_DEFAULT = {
  nombreEscuela: 'Nuestra Escuela',
  descripcion: 'Formando el futuro con excelencia académica.',
  direccion: 'Av. Educación 123, Ciudad',
  telefono: '+52 (55) 1234-5678',
  email: 'contacto@escuela.edu.mx',
  redesSociales: {
    facebook: '#',
    instagram: '#',
    twitter: '#',
    youtube: '#',
  },
};

// Navegación del footer (Req. 7.2)
const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#bienvenida', label: 'Bienvenida' },
  { href: '#secciones', label: 'Secciones Académicas' },
  { href: '#maestros', label: 'Maestros' },
  { href: '#videos', label: 'Galería de Videos' },
  { href: '#registro', label: 'Registro' },
];

/**
 * Inicializa el footer dinámico en #footer.
 * Carga los datos desde `contenido_sitio/footer` en Firestore.
 * Si no hay datos, usa los valores por defecto.
 */
export async function initFooter() {
  const footerEl = document.getElementById('footer');
  if (!footerEl) return;

  let data = FOOTER_DEFAULT;

  try {
    const doc = await getDocument('contenido_sitio', 'footer');
    if (doc) {
      data = {
        nombreEscuela: doc.nombreEscuela || FOOTER_DEFAULT.nombreEscuela,
        descripcion: doc.descripcion || FOOTER_DEFAULT.descripcion,
        direccion: doc.direccion || FOOTER_DEFAULT.direccion,
        telefono: doc.telefono || FOOTER_DEFAULT.telefono,
        email: doc.email || FOOTER_DEFAULT.email,
        redesSociales: doc.redesSociales || FOOTER_DEFAULT.redesSociales,
      };
    }
  } catch (error) {
    console.error('Error al cargar datos del footer:', error);
    // Usar datos por defecto
  }

  _renderFooter(footerEl, data);
}

/**
 * Renderiza el contenido del footer en el elemento dado.
 *
 * @param {HTMLElement} footerEl - Elemento #footer del DOM.
 * @param {Object} data - Datos del footer.
 */
function _renderFooter(footerEl, data) {
  const year = new Date().getFullYear();
  const redes = data.redesSociales || {};

  footerEl.innerHTML = `
    <div class="container">
      <div class="footer-grid">

        <!-- Brand -->
        <div class="footer-brand">
          <span class="footer-brand-name">${_escapeHtml(data.nombreEscuela)}</span>
          <p class="footer-brand-description">${_escapeHtml(data.descripcion)}</p>
        </div>

        <!-- Navegación (Req. 7.2, 7.3) -->
        <nav aria-label="Navegación del footer">
          <p class="footer-nav-title">Navegación</p>
          <ul class="footer-nav-list">
            ${NAV_LINKS.map((link) => `
              <li>
                <a href="${link.href}">${_escapeHtml(link.label)}</a>
              </li>
            `).join('')}
          </ul>
        </nav>

        <!-- Contacto (Req. 7.4) -->
        <div>
          <p class="footer-contact-title">Contacto</p>
          <ul class="footer-contact-list">
            <li class="footer-contact-item">
              <svg class="footer-contact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${_escapeHtml(data.direccion)}</span>
            </li>
            <li class="footer-contact-item">
              <svg class="footer-contact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.9 2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z"></path>
              </svg>
              <a href="tel:${_escapeHtml(data.telefono)}">${_escapeHtml(data.telefono)}</a>
            </li>
            <li class="footer-contact-item">
              <svg class="footer-contact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <a href="mailto:${_escapeHtml(data.email)}">${_escapeHtml(data.email)}</a>
            </li>
          </ul>
        </div>

        <!-- Redes sociales (Req. 7.4) -->
        <div>
          <p class="footer-social-title">Síguenos</p>
          <ul class="footer-social-list">
            ${redes.facebook ? `
            <li>
              <a href="${_escapeHtml(redes.facebook)}" class="footer-social-link"
                 aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="currentColor" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </li>` : ''}
            ${redes.instagram ? `
            <li>
              <a href="${_escapeHtml(redes.instagram)}" class="footer-social-link"
                 aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                     stroke-linejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </li>` : ''}
            ${redes.twitter ? `
            <li>
              <a href="${_escapeHtml(redes.twitter)}" class="footer-social-link"
                 aria-label="Twitter / X" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </li>` : ''}
            ${redes.youtube ? `
            <li>
              <a href="${_escapeHtml(redes.youtube)}" class="footer-social-link"
                 aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="currentColor" aria-hidden="true">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
                </svg>
              </a>
            </li>` : ''}
          </ul>
        </div>

      </div>

      <!-- Barra inferior con copyright (Req. 7.5) -->
      <div class="footer-bottom">
        <p class="footer-bottom-copyright">
          &copy; ${year} ${_escapeHtml(data.nombreEscuela)}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `;
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
