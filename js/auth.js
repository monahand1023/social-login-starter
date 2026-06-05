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

  // ── Browser-facing API (sign-in, callback, session, sign-out) ───────────
  // ── Browser-only: storage keys ───────────────────────────────────────────
  const PENDING_PREFIX = 'sl_pending_';   // sl_pending_<state> -> {verifier, nonce}
  const TOKENS_KEY = 'sl_tokens';         // { id_token, access_token, expires_at }

  function getConfig() {
    if (typeof window === 'undefined' || !window.AUTH_CONFIG) {
      throw new Error('AUTH_CONFIG is not set. Create config.js from config.example.js.');
    }
    return window.AUTH_CONFIG;
  }

  // Start a sign-in: build PKCE + state + nonce, stash them, redirect to Cognito.
  async function startSignIn(identityProvider) {
    const config = getConfig();
    const verifier = generateRandomString(64);
    const state = generateRandomString(32);
    const nonce = generateRandomString(32);
    const codeChallenge = await pkceChallenge(verifier);
    sessionStorage.setItem(PENDING_PREFIX + state, JSON.stringify({ verifier, nonce }));
    window.location.assign(
      buildAuthorizeUrl(config, { identityProvider, state, nonce, codeChallenge })
    );
  }

  function signInWithGoogle() {
    return startSignIn('Google');
  }
  function signInWithApple() {
    return startSignIn('SignInWithApple');
  }

  // Called on callback.html. Exchanges ?code for tokens, verifies state+nonce.
  async function handleCallback() {
    const config = getConfig();
    const params = new URLSearchParams(window.location.search);

    if (params.get('error')) {
      throw new Error(
        `${params.get('error')}: ${params.get('error_description') || 'sign-in failed'}`
      );
    }
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) throw new Error('Missing code or state in callback URL.');

    const pendingRaw = sessionStorage.getItem(PENDING_PREFIX + state);
    if (!pendingRaw) throw new Error('Unknown or expired sign-in state (possible CSRF).');
    const { verifier, nonce } = JSON.parse(pendingRaw);
    sessionStorage.removeItem(PENDING_PREFIX + state);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    });
    const resp = await fetch(`https://${config.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Token exchange failed (${resp.status}): ${text}`);
    }
    const tokens = await resp.json();

    const claims = decodeJwt(tokens.id_token);
    if (claims.nonce !== nonce) throw new Error('Nonce mismatch (possible replay attack).');

    sessionStorage.setItem(
      TOKENS_KEY,
      JSON.stringify({
        id_token: tokens.id_token,
        access_token: tokens.access_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      })
    );
    return getUser();
  }

  function getStoredTokens() {
    const raw = sessionStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const tokens = JSON.parse(raw);
    if (tokens.expires_at && Date.now() > tokens.expires_at) {
      sessionStorage.removeItem(TOKENS_KEY);
      return null;
    }
    return tokens;
  }

  function isLoggedIn() {
    return getStoredTokens() !== null;
  }

  function getUser() {
    const tokens = getStoredTokens();
    if (!tokens) return null;
    const c = decodeJwt(tokens.id_token);
    return { sub: c.sub, email: c.email, name: c.name || c.email, claims: c };
  }

  function signOut() {
    const config = getConfig();
    sessionStorage.removeItem(TOKENS_KEY);
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PENDING_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
    window.location.assign(buildLogoutUrl(config));
  }

  if (typeof window !== 'undefined') {
    window.socialLogin = {
      signInWithGoogle,
      signInWithApple,
      handleCallback,
      isLoggedIn,
      getUser,
      signOut,
    };
  }

  // Export pure helpers for tests (Node). Browser export is set above.
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
