# Level-2 Backend — httpOnly Session Cookies (Optional)

**You do NOT need this to get login working. Level 1 (the demo) is complete on its own.**

The `index.html` + `callback.html` demo in the repo root is a fully working "Sign in with Google / Apple" implementation. It stores the Cognito ID token in `sessionStorage`, which is scoped to the browser tab and is never sent to a server. That is the right choice for most static sites.

This directory is for teams who want to go further.

---

## What Level 2 adds

After a successful Level 1 sign-in, `callback.html` has the Cognito `id_token` in memory. At Level 2, the browser POSTs that token to this Lambda, which:

1. **Validates the token** against Cognito's JWKS endpoint using `aws-jwt-verify` (the token's signature, issuer, audience, and expiry are all checked cryptographically — no secrets on your side).
2. **Creates a server-side session record** in DynamoDB keyed by a random UUID.
3. **Returns an `httpOnly` cookie** (`Set-Cookie: session=<uuid>; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`).

The browser stores the cookie automatically. Because the cookie is `HttpOnly`, **JavaScript cannot read it** — even if an XSS vulnerability exists in your page, an attacker cannot steal the session identifier. Later requests include the cookie automatically, so the backend knows who the user is without the frontend ever touching the token again.

The Lambda is routed by HTTP method: **`POST`** creates the session (above), **`GET`** reads the cookie and returns `{ sub, email }` (used by `socialLogin.loadUser()`), and **`DELETE`** clears the cookie and deletes the session row (used by `socialLogin.signOut()`).

### The trade-off

This is a real backend. You are now responsible for:

- Deploying and maintaining a Lambda + DynamoDB table.
- Managing CORS and **cross-origin cookies** when your frontend and API are on different origins (see the warning in the Deploy section, and the "Cross-origin cookies" section of [`docs/07-level-2-backend.md`](../docs/07-level-2-backend.md)).
- Session expiry and refresh (this starter sets a 7-day TTL and does not refresh; logout is handled for you via the `DELETE` route).
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

# Deploy (interactive first time — SAM will ask for a stack name and region).
# AllowedOrigin MUST be the exact origin you serve your site from
# (scheme + host + port, no trailing slash):
sam deploy --guided \
  --parameter-overrides \
    UserPoolId=<your-user-pool-id> \
    ClientId=<your-client-id> \
    AllowedOrigin=http://localhost:8000
```

SAM will print the `SessionApiUrl` output (a Lambda Function URL). Copy it — you'll paste it into `config.js` next.

> **⚠️ Cross-origin cookies.** `AllowedOrigin` must exactly match your site's origin, because the session cookie is credentialed: the browser only sends/receives it for that one origin, and CORS with credentials forbids the `*` wildcard. The cookie is `SameSite=None; Secure`, which also means **HTTPS only** (`localhost` is exempt, so the demo works locally). Note that some browsers block third-party cookies entirely — for production, host the session API on the **same site** as your pages (e.g. `api.yoursite.com` ↔ `yoursite.com`). Full explanation: ["Cross-origin cookies" in docs/07](../docs/07-level-2-backend.md).

---

## Connect it to the frontend

You do **not** need to write any `fetch` code — the frontend is already wired. Just point `config.js` at your deployed API:

```js
// in config.js
sessionApiUrl: 'https://<your-session-api-url>/',   // the SessionApiUrl output above
```

With that set, `js/auth.js` automatically:

- **POSTs** the ID token on the callback to create the session (and keeps **no** token in `sessionStorage`),
- **GETs** the session in `socialLogin.loadUser()` to render the signed-in state,
- **DELETEs** the session in `socialLogin.signOut()`.

Leave `sessionApiUrl` empty to stay on the browser-only Level-1 demo. See [`docs/07-level-2-backend.md`](../docs/07-level-2-backend.md) for the full walkthrough.

---

## File map

```
backend-optional/
├── README.md                  ← you are here
├── session-lambda/
│   ├── index.js               ← Lambda handler, routed by method: POST/GET/DELETE
│   ├── cookie.js              ← pure cookie helpers: build / clear / parse (unit-tested)
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

Expected: 5 tests pass. The cookie helpers are the only unit-testable pieces — the Lambda handler (`index.js`) calls live AWS services and is integration-tested by deploying and POSTing a real token.
