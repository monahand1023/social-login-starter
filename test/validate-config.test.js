const { test } = require('node:test');
const assert = require('node:assert');
const { validateConfig } = require('../js/validate-config.js');

test('valid config returns no errors', () => {
  const errors = validateConfig({
    region: 'us-east-1',
    userPoolId: 'us-east-1_AbC123xyz',
    clientId: '1example23clientid45678',
    domain: 'my-app.auth.us-east-1.amazoncognito.com',
  });
  assert.deepEqual(errors, []);
});

test('missing config object is reported', () => {
  const errors = validateConfig(undefined);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /AUTH_CONFIG is missing/);
});

test('placeholder values are flagged', () => {
  const errors = validateConfig({
    region: 'us-east-1',
    userPoolId: 'us-east-1_XXXXXXXXX',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    domain: 'your-prefix.auth.us-east-1.amazoncognito.com',
  });
  assert.ok(errors.some((e) => /userPoolId/.test(e)));
  assert.ok(errors.some((e) => /clientId/.test(e)));
  assert.ok(errors.some((e) => /domain/.test(e)));
});

test('region that is not a real region is flagged', () => {
  const errors = validateConfig({
    region: 'narnia',
    userPoolId: 'us-east-1_AbC123xyz',
    clientId: '1example23clientid45678',
    domain: 'my-app.auth.us-east-1.amazoncognito.com',
  });
  assert.ok(errors.some((e) => /region/.test(e)));
});

test('userPoolId whose region prefix mismatches config.region is flagged', () => {
  const errors = validateConfig({
    region: 'us-east-1',
    userPoolId: 'eu-west-1_AbC123xyz',
    clientId: '1example23clientid45678',
    domain: 'my-app.auth.us-east-1.amazoncognito.com',
  });
  assert.ok(errors.some((e) => /does not match/.test(e)));
});

test('domain not ending in amazoncognito.com is flagged', () => {
  const errors = validateConfig({
    region: 'us-east-1',
    userPoolId: 'us-east-1_AbC123xyz',
    clientId: '1example23clientid45678',
    domain: 'my-app.example.com',
  });
  assert.ok(errors.some((e) => /amazoncognito\.com/.test(e)));
});
