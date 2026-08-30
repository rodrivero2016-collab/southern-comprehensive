# Connecting scompinsurance.com

Domain registered at **Squarespace**. Site hosted on **GitHub Pages**.

---

## ⚠️ Read this before you touch DNS

**You have email on this domain** — `support@scompinsurance.com`. Email is controlled by **MX records**,
which are separate from the A and CNAME records you're about to add.

- **Do NOT delete MX records.** That breaks email immediately.
- **Do NOT delete TXT records.** Those carry SPF, DKIM and domain verification. Deleting them sends
  outgoing mail to spam.
- **Only remove A records for `@` and a CNAME for `www`** if they currently point at Squarespace.

If in doubt, screenshot the DNS panel before changing anything. That's your undo.

---

## Step 1 — Squarespace DNS

1. Log in to Squarespace
2. **Settings → Domains** → click **scompinsurance.com**
3. Click **DNS** → **DNS Settings**
4. Scroll to **Custom Records**

**Remove first** — only these, only if present:

- Any **A** record with host `@` pointing to a Squarespace IP (usually starts `198.` or `. 185.`)
- Any **CNAME** with host `www` pointing to something ending in `.squarespace.com`

Leave every MX, TXT, SRV and CAA record exactly as it is.

**Then add these six records:**

| Type | Host | Data / Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `rodrivero2016-collab.github.io` |

Notes on the Squarespace form:

- Host field may be labelled **Host**; use `@` for the root domain
- The CNAME value must end with a dot in some panels — `rodrivero2016-collab.github.io.` — Squarespace
  usually adds it for you
- Do not include `https://` or the repository name anywhere

Save. Squarespace says changes can take **24 to 48 hours**, though it's often under an hour.

---

## Step 2 — GitHub

1. Repo → **Settings → Pages**
2. **Custom domain**: type `scompinsurance.com` — no `https://`, no `www`, no trailing slash
3. **Save**
4. Wait for the DNS check to turn green. It will show errors until DNS propagates — that's normal, not
   a mistake on your part. Click **Check again** periodically.
5. Once green, tick **Enforce HTTPS**. The certificate can take up to another 24 hours.

GitHub redirects `www.scompinsurance.com` to `scompinsurance.com` automatically once both records
resolve.

---

## Step 3 — The CNAME file (already done)

The repo now contains a file named `CNAME` holding `scompinsurance.com`.

**Do not delete it.** GitHub reads this file to know the custom domain. We push with `--force`
sometimes, which overwrites whatever GitHub adds on its own — keeping the file in the repo is what
makes the domain survive.

---

## Step 4 — Verify

Once DNS has propagated:

```bash
dig +short scompinsurance.com
```

Should list the four `185.199.x.x` addresses.

```bash
curl -sI https://scompinsurance.com | head -1
```

Should return `HTTP/2 200`.

```bash
curl -s https://scompinsurance.com | grep -o "<title>[^<]*"
```

Should show the homepage title.

**Confirm email still works** — send a test message to `support@scompinsurance.com` from an outside
address. Do this the same day you change DNS, so a problem is easy to trace.

---

## After it's live

- Agent Tools moves to `https://scompinsurance.com/agent-tools/` — update Roosevelt's bookmark
- The old `rodrivero2016-collab.github.io/southern-comprehensive/` address will redirect
- Submit `https://scompinsurance.com/sitemap.xml` in Google Search Console
- Claim the Google Business Profile with the new domain
- Update the domain on business cards, email signature and social profiles

---

## If it breaks

**Site doesn't load, DNS looks right** → wait. Propagation is genuinely slow sometimes.

**"Domain does not resolve to the GitHub Pages server"** → the A records aren't right, or haven't
propagated. Check with `dig +short scompinsurance.com`.

**Email stopped working** → an MX or TXT record was removed. Restore from your screenshot, or
Squarespace support can help recover them.

**Site loads but has no styling** → the CNAME file was deleted, or a stale cache. Hard-refresh first.

**Roll back entirely** → clear the custom domain in GitHub Settings → Pages, delete the four A records
at Squarespace, and the github.io URL works again.
