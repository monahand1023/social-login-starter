# 02 — Set Up Google Sign-In

This doc walks you through creating a Google OAuth client — the thing that lets Google hand your site a "this person is logged in" token. The whole process takes about 10–15 minutes.

---

## Before you start: the predictable-domain trick

When you set up Google, you have to tell it exactly which URL Cognito will use to send the sign-in response. That URL contains a **domain prefix** — a name you choose — and the AWS region you will deploy into. The great news is that you can choose your prefix right now, before deploying anything, because the URL is entirely predictable:

```
https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse
```

For example, if you pick the prefix `my-app-login` and you plan to deploy to `us-east-1`, your redirect URL is:

```
https://my-app-login.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**Pick your prefix now and write it down.** You will use it in Google below, in Apple if you do that step, and in `infra/parameters.sh` when you deploy. A good prefix is lowercase letters, numbers, and hyphens, like `my-app-login-demo` or `alice-portfolio-auth`. It must be globally unique on AWS, so be a little specific.

---

## Steps

### 0. Create your accounts (skip anything you already have)

This step assumes nothing. If you already have a Google account and have used Google Cloud before, jump to Step 1.

- **No Google account?** Create a free one at [accounts.google.com/signup](https://accounts.google.com/signup). Any Google account works — personal Gmail is fine.
- **Never opened Google Cloud?** Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in with that Google account. The first time, Google asks you to **agree to the Terms of Service** — tick the box and continue. You may see prompts about a "free trial" or billing; you can ignore/dismiss them.
- **Do I need a credit card or billing?** **No.** Creating an OAuth consent screen and an OAuth client (everything in this doc) is free and does **not** require enabling billing. Google sign-in itself costs nothing. If Cloud Console ever nudges you to "enable billing," you do not need to for this — close that prompt.

That's all the account setup. Now the actual work:

### 1. Open the Google Cloud Console

Go to [https://console.cloud.google.com/](https://console.cloud.google.com/). Sign in with any Google account.

Create a new project or select an existing one from the project dropdown at the top of the page. A project is just a container — you can call it anything, like `My Website Login`.

### 2. Configure the OAuth consent screen

Every Google OAuth client needs a consent screen — the page users see that says "My App wants to access your email." You only set this up once per project.

1. In the left sidebar, go to **APIs & Services → OAuth consent screen**.
2. For User Type, select **External** (this lets anyone with a Google account sign in, not just people in your organization). Click **Create**.
3. Fill in the required fields:
   - **App name**: the name of your app or site (shown to users on the consent screen)
   - **User support email**: your email address
   - **Developer contact information**: your email address again
4. Click **Save and Continue** to reach the Scopes step.
5. Click **Add or Remove Scopes** and add these three scopes:
   - `email`
   - `profile`
   - `openid`
6. Click **Update**, then **Save and Continue**.
7. You can skip the **Test users** step for now (or add your own email as a test user if you want to test before "publishing"). Click **Save and Continue**, then **Back to Dashboard**.

> **Note on "app not verified":** Until you click **Publish App**, Google shows a warning to anyone who tries to sign in. For personal projects or internal tools, you can leave the app in testing mode and add specific test users — see [08-troubleshooting.md](08-troubleshooting.md) for details.

### 3. Create an OAuth client ID

1. In the left sidebar, go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. For **Application type**, choose **Web application**.
4. Give it a name (e.g., `My Site Cognito Client` — this is just a label for you).

### 4. Add the Authorized JavaScript Origins

Under **Authorized JavaScript origins**, click **Add URI** and enter:

```
https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com
```

Replace `<your-domain-prefix>` and `<your-region>` with the values you chose above. For example:

```
https://my-app-login.auth.us-east-1.amazoncognito.com
```

### 5. Add the Authorized Redirect URI

Under **Authorized redirect URIs**, click **Add URI** and enter:

```
https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse
```

For example:

```
https://my-app-login.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

This is the exact URL Cognito uses to receive the sign-in response from Google. The `/oauth2/idpresponse` path is fixed — Cognito always uses it.

### 6. Save and copy your credentials

Click **Create**. Google shows a dialog with your **Client ID** and **Client secret**. Copy both values somewhere safe (a password manager or a local notes file).

You will put them into `infra/parameters.sh` in the next step.

### 7. Save to parameters.sh

Open (or create) `infra/parameters.sh` (copy from `infra/parameters.example.sh` if you have not already). Set:

```bash
export DOMAIN_PREFIX="my-app-login"          # the prefix you chose above
export AWS_REGION="us-east-1"                # the region you plan to deploy into

export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

`parameters.sh` is gitignored — it holds your secrets. Never commit it.

---

## Next step

If you want Apple sign-in too, go to [03-apple-setup.md](03-apple-setup.md).

Otherwise, skip straight to [04-deploy-cognito.md](04-deploy-cognito.md).
