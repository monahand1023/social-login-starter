const { test } = require('node:test');
const assert = require('node:assert');
const { buildSessionCookie } = require('../session-lambda/cookie.js');

test('builds an httpOnly, Secure, SameSite cookie', () => {
  const c = buildSessionCookie('abc123', 3600);
  assert.match(c, /^session=abc123;/);
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
  assert.match(c, /SameSite=Lax/);
  assert.match(c, /Max-Age=3600/);
  assert.match(c, /Path=\//);
});

test('clear cookie has Max-Age=0', () => {
  const c = buildSessionCookie('', 0);
  assert.match(c, /Max-Age=0/);
});
