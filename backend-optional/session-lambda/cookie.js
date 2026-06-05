'use strict';
// Builds the Set-Cookie header value for the session cookie.
function buildSessionCookie(sessionId, maxAgeSeconds) {
  return [
    `session=${sessionId}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}
module.exports = { buildSessionCookie };
