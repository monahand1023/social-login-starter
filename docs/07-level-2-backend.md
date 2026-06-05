# 07 — Level-2 Backend: httpOnly Session Cookies (Optional)

> **This doc is for advanced use. You do NOT need to read it to get sign-in working.** The demo in `index.html` / `callback.html` is a fully complete Level-1 implementation. Come back here if you decide you want server-side sessions later.

---

## Why Level 1 is enough for most sites

After a successful sign-in, `callback.html` stores the Cognito ID token in `sessionStorage`. Tokens in `sessionStorage` are:

- Tab-scoped (cleared when the tab closes).
- Never sent to any server automatically.
- Readable only by JavaScript on your own origin.

For a static site that just wants to know "is this person signed in, and what is their email?", that is perfectly safe and requires zero backend infrastructure.

---

## What Level 2 adds, and why you might want it

If you are building a backend API that needs to authenticate requests (e.g. "only show this user their own orders"), you face a choice: send the ID token in every request header, or establish a server-side session and use a cookie. Level 2 does the latter.

### Conceptual flow

The session API has three operations, and the frontend already calls all three when `sessionApiUrl` is set (see "Turn it on" below):

```
                              Session Lambda                  DynamoDB
callback.html                       │                            │
  │  POST { idToken: "eyJ..." }     │                            │
  │ ──────────────────────────────► │ verify(idToken) vs JWKS    │
  │                                 │ PutItem sessionId=<uuid> ──►│
  │  200  Set-Cookie: session=<uuid>;                            │
  │       HttpOnly; Secure; SameSite=None; Path=/; Max-Age=…     │
  │ ◄────────────────────────────── │                            │
  │  (browser stores the cookie; JS cannot read it — HttpOnly)   │

index.html  →  socialLogin.loadUser()
  │  GET   (Cookie: session=<uuid>) │ GetItem sessionId=<uuid> ──►│
  │ ──────────────────────────────► │ ◄── { sub, email }         │
  │  200  { sub, email }  ◄──────────│                           │

Sign out  →  socialLogin.signOut()
  │  DELETE (Cookie: session=<uuid>)│ DeleteItem sessionId=<uuid>►│
  │ ──────────────────────────────► │                            │
  │  200  Set-Cookie: session=; Max-Age=0  (cookie cleared)      │
```

The key security property: because the cookie is `HttpOnly`, JavaScript on your page cannot read its value. An XSS attacker who can execute scripts in your page cannot steal the session identifier. In Level-2 mode the Cognito ID token is **never written to `sessionStorage`** — it is sent once from memory to the session endpoint and then discarded; the httpOnly cookie becomes the source of truth.

---

## What is in `backend-optional/`

The implementation lives in [`backend-optional/`](../backend-optional/README.md). A brief tour:

| File | Purpose |
|---|---|
| `session-lambda/cookie.js` | Pure helpers: build the `Set-Cookie` string, build a clear-cookie, parse the session id from a request. Unit-tested. |
| `session-lambda/index.js` | Lambda handler, routed by method: `POST` (create) / `GET` (check) / `DELETE` (logout). |
| `session-lambda/package.json` | `aws-jwt-verify` (token validation) + AWS SDK v3 (DynamoDB). |
| `infra/session-api.yaml` | AWS SAM template: Lambda Function URL (credentialed CORS) + DynamoDB table with TTL. |
| `test/cookie.test.js` | `node:test` unit tests for the cookie helpers. |

For full deploy instructions and prerequisites, read **[`backend-optional/README.md`](../backend-optional/README.md)**.

---

## Turn it on (the frontend is already wired)

Unlike a typical starter, you do **not** need to write any `fetch` code — `js/auth.js` already calls the session API when, and only when, `sessionApiUrl` is set. To switch the demo from Level 1 to Level 2:

1. Deploy the backend (see [`backend-optional/README.md`](../backend-optional/README.md)). When deploying, set **`AllowedOrigin`** to the exact origin you serve the demo from — e.g. `http://localhost:8000` — so the browser will accept the cookie.
2. Copy the printed **`SessionApiUrl`** into your `config.js`:
   ```js
   sessionApiUrl: 'https://abc123xyz.lambda-url.us-east-1.on.aws/',
   ```
3. Reload the demo. Now:
   - `callback.html` POSTs the ID token to create the session (no token is kept in the browser),
   - `index.html` shows the signed-in state via `socialLogin.loadUser()` (a `GET` that reads the cookie),
   - **Sign out** sends a `DELETE` that clears the cookie and the server record.

Leave `sessionApiUrl` empty to go back to the browser-only Level-1 demo. No other code changes either way — `socialLogin.loadUser()` works in both modes.

---

## ⚠️ Cross-origin cookies: the one thing to understand

In the demo, your pages (e.g. `http://localhost:8000`) and the session API (a `…lambda-url….on.aws` Function URL) are on **different origins**. For an httpOnly cookie to cross origins it must be `SameSite=None; Secure`, and the API's CORS must allow credentials from your **specific** origin — which is exactly what the template and `AllowedOrigin` parameter set up.

Even then, **some browsers block third-party cookies** (Safari by default; Chrome is phasing them out). So treat the cross-origin Function URL as a convenient demo/dev setup. **For production, host the session API on the same site as your pages** — e.g. `api.yoursite.com` serving pages on `yoursite.com` — so the cookie is first-party and always sent. That is how real deployments avoid the third-party-cookie problem. (`SameSite=None` still works first-party; you could tighten it to `Lax` in `cookie.js` for a same-site deployment.)

Note: `SameSite=None` cookies require HTTPS. `localhost` is treated as a secure context, so the demo works locally; any non-localhost site must be served over HTTPS.

---

## How the production site does it

A production e-commerce site this starter is modeled on uses this same architecture, implemented in Go — validate the Cognito ID token server-side, store a session in DynamoDB, return an httpOnly cookie. The Node version here is a teaching equivalent: same security properties, easier to read and modify, runs on the same Lambda + DynamoDB stack.

---

## Running the tests

```bash
node --test backend-optional/test/cookie.test.js
```

Expected: 5 tests pass. These cover the cookie helpers (build, clear, and parse — the synchronous, pure pieces of the backend). The Lambda handler itself requires a live Cognito user pool and DynamoDB table to integration-test.
