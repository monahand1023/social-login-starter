const { test } = require('node:test');
const assert = require('node:assert');
const auth = require('../js/auth.js');

const CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_AbC123xyz',
  clientId: 'client123',
  domain: 'my-app.auth.us-east-1.amazoncognito.com',
  redirectUri: 'https://example.com/callback.html',
  logoutUri: 'https://example.com/',
  scope: 'email openid profile',
};

test('base64UrlEncode produces URL-safe output with no padding', () => {
  const bytes = new Uint8Array([251, 255, 191]); // forces + / = in standard base64
  const out = auth._test.base64UrlEncode(bytes.buffer);
  assert.ok(!/[+/=]/.test(out), `expected URL-safe, got ${out}`);
});

test('generateRandomString returns the requested length and only PKCE chars', () => {
  const s = auth._test.generateRandomString(50);
  assert.equal(s.length, 50);
  assert.match(s, /^[A-Za-z0-9\-._~]+$/);
});

test('pkceChallenge of a known verifier matches the RFC 7636 test vector', async () => {
  // RFC 7636 Appendix B
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const challenge = await auth._test.pkceChallenge(verifier);
  assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('buildAuthorizeUrl includes the right query params', () => {
  const url = auth._test.buildAuthorizeUrl(CONFIG, {
    identityProvider: 'Google',
    state: 'st',
    nonce: 'no',
    codeChallenge: 'cc',
  });
  assert.ok(url.startsWith('https://my-app.auth.us-east-1.amazoncognito.com/oauth2/authorize?'));
  const q = new URL(url).searchParams;
  assert.equal(q.get('response_type'), 'code');
  assert.equal(q.get('client_id'), 'client123');
  assert.equal(q.get('redirect_uri'), 'https://example.com/callback.html');
  assert.equal(q.get('identity_provider'), 'Google');
  assert.equal(q.get('code_challenge'), 'cc');
  assert.equal(q.get('code_challenge_method'), 'S256');
  assert.equal(q.get('scope'), 'email openid profile');
});

test('buildLogoutUrl points at the Cognito /logout endpoint', () => {
  const url = auth._test.buildLogoutUrl(CONFIG);
  assert.ok(url.startsWith('https://my-app.auth.us-east-1.amazoncognito.com/logout?'));
  const q = new URL(url).searchParams;
  assert.equal(q.get('client_id'), 'client123');
  assert.equal(q.get('logout_uri'), 'https://example.com/');
});

test('decodeJwt extracts the payload claims', () => {
  // header.payload.signature — payload = {"sub":"123","email":"a@b.com","nonce":"n1"}
  const payload = Buffer.from(JSON.stringify({ sub: '123', email: 'a@b.com', nonce: 'n1' })).toString('base64url');
  const token = `h.${payload}.s`;
  const claims = auth._test.decodeJwt(token);
  assert.equal(claims.sub, '123');
  assert.equal(claims.email, 'a@b.com');
  assert.equal(claims.nonce, 'n1');
});
