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

```
Browser                          Lambda                        DynamoDB
  │                                │                               │
  │  POST /session                 │                               │
  │  { idToken: "eyJ..." }         │                               │
  │ ─────────────────────────────► │                               │
  │                                │  verify(idToken)              │
  │                                │  (checks signature vs JWKS,   │
  │                                │   issuer, audience, expiry)   │
  │                                │                               │
  │                                │  PutItem sessionId=<uuid>     │
  │                                │  sub, email, expiresAt ──────►│
  │                                │                               │
  │  HTTP 200                      │                               │
  │  Set-Cookie: session=<uuid>;   │                               │
  │    HttpOnly; Secure;           │                               │
  │    SameSite=Lax; Path=/;       │                               │
  │    Max-Age=604800              │                               │
  │ ◄───────────────────────────── │                               │
  │                                │                               │
  │  (browser stores cookie        │                               │
  │   automatically; JS cannot     │                               │
  │   read it — HttpOnly)          │                               │
  │                                │                               │
  │  GET /api/orders               │                               │
  │  Cookie: session=<uuid>  ─────►│  GetItem sessionId=<uuid> ──►│
  │                                │  ◄── {sub, email, expiresAt} │
  │  [ orders for this user ] ◄─── │                               │
```

The key security property: because the cookie is `HttpOnly`, JavaScript on your page cannot read its value. An XSS attacker who can execute scripts in your page cannot steal the session identifier. The Cognito ID token never travels over the network after the initial exchange — it stays in `sessionStorage` only long enough to be sent once to the session endpoint.

---

## What is in `backend-optional/`

The implementation lives in [`backend-optional/`](../backend-optional/README.md). A brief tour:

| File | Purpose |
|---|---|
| `session-lambda/cookie.js` | Pure function that builds the `Set-Cookie` header string. Unit-tested. |
| `session-lambda/index.js` | Lambda handler: parse body → verify token → write DynamoDB → return cookie. |
| `session-lambda/package.json` | `aws-jwt-verify` (token validation) + AWS SDK v3 (DynamoDB). |
| `infra/session-api.yaml` | AWS SAM template: Lambda Function URL + DynamoDB table with TTL. |
| `test/cookie.test.js` | `node:test` unit tests for the cookie builder. |

For full deploy instructions, prerequisites, and the frontend wiring snippet, read **[`backend-optional/README.md`](../backend-optional/README.md)**.

---

## Wiring the frontend is left as an exercise

The demo (`index.html`, `callback.html`) stays Level 1 by default. It will not call the session endpoint unless you add the `fetch` call yourself. This is intentional: the frontend is already correct and complete without a backend, and wiring it to a specific API URL would break the "clone and serve" simplicity of the demo.

When you are ready to connect them, the `backend-optional/README.md` has the exact `fetch` snippet to add to `callback.html` after `handleCallback()` resolves.

---

## How the production site does it

A production e-commerce site this starter is modeled on uses this same architecture, implemented in Go — validate the Cognito ID token server-side, store a session in DynamoDB, return an httpOnly cookie. The Node version here is a teaching equivalent: same security properties, easier to read and modify, runs on the same Lambda + DynamoDB stack.

---

## Running the tests

```bash
node --test backend-optional/test/cookie.test.js
```

Expected: 2 tests pass. These cover the cookie-string format (the only synchronous, pure piece of the backend). The Lambda handler itself requires a live Cognito user pool and DynamoDB table to integration-test.
