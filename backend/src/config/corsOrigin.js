/**
 * Shared CORS allow-list for Express + Socket.IO.
 * - CLIENT_URL can be comma-separated (e.g. https://app.vercel.app,http://localhost:5173)
 * - CLIENT_URL=* means allow any origin (useful before Vercel URL is known)
 * - Production: also allows any https://*.vercel.app preview URL
 */
function parseClientUrls() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isOriginAllowed(origin) {
  if (!origin) return true;

  const configured = parseClientUrls();
  if (configured.includes('*')) return true;
  if (configured.includes(origin)) return true;

  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  return false;
}

function corsOriginCallback(origin, cb) {
  if (isOriginAllowed(origin)) return cb(null, true);
  return cb(new Error(`CORS blocked origin: ${origin || '(none)'}`));
}

module.exports = { parseClientUrls, isOriginAllowed, corsOriginCallback };
