# Security Policy

## Reporting a vulnerability

If you find a security issue in this starter — for example a flaw in the OAuth/PKCE flow, the session-cookie handling, or the CloudFormation/IAM — please report it privately:

- Use GitHub's **"Report a vulnerability"** button (the **Security** tab → *Advisories*) on this repo, **or**
- Open an issue **without** sensitive details and ask for a private channel.

Please do **not** include real credentials, tokens, or `.p8` keys in any report.

## What is and isn't a vulnerability here

**Not a vulnerability — by design:**

- The four values in `config.js` (`region`, `userPoolId`, `clientId`, `domain`) are **public**. A Cognito app client with no client secret is meant to live in browser JavaScript. Committing these is expected and safe.

**Worth reporting:**

- Anything that lets an attacker forge a session, bypass the `state` / `nonce` / PKCE checks, read the httpOnly session cookie from JavaScript, or escalate privileges via the CloudFormation/IAM in `infra/` or `backend-optional/`.

## Scope notes

- This is a **template**, not a hosted service. When you deploy it into your own AWS account, you own the security of that deployment (IAM, the Cognito user pool, your provider credentials, rotation, and monitoring).
- The optional Level-2 backend uses `SameSite=None` cross-origin cookies for the demo. For production, host the session API **same-site** as your pages so the cookie is first-party — see [`docs/07-level-2-backend.md`](docs/07-level-2-backend.md).
