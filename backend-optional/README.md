# Level-2 Backend — httpOnly Session Cookies (Optional)

**You do NOT need this to get login working. Level 1 (the demo) is complete on its own.**

The `index.html` + `callback.html` demo in the repo root is a fully working "Sign in with Google / Apple" implementation. It stores the Cognito ID token in `sessionStorage`, which is scoped to the browser tab and is never sent to a server. That is the right choice for most static sites.

This directory is for teams who want to go further.

---

## What Level 2 adds

After a successful Level 1 sign-in, `callback.html` has the Cognito `id_token` in memory. At Level 2, the browser POSTs that token to this Lambda, which:

1. **Validates the token** against Cognito's JWKS endpoint using `aws-jwt-verify` (the token's signature, issuer, audience, and expiry are all checked cryptographically — no secrets on your side).
2. **Creates a server-side session record** in DynamoDB keyed by a random UUID.
3. **Returns an `httpOnly` cookie** (`Set-Cookie: session=<uuid>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`).

The browser stores the cookie automatically. Because the cookie is `HttpOnly`, **JavaScript cannot read it** — even if an XSS vulnerability exists in your page, an attacker cannot steal the session identifier. Later API calls include the cookie automatically, so the backend knows who the user is without the frontend ever touching the token again.

### The trade-off

This is a real backend. You are now responsible for:

- Deploying and maintaining a Lambda + DynamoDB table.
- Managing CORS headers if your frontend and API are on different origins.
- Deciding how to handle session expiry, refresh, and logout (clearing the cookie and the DynamoDB record).
- Paying for Lambda invocations and DynamoDB reads/writes (costs are very low at small scale, but non-zero).

If your site is static and you are not building an API that needs to authenticate requests server-side, **stick with Level 1**.

### How a production site does it

The production site that inspired this starter uses the same pattern — validate the Cognito ID token, store a server-side session, return an httpOnly cookie — but the backend is written in **Go**, not Node.js. This Node version is a teaching equivalent: same architecture, same security properties, smaller surface area, easier to read and modify.

---

## Prerequisites

- Complete **Level 1** first (docs 01–05). You need a working Cognito user pool and `config.js`.
- Install the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
- The `UserPoolId` and `ClientId` printed by `infra/deploy.sh` (or from your Cognito console).

---

## Deploy

```bash
# From the backend-optional/infra directory:
cd backend-optional/infra

# Build (installs aws-jwt-verify + AWS SDK into the Lambda package):
sam build

# Deploy (interactive first time — SAM will ask for a stack name and region):
sam deploy --guided \
  --parameter-overrides \
    UserPoolId=<your-user-pool-id> \
    ClientId=<your-client-id>
```

SAM will print the `SessionApiUrl` output (a Lambda Function URL). Copy it — you'll POST to it from your frontend.

---

## Call it from the frontend

After a successful `handleCallback()`, you have the raw tokens in `sessionStorage` under the key `sl_tokens`. Here is the minimal wiring (add this to your `callback.html` after `window.location.replace('index.html')` returns, or factor it into your own session layer):

```js
const stored = JSON.parse(sessionStorage.getItem('sl_tokens') || 'null');
if (stored) {
  await fetch('https://<your-session-api-url>/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',          // tells the browser to send/receive cookies
    body: JSON.stringify({ idToken: stored.id_token }),
  });
  // The browser now holds an httpOnly session cookie.
  // You can optionally clear the tokens from sessionStorage at this point.
  sessionStorage.removeItem('sl_tokens');
}
```

> **Note:** `credentials: 'include'` is required for the browser to store the cookie cross-origin. Your Lambda's CORS configuration (in `session-api.yaml`) must set `AllowCredentials: true` and a specific `AllowOrigins` entry (not `*`) when using credentials. The template ships with `AllowCredentials: false` and `AllowOrigins: ['*']` as a safe default for same-origin or testing; update both for production cross-origin use.

---

## File map

```
backend-optional/
├── README.md                  ← you are here
├── session-lambda/
│   ├── index.js               ← Lambda handler (validate token, write DynamoDB, set cookie)
│   ├── cookie.js              ← pure Set-Cookie builder (unit-tested)
│   └── package.json           ← aws-jwt-verify + AWS SDK v3 dependencies
├── test/
│   └── cookie.test.js         ← node:test unit tests for cookie.js
└── infra/
    └── session-api.yaml       ← AWS SAM template (Lambda + DynamoDB + Function URL)
```

---

## Run the tests

```bash
node --test backend-optional/test/cookie.test.js
```

Expected: 2 tests pass. The cookie helper is the only unit-testable piece — the Lambda handler (`index.js`) calls live AWS services and is integration-tested by deploying and POSTing a real token.
