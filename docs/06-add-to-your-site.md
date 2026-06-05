# 06 — Add Login to Your Existing Site

The demo is working. Now you want sign-in on your actual site. This doc covers the minimal steps to copy the login code into any static website.

---

## Step 1: Copy the three files

Copy these three files into your site's directory structure. The paths do not have to match — put them wherever makes sense for your project:

```
js/auth.js             → your site's js/ folder (or wherever you keep scripts)
js/validate-config.js  → same place as auth.js
config.js              → your site's root (alongside your index.html)
```

If your site has a different folder structure, adjust the `<script src="...">` paths in the next step accordingly.

`config.js` holds the four public values (region, userPoolId, clientId, domain) that you filled in during [04-deploy-cognito.md](04-deploy-cognito.md). You can commit `config.js` to your repo — these are public identifiers, not secrets.

---

## Step 2: Add the script tags to your HTML pages

On every page that needs to know whether the user is signed in, add these three `<script>` tags. They must appear in this order, before any of your own scripts that call `window.socialLogin`:

```html
<script src="config.js"></script>
<script src="js/validate-config.js"></script>
<script src="js/auth.js"></script>
```

Adjust the `src` paths to match wherever you placed the files in Step 1.

---

## Step 3: Add sign-in buttons

Add buttons that call the sign-in functions when clicked. Here is a minimal example:

```html
<button onclick="window.socialLogin.signInWithGoogle()">
  Sign in with Google
</button>

<button onclick="window.socialLogin.signInWithApple()">
  Sign in with Apple
</button>
```

You can style these however you like. The demo's CSS in `css/styles.css` has brand-correct button styles you can copy if useful.

---

## Step 4: Add a callback page

Create a `callback.html` file at your site's root (or wherever you registered the callback URL in `infra/parameters.sh` and in Google/Apple). You can copy the demo's `callback.html` directly — it works as-is:

```bash
cp /path/to/social-login-starter/callback.html your-site/callback.html
```

Make sure the `<script src="...">` paths inside it point to the correct locations of `config.js` and `js/auth.js` in your site.

After sign-in, the callback page exchanges the sign-in code for tokens and then redirects to `index.html`. If you want to redirect somewhere else instead, edit the `window.location.replace('index.html')` line in `callback.html`.

The callback URL you registered must match exactly. For example, if your site is `https://yoursite.com` and `callback.html` is at the root, you need `https://yoursite.com/callback.html` registered in:
- `CALLBACK_URLS` in `infra/parameters.sh` (re-run `./infra/deploy.sh` after changing this)
- Google Cloud Console → Authorized redirect URIs
- Apple Services ID → Return URLs (if using Apple)

---

## Step 5: Use the login state in your code

After the scripts are loaded, you have access to these functions anywhere in your JavaScript:

```js
// Get the current user — returns a Promise of the user object, or null.
// Use loadUser(): it works whether or not you later add the Level-2 backend.
const user = await window.socialLogin.loadUser();
if (user) {
  console.log(user.email);   // e.g., alice@example.com
  console.log(user.name);    // display name (falls back to email if unavailable)
  console.log(user.sub);     // unique user ID from Cognito
}

// Sign out (clears the session and redirects to Cognito logout)
await window.socialLogin.signOut();
```

> The synchronous `window.socialLogin.isLoggedIn()` and `getUser()` also exist and are handy in Level-1 (browser-only) mode. But prefer the async `loadUser()` for new code: if you ever set `sessionApiUrl` to enable the Level-2 backend, `loadUser()` keeps working unchanged (it reads the server session) while the sync helpers only see browser-held tokens.

A typical pattern is to call `loadUser()` on page load and show different UI depending on the result:

```js
document.addEventListener('DOMContentLoaded', async function () {
  const user = await window.socialLogin.loadUser();
  if (user) {
    document.getElementById('welcome').textContent = 'Hello, ' + user.name;
    document.getElementById('signed-out-section').hidden = true;
    document.getElementById('signed-in-section').hidden = false;
  } else {
    document.getElementById('signed-out-section').hidden = false;
    document.getElementById('signed-in-section').hidden = true;
  }
});
```

---

## How the session works (Level 1)

The tokens returned by Cognito are stored in `sessionStorage` — they live in memory for the current browser tab. Closing the tab clears the session. This is the simplest and safest approach for a static site because no token ever touches a server or a cookie.

If you need sessions that survive tab closes, work across tabs, or be validated on a server, see [07-level-2-backend.md](07-level-2-backend.md) for the optional httpOnly cookie backend. The frontend is already wired for it — you enable it by setting `sessionApiUrl` in `config.js`, with no code changes here (your `loadUser()` calls keep working).

---

## Deployment checklist

Before going live, confirm:

- [ ] `config.js` is present in your deployed site (it is gitignored by default in this starter repo, so you will need to add it to your own site's repo or deploy pipeline)
- [ ] Your production callback URL (`https://yoursite.com/callback.html`) is registered in `CALLBACK_URLS`, in Google, and in Apple
- [ ] You have re-run `./infra/deploy.sh` after adding the production URL to `parameters.sh`
- [ ] You have served the site over HTTPS in production (the browser requires it for `crypto.subtle` and for Cognito's redirect)

---

## Next step

If something is not working, see [08-troubleshooting.md](08-troubleshooting.md) for a table of common errors and how to fix them.
