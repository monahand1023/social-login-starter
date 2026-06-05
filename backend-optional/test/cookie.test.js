const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildSessionCookie,
  clearSessionCookie,
  parseSessionId,
} = require('../session-lambda/cookie.js');

test('builds an httpOnly, Secure, SameSite=None cookie', () => {
  const c = buildSessionCookie('abc123', 3600);
  assert.match(c, /^session=abc123;/);
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
  // SameSite=None is required so the cookie works when the session API is on a
  // different origin from your site (e.g. a Lambda Function URL).
  assert.match(c, /SameSite=None/);
  assert.match(c, /Max-Age=3600/);
  assert.match(c, /Path=\//);
});

test('clearSessionCookie expires immediately with an empty value', () => {
  const c = clearSessionCookie();
  assert.match(c, /^session=;/);
  assert.match(c, /Max-Age=0/);
});

test('parseSessionId reads the session value from a Function URL cookies array', () => {
  assert.equal(parseSessionId(['other=1', 'session=abc123', 'x=2']), 'abc123');
});

test('parseSessionId reads from a raw Cookie header string', () => {
  assert.equal(parseSessionId('other=1; session=abc123'), 'abc123');
});

test('parseSessionId returns null when the cookie is absent, empty, or input is null', () => {
  assert.equal(parseSessionId(['other=1']), null);
  assert.equal(parseSessionId(['session=']), null);
  assert.equal(parseSessionId(null), null);
});
