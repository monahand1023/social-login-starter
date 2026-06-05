# 05 — Run the Demo

At this point you have:
- Deployed Cognito (doc 04)
- A filled-in `config.js`

Now you will run the demo locally and confirm that sign-in actually works end-to-end.

---

## Step 1: Make sure config.js exists

If you have not already done this, copy the example and fill it in:

```bash
cp config.example.js config.js
```

Open `config.js` and paste the four values printed by `./infra/deploy.sh` (or found in the AWS Console). It should look like:

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

The `redirectUri` and `logoutUri` lines use `window.location.origin`, so they automatically adapt to whatever origin you are running from — you do not need to change them.

---

## Step 2: Start a local web server

**Why you must use a server — not opening the file directly:**

When you completed docs 02 and 03, you registered the redirect URL `http://localhost:8000/callback.html` with Google and Apple. After you sign in, Google sends the user's browser back to exactly that URL. If you open `index.html` directly (double-clicking it in Finder, which gives a `file:///...` address), the page loads, but after Google sign-in the browser is redirected to `http://localhost:8000/callback.html` — which does not exist, because no server is running. You get an error. The `file://` origin also blocks the `fetch()` call that exchanges the sign-in code for tokens, for browser security reasons.

The fix is simple: always serve the demo over `http://localhost:8000`.

Run either of these commands from the repo root:

```bash
python3 -m http.server 8000
```

or, if you have Node.js installed:

```bash
npm run serve
```

Both do the same thing: start a local web server on port 8000. Leave the terminal window running while you test.

---

## Step 3: Open the demo

Open your browser and go to:

```
http://localhost:8000/
```

You should see the Social Login Starter demo page with "Sign in with Google" and "Sign in with Apple" buttons.

---

## Step 4: Run the manual smoke checklist

Work through each item below. Check them off as you go.

- [ ] **The page loads with no yellow warning box.** If you see a yellow box that says "Your config.js needs attention," one of the four values in `config.js` is still a placeholder or is formatted incorrectly. Fix it and refresh.

- [ ] **Click "Sign in with Google."** Your browser should navigate to a Google sign-in page. If nothing happens or you get a console error, see [08-troubleshooting.md](08-troubleshooting.md).

- [ ] **Complete the Google sign-in flow.** You may see a consent screen ("My App wants to access your email and profile"). Click Allow. If you see "Access blocked: App not verified," see the troubleshooting doc.

- [ ] **You are redirected to `http://localhost:8000/callback.html`.** You should briefly see "Signing you in… One moment." If you see "Sign-in failed:" followed by an error message, see [08-troubleshooting.md](08-troubleshooting.md).

- [ ] **You land back on `http://localhost:8000/index.html` showing your email address.** The page should say "You're signed in as [your email]." If it shows the sign-in buttons again, check the browser console for errors.

- [ ] **Reload the page.** You should still be signed in (the session is stored in `sessionStorage`). Note: sessions are per-tab — opening a new tab starts you fresh, which is the expected Level-1 behavior.

- [ ] **Click "Sign out."** You should be redirected to the Cognito logout endpoint and then back to the home page, showing the sign-in buttons again.

All seven checks pass? You are done. The whole flow works.

---

## Step 5: Test from a deployed (production) site

When you deploy your site to a real URL (e.g., `https://yoursite.com`), you need to:

1. Add `https://yoursite.com/callback.html` to `CALLBACK_URLS` and `https://yoursite.com/` to `LOGOUT_URLS` in `infra/parameters.sh`.
2. Re-run `./infra/deploy.sh` to update the Cognito app client.
3. Add `https://yoursite.com/callback.html` as an Authorized Redirect URI in Google Cloud Console.
4. Add `https://yoursite.com/callback.html` as a Return URL in your Apple Services ID configuration.

Multiple callback URLs are supported — you can have both `http://localhost:8000/callback.html` and `https://yoursite.com/callback.html` registered at the same time.

---

## Next step

Go to [06-add-to-your-site.md](06-add-to-your-site.md) to copy the login code into your own existing site.
