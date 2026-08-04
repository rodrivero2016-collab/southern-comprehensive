# Deploying to GitHub Pages

Free hosting, free SSL, works with a custom domain. About 15 minutes start to finish.

---

## Read this first — the one real trap

**The `admin/` folder must not go on GitHub Pages.**

The console's password gate runs in the browser. On a public URL, anyone can open View Source and
read straight past it. GitHub Pages has no server-side password protection at any price, so there is
no way to fix this on Pages.

The `.gitignore` in this folder already excludes `admin/` for you. **Leave that line alone.**

You still get full use of the console — you just run it on your own computer instead. Double-click
`run-console.command` and it opens at `http://localhost:8000/admin/`. Same tool, same agents,
zero exposure. Nobody but you can reach it.

> Making the GitHub repo private does not help. Pages still serves the site publicly, and private-repo
> Pages requires a paid plan anyway.

---

## Step 1 — Install Git (skip if you have it)

Open Terminal and type:

```bash
git --version
```

If you get a version number, you're set. If macOS offers to install developer tools, accept it.

---

## Step 2 — Create the repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `southern-comprehensive` (or anything — it won't appear in your final domain)
3. **Public** — required for free GitHub Pages
4. Do **not** check "Add a README" — you already have one
5. Click **Create repository**

Leave that page open. You'll need the URL it shows you.

---

## Step 3 — Push the site

In Terminal, `cd` into this folder. The easiest way: type `cd ` (with the space), then drag the
`southern-comprehensive` folder from Finder into the Terminal window and press Return.

Then run these one at a time:

```bash
git init
git add .
git commit -m "Initial site build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/southern-comprehensive.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

**On the push, GitHub will ask for a password — your account password will not work.** You need a
personal access token:

1. [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic)
2. Give it a name, set an expiration, check the **`repo`** box
3. Generate, copy it, and paste it as the password

### Confirm `admin/` stayed behind

```bash
git ls-files | grep admin
```

**This should print nothing.** If it prints file names, stop and fix `.gitignore` before continuing.

---

## Step 4 — Turn on Pages

1. In your repo, click **Settings**
2. **Pages** in the left sidebar
3. Under "Build and deployment" → Source: **Deploy from a branch**
4. Branch: **main**, folder: **/ (root)**
5. **Save**

Wait two or three minutes. The page will show your live URL:

```
https://YOUR-USERNAME.github.io/southern-comprehensive/
```

---

## Step 5 — Point your domain at it

Once you've bought a domain (about $12/year at Namecheap, Cloudflare or Porkbun):

**At GitHub:** Settings → Pages → Custom domain → enter `southerncomprehensive.com` → Save.
Then check **Enforce HTTPS** once it becomes available — that can take up to 24 hours.

**At your domain registrar,** add these DNS records:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | YOUR-USERNAME.github.io |

DNS usually propagates in an hour, occasionally up to 48.

---

## Updating the site later

Any time you change a file:

```bash
git add .
git commit -m "Updated phone number"
git push
```

Live in about a minute. That's the whole workflow.

---

## Forms won't work on GitHub Pages

Pages serves static files only — it can't receive a form submission. You have two options:

**Formspree** (works fine on Pages). Sign up at [formspree.io](https://formspree.io), create a form,
then in each HTML file change:

```html
<form class="form" data-lead>
```
to:
```html
<form class="form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

Dropping `data-lead` is what stops the demo notice from appearing. There are forms on `index.html`,
`contact.html` and `blog.html`.

**Or switch to Netlify**, which has forms built in — see below.

---

## Honest comparison: is Netlify the better call?

| | GitHub Pages | Netlify |
|---|---|---|
| Cost | Free | Free tier |
| Custom domain + SSL | Yes | Yes |
| Deploy from Git | Yes | Yes |
| Form handling | No — needs Formspree | Built in |
| Password-protect a folder | **No** | Yes, on paid tier |
| Serverless functions | No | Yes, free tier |

Netlify is the better long-term home for this project, for two specific reasons: forms work without a
third party, and when you're ready to put the agent console online properly, you can move the API key
into a serverless function behind real authentication. Neither is possible on Pages.

Netlify also deploys straight from the same GitHub repo — so nothing you do in this guide is wasted.
Push to GitHub now, and if you switch later it's about five clicks.

---

## Before you push — the launch checklist

- [ ] Replace the 231 placeholders (search the folder for `class="ph"`)
- [ ] Update `href="tel:+10000000000"` links with the real number
- [ ] Fill in the carrier and product counts in the footer — CMS requires these
- [ ] Replace the illustrative term rates in `assets/js/main.js` with real carrier rates, or remove
      the cost estimator
- [ ] Add Roosevelt's photo (two spots: home and about)
- [ ] Connect the forms
- [ ] Add the Google Maps embed and scheduler link
- [ ] Replace testimonial placeholders with real, written-permission quotes
- [ ] Carrier/FMO compliance review of every Medicare-related page
- [ ] Attorney review of `privacy.html` and `terms.html`
- [ ] Confirm `git ls-files | grep admin` prints nothing
