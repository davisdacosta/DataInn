/**
 * Single place to point the frontend at your backend.
 * - Local dev (frontend and backend on different ports): keep the full URL.
 * - Production behind a reverse proxy on the same origin: set this to '/api'.
 */
window.DATASIKA_CONFIG = {
  API_BASE: 'http://localhost:5000/api',
};
