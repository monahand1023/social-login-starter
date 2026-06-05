// ────────────────────────────────────────────────────────────────────────
//  STEP: copy this file to `config.js`, then fill in the 4 values that the
//  deploy step (infra/deploy.sh) prints for you.
//
//  ⚠️  ALL FOUR VALUES BELOW ARE PUBLIC AND SAFE TO COMMIT.
//      A Cognito "app client" with no secret is designed to live in the
//      browser. Your real secrets (Google client secret, Apple key) only
//      ever go into AWS — never into this file.
// ────────────────────────────────────────────────────────────────────────
window.AUTH_CONFIG = {
  region:      'us-east-1',                                     // e.g. us-east-1
  userPoolId:  'us-east-1_XXXXXXXXX',                           // e.g. us-east-1_AbC123xyz
  clientId:    'xxxxxxxxxxxxxxxxxxxxxxxxxx',                    // long string, no secret
  domain:      'your-prefix.auth.us-east-1.amazoncognito.com',  // your free Cognito domain

  // These two are computed for you — usually no need to change them.
  redirectUri: window.location.origin + '/callback.html',
  logoutUri:   window.location.origin + '/',
  scope:       'email openid profile',

  // ── OPTIONAL: "Level 2" server-side sessions (httpOnly cookie) ───────────
  //  Leave this EMPTY for the default browser-only demo (no backend needed).
  //  To switch the demo to secure, server-side sessions, deploy the
  //  backend-optional/ stack and paste its SessionApiUrl here.
  //  See docs/07-level-2-backend.md.
  sessionApiUrl: '',
};
