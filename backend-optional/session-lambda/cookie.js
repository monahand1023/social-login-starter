'use strict';
// Builds and parses the httpOnly session cookie.

// SameSite=None lets the cookie be set and sent when the session API is on a
// DIFFERENT origin from your website (e.g. this Lambda's Function URL during the
// demo). SameSite=None requires Secure, so the cookie only travels over HTTPS.
// For a production deployment where the API is the SAME site as your pages
// (e.g. api.yoursite.com ↔ yoursite.com) you could tighten this to SameSite=Lax.
function buildSessionCookie(sessionId, maxAgeSeconds) {
  return [
    `session=${sessionId}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

// A cookie that immediately expires — used on logout to clear the session.
function clearSessionCookie() {
  return buildSessionCookie('', 0);
}

// Extract the `session` value from a Lambda Function URL `event.cookies` array
// (e.g. ["session=abc", "other=x"]) or a raw `Cookie:` header string.
// Returns null if the cookie is absent or has an empty value.
function parseSessionId(cookies) {
  if (!cookies) return null;
  const list = Array.isArray(cookies) ? cookies : String(cookies).split(/;\s*/);
  for (const c of list) {
    const eq = c.indexOf('=');
    if (eq === -1) continue;
    if (c.slice(0, eq).trim() === 'session') {
      const value = c.slice(eq + 1).trim();
      return value.length ? value : null;
    }
  }
  return null;
}

module.exports = { buildSessionCookie, clearSessionCookie, parseSessionId };
