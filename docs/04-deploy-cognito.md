# 04 — Deploy Cognito

This doc deploys an AWS Cognito user pool — the middleman that talks to Google and Apple for you. After this step, you will have four values to paste into `config.js`, and the whole sign-in flow will be wired up.

**Both paths below produce identical results.** Pick whichever feels more comfortable:

- **Path A (recommended):** One command. The deploy script does everything for you and prints the four values.
- **Path B (AWS Console):** Click-through in the AWS Console. More steps, but no terminal required.

---

## Path A — One command (recommended)

### Step 1: Copy and fill in parameters.sh

If you have not done this yet, copy the example file:

```bash
cp infra/parameters.example.sh infra/parameters.sh
```

Open `infra/parameters.sh` in your editor and fill in every value. The file has inline comments explaining each one. If you completed docs 02 and 03, you already have all the values ready.

Key things to fill in:

```bash
export DOMAIN_PREFIX="my-app-login-demo"    # the prefix you chose in doc 02
export STACK_NAME="social-login-starter"    # any label for the CloudFormation stack
export AWS_REGION="us-east-1"               # where to deploy

export CALLBACK_URLS="http://localhost:8000/callback.html"
export LOGOUT_URLS="http://localhost:8000/"

export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"

# Apple (only if you did doc 03):
export APPLE_SERVICES_ID="com.yourname.web.signin"
export APPLE_TEAM_ID="ABCDE12345"
export APPLE_KEY_ID="ABCDE12345"
export APPLE_PRIVATE_KEY_FILE="/path/to/AuthKey_ABCDE12345.p8"
```

`parameters.sh` is gitignored — it holds secrets. **Never commit it.**

### Step 2: Run the deploy script

```bash
./infra/deploy.sh
```

The script takes a few minutes. When it finishes, it prints something like:

```
✅ Deployed. Copy these into your config.js:
────────────────────────────────────────────
Region          us-east-1
UserPoolId      us-east-1_AbCdEfGhI
ClientId        1example23456clientid789
CognitoDomain   my-app-login-demo.auth.us-east-1.amazoncognito.com
────────────────────────────────────────────

📌 Also paste this URL into Google AND Apple as the redirect/return URL:
https://my-app-login-demo.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Step 3: Copy the four values into config.js

Copy `config.example.js` to `config.js`:

```bash
cp config.example.js config.js
```

Open `config.js` and paste the four values the script printed:

```js
window.AUTH_CONFIG = {
  region:     'us-east-1',
  userPoolId: 'us-east-1_AbCdEfGhI',
  clientId:   '1example23456clientid789',
  domain:     'my-app-login-demo.auth.us-east-1.amazoncognito.com',

  redirectUri: window.location.origin + '/callback.html',
  logoutUri:   window.location.origin + '/',
  scope:       'email openid profile',
};
```

These four values are **public and safe to commit** to your repo. They are Cognito identifiers, not secrets. Your real secrets (Google client secret, Apple private key) only ever lived in `parameters.sh` and are now stored securely inside AWS — they never go in `config.js`.

### Step 4: Confirm Google and Apple have the redirect URL

The script also printed a `ProviderRedirectURL` like:

```
https://my-app-login-demo.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

If you followed docs 02 and 03, you already registered this URL with Google and Apple before deploying — and you are done. If you skipped ahead, go back and add that URL now:
- **Google:** APIs & Services → Credentials → your OAuth client → Authorized redirect URIs
- **Apple:** Identifiers → your Services ID → Sign in with Apple → Configure → Return URLs

---

## Path B — AWS Console click-through

> This produces the exact same result as Path A. Use it if you prefer clicking to typing commands.

### Step 1: Create a user pool

1. Go to [AWS Cognito](https://console.aws.amazon.com/cognito/) in your AWS region.
2. Click **Create user pool**.
3. Under **Sign-in experience**, select **Email** as the sign-in option. Click **Next**.
4. On the **Security requirements** page, accept the defaults (or customize password policy if you like). Click **Next**.
5. On the **Sign-up experience** page, leave defaults. Click **Next**.

### Step 2: Add federated identity providers

On the **Configure message delivery** page, click **Next** to skip it (email delivery isn't needed for social login only).

On the **Integrate your app** page, you will set up everything below before clicking Next.

**Add Google:**

1. Under **Federated sign-in**, click **Add an identity provider → Google**.
2. Paste your **Google Client ID** and **Google Client secret**.
3. Set **Authorized scopes** to: `email openid profile`
4. Under **Map attributes**, map:
   - Google attribute `email` → User pool attribute `Email`
   - Google attribute `name` → User pool attribute `Name`
5. Click **Add identity provider**.

**Add Apple (if you did doc 03):**

1. Click **Add an identity provider → Sign in with Apple**.
2. Fill in:
   - **Services ID**: your Apple Services ID (e.g., `com.yourname.web.signin`)
   - **Team ID**: your 10-character Apple Team ID
   - **Key ID**: your 10-character Apple Key ID
   - **Private key**: paste the full contents of your `.p8` file (open it in a text editor and copy everything including the `-----BEGIN PRIVATE KEY-----` lines)
3. Set **Authorized scopes** to: `email name`
4. Under **Map attributes**, map Apple attribute `email` → User pool attribute `Email`.
5. Click **Add identity provider**.

### Step 3: Configure the app client

Still on the **Integrate your app** page:

1. Under **App type**, select **Public client** (this is important — do NOT choose "Confidential client," which would add a secret).
2. **App client name**: any label (e.g., `my-site-web-client`).
3. Make sure **Generate a client secret** is **unchecked**.
4. Under **Authentication flows**, ensure **Authorization code grant** is enabled.
5. Under **OAuth 2.0 scopes**, add: `email`, `openid`, `profile`.
6. Under **Allowed callback URLs**, add:
   - `http://localhost:8000/callback.html`
   - (and your production URL if you have one, e.g., `https://yoursite.com/callback.html`)
7. Under **Allowed sign-out URLs**, add:
   - `http://localhost:8000/`
   - (and your production home page if applicable)

### Step 4: Set the Cognito domain

1. Under **App integration → Domain**, choose **Cognito domain**.
2. Enter your domain prefix — the same one you used in Google and Apple. For example: `my-app-login-demo`.
3. Your full domain will be: `my-app-login-demo.auth.us-east-1.amazoncognito.com`

Click **Next**, then **Create user pool**.

### Step 5: Read your four values

After the user pool is created, navigate to it and find:

| Value | Where to find it |
|---|---|
| `region` | The AWS region you deployed into (e.g., `us-east-1`) |
| `userPoolId` | User pool overview page → **Pool ID** (e.g., `us-east-1_AbCdEfGhI`) |
| `clientId` | **App integration** tab → **App clients** → click your client → **Client ID** |
| `domain` | **App integration** tab → **Domain** (e.g., `my-app-login-demo.auth.us-east-1.amazoncognito.com`) |

Copy `config.example.js` to `config.js` and paste these four values in, exactly as shown in Path A Step 3 above.

---

## Next step

Go to [05-run-the-demo.md](05-run-the-demo.md) to verify everything is working.
