# Contributing

Thanks for your interest! This is a small, deliberately-minimal starter template, so the bar for new **features** is high — but bug fixes, doc improvements, and clarifications are very welcome.

## Ground rules

- **No secrets, ever.** When present, `config.js` holds only the four *public* Cognito values. Never commit `infra/parameters.sh`, a `.p8` key, a Google client secret, or any real account-specific ID/domain. This repo is a public template — keep everything generic.
- **Keep it buildless.** No bundler, no framework, no runtime npm dependencies in the frontend. Plain HTML/CSS/JS that runs by serving the folder statically.
- **Match the existing style.** Heavily-commented vanilla JS; docs written for a non-technical, AI-assisted audience.

## Before opening a PR

```bash
npm test                 # config validator + auth/PKCE helpers + cookie helper
node --check js/auth.js  # (and the other JS files you touched)
bash -n infra/deploy.sh  # shell syntax
```

If you change the CloudFormation, validate it:

```bash
aws cloudformation validate-template --template-body file://infra/cognito.yaml
```

CI runs the same checks on every push and pull request.

## Scope

Features intentionally left out — other providers (Facebook/GitHub/LINE/…), custom domains, MFA, i18n, token refresh — are listed in the README's "What this does — and what it doesn't" and in `CLAUDE.md`. Please **open an issue to discuss** before adding any of them.

## Reporting security issues

See [`SECURITY.md`](SECURITY.md). Don't include real credentials in reports.
