// social-login-starter — portable OAuth (Authorization Code + PKCE) helper for
// AWS Cognito Hosted UI. No build step, no dependencies. Loaded in the browser
// via <script src="js/auth.js">. Reads window.AUTH_CONFIG (see config.js).
(function () {
  'use strict';

  // crypto works in both the browser and Node 18+ (webcrypto global).
  const cryptoObj = (typeof window !== 'undefined' && window.crypto) || globalThis.crypto;

  // ── Pure helpers (unit-tested in test/auth-helpers.test.js) ──────────────

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    cryptoObj.getRandomValues(values);
    let out = '';
    for (let i = 0; i < length; i++) out += charset[values[i] % charset.length];
    return out;
  }

  async function pkceChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await cryptoObj.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
  }

  function buildAuthorizeUrl(config, { identityProvider, state, nonce, codeChallenge }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      identity_provider: identityProvider,
      state: state,
      nonce: nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://${config.domain}/oauth2/authorize?${params.toString()}`;
  }

  function buildLogoutUrl(config) {
    const params = new URLSearchParams({
      client_id: config.clientId,
      logout_uri: config.logoutUri,
    });
    return `https://${config.domain}/logout?${params.toString()}`;
  }

  function decodeJwt(token) {
    const part = token.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  }

  // ── Browser methods are appended in Task 6 below this marker ─────────────
  // @@BROWSER_METHODS@@

  // Export pure helpers for tests (Node). Browser export is set in Task 6.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _test: {
        base64UrlEncode,
        generateRandomString,
        pkceChallenge,
        buildAuthorizeUrl,
        buildLogoutUrl,
        decodeJwt,
      },
    };
  }
})();
