# 03 — Set Up Apple Sign-In

> **This entire doc is optional.** If you only want Google sign-in, skip this and go straight to [04-deploy-cognito.md](04-deploy-cognito.md). The starter works perfectly with Google alone.
>
> Apple sign-in requires an **Apple Developer Program membership**, which costs **$99 per year**. If you are not enrolled, you will not be able to complete these steps.

---

## Before you start: the predictable-domain trick

Just like with Google, you need to tell Apple the exact redirect URL that Cognito will use — and that URL is predictable before you deploy. Make sure you have already chosen your `<your-domain-prefix>` and `<your-region>` from the Google setup doc. The URL you will register with Apple is:

```
https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse
```

For example:

```
https://my-app-login.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

---

## Steps

### 0. Get an Apple ID and enroll in the Apple Developer Program

This step assumes nothing. If you are already enrolled in the Apple Developer Program, jump to Step 1.

1. **Apple ID** — if you don't have one, create a free Apple ID at [account.apple.com](https://account.apple.com/). Then turn on **two-factor authentication** for it (Apple *requires* 2FA to enroll as a developer): on the same page, under Sign-In and Security → Two-Factor Authentication.
2. **Enroll in the Apple Developer Program** — go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/) and follow the steps. Key facts to know before you start:
   - It costs **$99 per year** (a credit card or supported payment method is required).
   - You enroll either through the **Apple Developer app** on an iPhone/iPad (fastest) or through the website.
   - **Approval can take 24–48 hours** (sometimes longer). Apple may ask you to verify your identity. **You cannot do Steps 1–6 below until your enrollment is active** — the Identifiers/Keys sections simply won't be available.
3. **Don't want to pay or wait?** That's fine — skip Apple entirely for now. Do [Google-only](02-google-setup.md), deploy, and come back to add Apple later. Adding Apple afterward needs **no code changes** — you just re-deploy with the Apple values filled in.

Once your enrollment shows as active, continue:

### 1. Open the Apple Developer portal

Go to [https://developer.apple.com/](https://developer.apple.com/) and sign in. Click **Account** at the top, then go to **Certificates, Identifiers & Profiles**.

### 2. Create an App ID

Apple requires an App ID before you can create a Services ID for web sign-in.

1. In the left sidebar, click **Identifiers**, then click the **+** button.
2. Select **App IDs**, click **Continue**.
3. Select **App**, click **Continue**.
4. Set a **Description** (e.g., `My Website Login`) and a **Bundle ID** (e.g., `com.yourname.web`). The Bundle ID is a reverse-domain-style identifier — use your actual domain name.
5. Scroll down to **Capabilities** and check the box for **Sign in with Apple**.
6. Click **Continue**, then **Register**.

### 3. Create a Services ID

The Services ID is what Cognito actually uses when talking to Apple. It identifies your web app specifically.

1. In the left sidebar, click **Identifiers**, then click **+**.
2. Select **Services IDs**, click **Continue**.
3. Fill in:
   - **Description**: a human-readable label (e.g., `My Website Sign In`)
   - **Identifier**: this is your `APPLE_SERVICES_ID` — use a reverse-domain style like `com.yourname.web.signin` (note: different from the Bundle ID above, though it can be similar)
4. Click **Continue**, then **Register**.
5. Back on the Identifiers list, find your new Services ID and click it to edit.
6. Check the box next to **Sign in with Apple**, then click **Configure** next to it.
7. In the configuration panel:
   - **Primary App ID**: select the App ID you created in Step 2.
   - **Domains and Subdomains**: enter `<your-domain-prefix>.auth.<your-region>.amazoncognito.com` (no `https://`, just the hostname)
   - **Return URLs**: enter the full URL with `https://`: `https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse`
8. Click **Next**, then **Done**, then **Continue**, then **Save**.

> **Important:** The Return URL must match exactly what Cognito sends. The `/oauth2/idpresponse` path is required — Apple will reject any other path.

### 4. Create a Sign In with Apple key

Apple uses a private key (a `.p8` file) instead of a client secret. You generate it once and download it — Apple does not let you download it again.

1. In the left sidebar, click **Keys**, then click **+**.
2. Give the key a name (e.g., `My Website Sign In Key`).
3. Check the box next to **Sign in with Apple**, then click **Configure** next to it.
4. Select your **Primary App ID** (the App ID from Step 2), click **Save**.
5. Click **Continue**, then **Register**.
6. **Download the `.p8` file now.** Apple only lets you download it once. Store it somewhere safe — a local folder outside your project directory is fine, or a password manager that supports file attachments.

Note the **Key ID** shown on the download page (it is also in the filename, e.g., `AuthKey_ABCDE12345.p8`). It is 10 characters.

### 5. Find your Team ID

Your Apple Team ID is the 10-character code in the top-right corner of the Apple Developer portal, shown under your name. You can also find it at [developer.apple.com/account](https://developer.apple.com/account) — it is listed under **Membership**.

### 6. Save everything to parameters.sh

Open `infra/parameters.sh` and add the Apple values:

```bash
export APPLE_SERVICES_ID="com.yourname.web.signin"     # the Services ID identifier you chose
export APPLE_TEAM_ID="ABCDE12345"                       # 10 chars from the portal
export APPLE_KEY_ID="ABCDE12345"                        # 10 chars, shown on key page / in filename
export APPLE_PRIVATE_KEY_FILE="/path/to/AuthKey_ABCDE12345.p8"
```

Set `APPLE_PRIVATE_KEY_FILE` to the **full path** of the `.p8` file you downloaded. The deploy script reads the file contents at deploy time — the key itself never goes into a committed file.

`parameters.sh` and `*.p8` files are both gitignored. Never commit them.

---

## Next step

Go to [04-deploy-cognito.md](04-deploy-cognito.md) to deploy your Cognito user pool.
