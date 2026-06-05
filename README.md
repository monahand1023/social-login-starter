# social-login-starter

Add **Sign in with Google** and **Sign in with Apple** to any website — no passwords to manage, powered by AWS Cognito.

---

## What this is (60-second read)

When someone clicks "Sign in with Google" on your site, you don't want to deal with storing passwords, hashing, reset emails, or breaches. Instead, you hand that responsibility to Google (or Apple): they check who the person is and send your site a signed note — "this is alice@example.com, I verified it" — via a middleman called **AWS Cognito**.

Cognito is the translator between your site and the identity providers. It speaks Google's and Apple's OAuth protocols for you, manages the Hosted UI sign-in page, and hands your JavaScript a standard ID token (a JWT) when the sign-in completes. You read the token, show the user's name and email, and you're done. No password database, no email verification loops, no GDPR nightmare — Google and Apple already handle that.

This starter wires all of that up with a **no-build, no-framework** vanilla JS frontend plus a CloudFormation template that deploys the Cognito backend in one command. The four values Cognito prints after deploy go into one config file (`config.js`). That's it.

---

## Demo

![demo](docs/images/demo.png)

*(Run `npm run serve` and open `http://localhost:8000` to see the live version.)*

---

## Vibe-code this

If you're using Claude Code, Cursor, GitHub Copilot, or any other AI coding assistant, paste the block below as your opening message. The assistant will read the docs in order and walk you through setup interactively.

```
I want to add Google and Apple login to my website using this repo.
Read the `docs/` folder in order (01 → 06) and walk me through it
one step at a time, asking me for one piece of information at a time
and waiting for my answer before moving on.
Start with `docs/01-what-you-need.md`.
```

The AI will ask for your AWS region, then your Google credentials, then Apple credentials (or let you skip Apple), then deploy with you, then serve the demo — one question at a time so nothing gets missed.

---

## What's in the box

```
social-login-starter/
├── config.example.js          # Copy to config.js; fill in 4 values from deploy output
├── index.html                 # Demo home page — sign-in buttons + signed-in state
├── callback.html              # OAuth redirect target — exchanges code for tokens
├── js/
│   ├── auth.js                # PKCE + token exchange + session helpers (no dependencies)
│   └── validate-config.js     # Catches placeholder/malformed config.js values early
├── css/styles.css             # Demo styles — provider-branded buttons, themeable
├── infra/
│   ├── cognito.yaml           # CloudFormation: user pool, Google+Apple IdPs, public client
│   ├── deploy.sh              # One-command deploy → prints the 4 values for config.js
│   └── parameters.example.sh  # Copy to parameters.sh; fill in your secrets (gitignored)
├── docs/
│   ├── 01-what-you-need.md    # Prerequisites checklist + plain-language explainer
│   ├── 02-google-setup.md     # Google Cloud Console walkthrough (OAuth client + redirect URL)
│   ├── 03-apple-setup.md      # Apple Developer walkthrough (Services ID + .p8 key)
│   ├── 04-deploy-cognito.md   # Run deploy.sh (or console fallback) → copy 4 values
│   ├── 05-run-the-demo.md     # Serve locally, smoke-test sign-in end to end
│   ├── 06-add-to-your-site.md # Drop the 3 files into your existing site
│   ├── 07-level-2-backend.md  # Optional: move tokens into httpOnly cookies (server-side)
│   └── 08-troubleshooting.md  # Error → cause → fix for the most common OAuth failures
└── backend-optional/          # Optional Node.js Lambda: httpOnly session cookies (Level 2)
```

---

## Quickstart

Follow the docs in order. Estimated time: **~30–45 minutes**, most of it clicking around the Google and Apple consoles — the actual deploy is one command.

1. [What you need](docs/01-what-you-need.md) — AWS account, Google account, optional Apple developer account
2. [Set up Google sign-in](docs/02-google-setup.md) — create an OAuth client, set the redirect URL
3. [Set up Apple sign-in](docs/03-apple-setup.md) — create a Services ID and download a .p8 key *(skip if you only want Google)*
4. [Deploy Cognito](docs/04-deploy-cognito.md) — run `./infra/deploy.sh`, copy 4 values into `config.js`
5. [Run the demo](docs/05-run-the-demo.md) — `npm run serve`, open `http://localhost:8000`, sign in

---

## Cost

**AWS Cognito:** free for up to 50,000 Monthly Active Users (the free tier covers virtually all hobby and small-production uses). After that, pricing is a few cents per MAU — see the [Cognito pricing page](https://aws.amazon.com/cognito/pricing/).

**Google sign-in:** free, no account fees.

**Apple sign-in:** requires an [Apple Developer account](https://developer.apple.com/programs/) at **$99/year**. This cost is only incurred if you want "Sign in with Apple" — Google sign-in works without it.

**The demo itself:** no server, no database, no always-on compute. The only AWS resource is the Cognito user pool.

---

## Security

`config.js` contains four values — `region`, `userPoolId`, `clientId`, and `domain`. **All four are public by design.** A Cognito app client with no client secret is specifically designed to live in browser JavaScript; there is nothing sensitive about these values. Committing them is fine.

Your real secrets — the Google client secret and the Apple `.p8` private key — only ever go into AWS (via `infra/parameters.sh`, which is gitignored). They are never written to `config.js` or any committed file.

For additional hardening (moving tokens out of browser sessionStorage into httpOnly cookies), see [docs/07-level-2-backend.md](docs/07-level-2-backend.md) and the `backend-optional/` directory.

For common error messages and fixes, see [docs/08-troubleshooting.md](docs/08-troubleshooting.md).

---

## Run the tests

```bash
npm test
```

Runs the config validator tests (`test/validate-config.test.js`) and the auth helper tests (`test/auth-helpers.test.js`) using Node's built-in test runner — no additional dependencies required.

---

## License

[MIT](LICENSE) — use freely, attribution appreciated but not required.
