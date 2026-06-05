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

  // Returns the trimmed Level-2 session API base URL, or null if not configured.
  // When null, the library runs in Level-1 (browser-only) mode.
  function sessionApiUrl() {
    const url = getConfig().sessionApiUrl;
    return url && url.trim() ? url.trim().replace(/\/$/, '') : null;
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

    // Level 2 (sessionApiUrl set): hand the ID token to the backend, which
    // validates it and sets an httpOnly session cookie. The browser then keeps
    // NO tokens in JS-readable storage — the cookie is the source of truth.
    const api = sessionApiUrl();
    if (api) {
      const r = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: tokens.id_token }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Creating the server session failed (${r.status}): ${text}`);
      }
      const u = await r.json();
      return { sub: u.sub, email: u.email, name: u.email, claims: {} };
    }

    // Level 1 (default): keep the tokens in sessionStorage (browser-only).
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

  // Returns a Promise of the current user (or null). Works in BOTH modes:
  //  - Level 2 (sessionApiUrl set): asks the backend, which reads the httpOnly
  //    session cookie the browser sends automatically.
  //  - Level 1 (default): decodes the token held in sessionStorage.
  // Prefer this over the synchronous isLoggedIn()/getUser() so your UI works
  // whether or not the backend is enabled.
  async function loadUser() {
    const api = sessionApiUrl();
    if (api) {
      try {
        const r = await fetch(api, { method: 'GET', credentials: 'include' });
        if (!r.ok) return null;
        const u = await r.json();
        return { sub: u.sub, email: u.email, name: u.email, claims: {} };
      } catch (e) {
        return null;
      }
    }
    return getUser();
  }

  async function signOut() {
    const config = getConfig();
    // Level 2: ask the backend to delete the session and clear the cookie.
    const api = sessionApiUrl();
    if (api) {
      try {
        await fetch(api, { method: 'DELETE', credentials: 'include' });
      } catch (e) {
        // Ignore network errors on logout — we still clear local + Cognito state.
      }
    }
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
      loadUser,
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
