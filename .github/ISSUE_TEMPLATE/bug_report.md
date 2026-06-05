---
name: Bug report
about: Something in the starter doesn't work as documented
title: "[bug] "
labels: bug
---

**What went wrong**
A clear description of the problem.

**Which step**
Which doc and step were you on? (e.g. `docs/04-deploy-cognito.md`, Step 2)

**Exact error message**
Paste the error text or the OAuth error code (e.g. `redirect_uri_mismatch`, `invalid_client`).
Please check [`docs/08-troubleshooting.md`](../../docs/08-troubleshooting.md) first — it may already have the fix.

**Environment**
- OS:
- Node version (`node -v`):
- Browser:
- Provider: Google / Apple / both

**Safe to share — please do NOT paste secrets**
The four `config.js` values (`region`, `userPoolId`, `clientId`, `domain`) are public and fine to include.
Never paste anything from `infra/parameters.sh`, a Google client secret, or a `.p8` key.
