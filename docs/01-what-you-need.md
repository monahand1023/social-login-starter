# 01 — What You Need Before You Start

This starter adds "Sign in with Google" and "Sign in with Apple" to any static website. Before you touch any code, take five minutes to read this page so you know what accounts and tools you need — and what you absolutely do *not* need (like a server, a database, or a password system).

---

## The plain-language version of how this works

You never see or store anyone's password. When someone clicks "Sign in with Google," Google checks who they are and hands your site a signed note — something like "this is alice@example.com, I vouch for her" — via AWS Cognito. Cognito is the middleman that speaks to Google and Apple for you. Your website reads that note, learns the user's email address, and that is the whole flow. No passwords leave Google. No passwords touch your site. Cognito, Google, and Apple handle the security.

---

## What you need

### 1. An AWS account + the AWS CLI

Cognito is an AWS service, so you need an AWS account (free to create; Cognito itself is free up to 50,000 monthly active users).

You also need the **AWS CLI** installed and configured on your computer. To check whether it is already set up, run:

```bash
aws sts get-caller-identity
```

If you see a JSON response with an `Account` number, you are good. If you get a "command not found" error or a credentials error, install the AWS CLI and run `aws configure` to give it your access key and secret. The [official guide is here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

### 2. A Google account

Any Google account (personal Gmail is fine) is all you need to create a Google OAuth client. This is free and takes about 10 minutes. See [02-google-setup.md](02-google-setup.md) for the exact steps.

### 3. An Apple Developer account — **optional, $99/year**

> **Skippable.** Apple sign-in requires an active Apple Developer Program membership, which costs **$99 per year**. If you only want Google sign-in, you can skip this entirely — the starter works perfectly without it. Come back to this when you are ready to add Apple.

If you do want Apple sign-in, you need to enroll at [developer.apple.com](https://developer.apple.com/). See [03-apple-setup.md](03-apple-setup.md) for the exact steps.

### 4. Node.js — optional

Node.js is only needed if you want to:
- Run the automated tests (`npm test`)
- Run the optional Level-2 backend (`backend-optional/`)
- Use `npm run serve` as a shortcut to start a local web server

If you just want to run the demo and wire it into your site, you can use Python's built-in server (`python3 -m http.server 8000`) instead, which is installed on most Macs and Linux systems.

### 5. A text editor or AI coding assistant

Any editor works. If you have an AI coding assistant (Cursor, GitHub Copilot, Claude, ChatGPT, etc.), you can paste the prompt from the main `README.md` and let it walk you through everything step by step.

---

## Recommended order

Read the docs in this order:

1. **You are here** — [01-what-you-need.md](01-what-you-need.md)
2. [02-google-setup.md](02-google-setup.md) — Set up Google OAuth (15 min)
3. [03-apple-setup.md](03-apple-setup.md) — Set up Apple sign-in (15 min, optional)
4. [04-deploy-cognito.md](04-deploy-cognito.md) — Deploy to AWS (10 min)
5. [05-run-the-demo.md](05-run-the-demo.md) — Run the demo locally and verify it works

Then, once the demo is working:
- [06-add-to-your-site.md](06-add-to-your-site.md) — Copy the login code into your own site
- [08-troubleshooting.md](08-troubleshooting.md) — If something goes wrong
