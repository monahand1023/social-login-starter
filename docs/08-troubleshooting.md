# 08 — Troubleshooting

This page maps specific error messages to their causes and fixes. Find your error in the table below, then follow the fix steps.

---

## Quick-reference table

| Error / Symptom | Cause | Fix |
|---|---|---|
| `redirect_mismatch` or "redirect_uri parameter value does not match" | The callback URL that Cognito sent to Google/Apple is not in your registered list | See [redirect_mismatch](#redirect_mismatch) below |
| `invalid_client` (on sign-in start) | Wrong `clientId` in `config.js`, OR the app client was created **with** a secret | See [invalid_client on sign-in](#invalid_client-on-sign-in) below |
| `invalid_grant` on token exchange | The authorization code was already used or has expired, or the `code_verifier` doesn't match | See [invalid_grant](#invalid_grant) below |
| Yellow "Your config.js needs attention" box | A value in `config.js` is still a placeholder or is malformed | See [yellow config warning](#yellow-config-warning) below |
| Google: "Access blocked: My App hasn't completed verification" | The consent screen is in testing mode and your email is not in the test-user list | See [Google app not verified](#google-app-not-verified) below |
| Apple: `invalid_client` (different from the Cognito one) | Services ID, Team ID, Key ID, or private key mismatch; or the Return URL doesn't match | See [Apple invalid_client](#apple-invalid_client) below |
| Nothing happens when you click the button / CORS error on token call | You opened the page via `file://` instead of `http://localhost:8000` | See [CORS / file:// error](#cors--file-error) below |

---

## Detailed fixes

### `redirect_mismatch`

**Full error:** `redirect_uri parameter value does not match` (shown by Google or Apple), or Cognito returns `?error=redirect_mismatch` to the callback URL.

**What it means:** After sign-in, Google (or Apple) tried to send the user's browser back to the Cognito `oauth2/idpresponse` URL, but that URL wasn't in the list of authorized redirect URIs you registered.

**Fix:**

1. In your Google Cloud Console, go to **APIs & Services → Credentials → your OAuth client**. Under **Authorized redirect URIs**, confirm that the exact URL `https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse` is listed. No trailing slash, exact scheme and path.

2. In Apple (if using Apple sign-in), go to **Certificates, Identifiers & Profiles → Identifiers → your Services ID → Sign in with Apple → Configure** and confirm the same URL is under **Return URLs**.

3. If the URL is missing, add it and save. Google changes take effect immediately; Apple changes may take a minute.

4. Separately, also confirm the callback URL for your browser (`http://localhost:8000/callback.html` or your production URL) is in the Cognito app client. In the AWS Console: **Cognito → your user pool → App integration → App clients → your client → Edit → Allowed callback URLs**. Or re-run `./infra/deploy.sh` after updating `CALLBACK_URLS` in `parameters.sh`.

---

### `invalid_client` on sign-in

**What it means:** Cognito could not find an app client matching the `clientId` in `config.js`, or the app client requires a secret (which a browser-based app cannot provide).

**Fix:**

1. Check `config.js`. The `clientId` should be a long string of letters and numbers (around 26 characters). Compare it to the **Client ID** shown in **Cognito → your user pool → App integration → App clients → your client**. They must match exactly.

2. If the app client was created with a secret (i.e., **Generate a client secret** was checked), it cannot be used from a browser. You need to create a new app client with **no secret** (select **Public client** and leave the secret box unchecked). Update `clientId` in `config.js` with the new client's ID.

3. Re-run `./infra/deploy.sh` to ensure the deployed CloudFormation stack matches what you expect, then copy the printed `ClientId` into `config.js`.

---

### `invalid_grant`

**Full error:** The token exchange step (inside `callback.html`) returns a 400 with `{"error":"invalid_grant"}`.

**What it means:** The authorization code that Cognito issued has either already been used (codes are single-use) or has expired (they expire in a few minutes). A PKCE `code_verifier` mismatch also causes this error.

**Fix:**

1. **Do not reload `callback.html` directly.** The code in the URL is consumed on first use. Reloading the page tries to exchange the same code again and fails. Always start a fresh sign-in from `index.html`.

2. If you are testing and keep seeing this error, go back to `index.html` and click the sign-in button again. This generates a fresh code and a fresh `code_verifier`.

3. Check that your browser's `sessionStorage` is not being cleared between the sign-in start and the callback. The `code_verifier` is stored under `sl_pending_<state>` in `sessionStorage`. Private browsing modes in some browsers do not share `sessionStorage` across redirects — if that is your setup, try a regular (non-private) tab.

---

### Yellow config warning

**Symptom:** A yellow box at the top of `index.html` says "Your config.js needs attention:" followed by one or more error messages.

**What it means:** The `validateConfig` function detected that one or more of the four values in `config.js` is still set to its example placeholder, or does not look like a valid value.

**Fix:**

1. Open `config.js`. Look for values that still contain `XXXXXXXXX`, `xxxx`, or `your-prefix`. Replace them with the real values from the deploy output.

2. Common mistakes:
   - `region` set to something like `us-east-X` instead of `us-east-1`
   - `userPoolId` whose region prefix (`us-east-1_`) doesn't match the `region` value
   - `domain` that does not end in `amazoncognito.com`
   - `clientId` left as the example placeholder

3. After fixing `config.js`, reload the page. The yellow box should disappear.

---

### Google app not verified

**Full message:** "Access blocked: My App hasn't completed the Google verification process" or "App not verified."

**What it means:** Your Google consent screen is in **testing mode**. Google restricts sign-in to an explicit list of test users until you publish the app.

**Fix (option 1 — add yourself as a test user):**

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**.
2. Under **Test users**, click **Add users** and add your email address.
3. Click **Save**. You can now sign in with that email. Other Google accounts will still see the block.

**Fix (option 2 — publish the consent screen):**

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**.
2. Click **Publish App** (under "Publishing status").
3. Confirm the dialog. The app is now in production mode — any Google account can sign in, and the warning goes away.

For a public-facing website, you will eventually want to publish. For a personal or internal tool, adding test users is simpler.

---

### Apple `invalid_client`

**What it means:** Apple rejected the sign-in request from Cognito. This usually means one of the Apple credentials is wrong, or the Return URL in Apple's configuration doesn't match what Cognito is sending.

**Fix:**

1. Verify all four Apple values in `infra/parameters.sh`:
   - `APPLE_SERVICES_ID`: must match the **Identifier** of your Services ID exactly (e.g., `com.yourname.web.signin`)
   - `APPLE_TEAM_ID`: 10-character string from the top-right of the Apple Developer portal
   - `APPLE_KEY_ID`: 10-character string shown on the key page (also in the `.p8` filename)
   - `APPLE_PRIVATE_KEY_FILE`: path to the `.p8` file on disk

2. Confirm the Return URL in Apple's portal. Go to **Identifiers → your Services ID → Sign in with Apple → Configure** and check that the Return URL is exactly:
   ```
   https://<your-domain-prefix>.auth.<your-region>.amazoncognito.com/oauth2/idpresponse
   ```
   It must include `https://`, must use the exact same prefix and region, and must end with `/oauth2/idpresponse`.

3. Re-run `./infra/deploy.sh` after correcting any values. The deploy updates the Cognito identity provider configuration.

4. If the `.p8` file was regenerated (e.g., you downloaded a new key), update `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY_FILE` and redeploy.

---

### CORS / `file://` error

**Symptom:** Clicking a sign-in button does nothing (no redirect), or the browser console shows a CORS error on a `fetch()` call to `amazoncognito.com`, or `callback.html` shows "Sign-in failed: Failed to fetch."

**What it means:** You opened the page using a `file:///...` URL (by double-clicking the HTML file in Finder or your file manager) instead of through a local server. Browsers block `fetch()` calls from `file://` origins for security reasons. The sign-in redirect also fails to match the registered callback URL because the origin is wrong.

**Fix:**

Start a local web server from the repo root:

```bash
python3 -m http.server 8000
```

or:

```bash
npm run serve
```

Then open `http://localhost:8000/` in your browser — not by clicking a file, but by typing or pasting that URL into the address bar. The demo must be served over `http://` (or `https://` in production) for the OAuth flow to work.

---

## Still stuck?

If none of the above fixes your issue:

1. Open your browser's developer tools (F12 or Cmd+Option+I) and check the **Console** tab for JavaScript errors and the **Network** tab for failed requests.
2. Check the URL in the address bar when the error occurs — the OAuth error is usually in the query parameters (e.g., `?error=redirect_mismatch&error_description=...`).
3. Check the AWS CloudWatch logs for your Cognito user pool in the [AWS Console](https://console.aws.amazon.com/cognito/).
