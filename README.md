# Southern Comprehensive Insurance, LLC — Website & AI Agent Console

Built for **Roosevelt Brown Jr.**, Owner & Founder.
Phase 1 launch site plus a private, password-gated AI agent console.

---

## Look at it right now

The site is plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.

**Just browsing?** Double-click `index.html`.

**Testing the AI console?** You need a local server, because browsers block API calls from `file://`:

```bash
cd southern-comprehensive
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The console lives at `http://localhost:8000/admin/`.

---

## What's here

```
southern-comprehensive/
├── index.html            Home — sales page, calculators, testimonials, lead form
├── about.html            Roosevelt's story, licenses, community
├── medicare.html         Basics, turning 65, Advantage vs Supplement, Part D, annual review
├── health.html           ACA Marketplace, families, self-employed, early retirees
├── life.html             Term, whole, universal, final expense, mortgage, income replacement
├── supplemental.html     Hospital indemnity, cancer, critical illness, accident, dental, vision
├── resources.html        Learning center — glossary, checklist, turning 65 guide, FAQ
├── blog.html             Nine article concepts, ready to write
├── reviews.html          Testimonials + Google reviews
├── contact.html          Form, map, hours, scheduler
├── privacy.html          Privacy Policy
├── terms.html            Terms of Use
├── accessibility.html    Accessibility Statement
├── compliance.html       CMS / Medicare disclosures and review process
├── admin/
│   ├── index.html        The AI agent console (password-gated)
│   └── agents.js         All 11 agent prompts — plain English, edit freely
├── assets/
│   ├── css/styles.css    Full design system
│   ├── js/main.js        Nav, calculators, forms
│   └── img/logo.png      Company logo
└── build.py              Regenerates every page (optional)
```

---

## Brand

Colors were sampled directly out of the logo file.

| Token | Hex | Used for |
|---|---|---|
| Navy | `#032454` | Headings, header, footer, primary surfaces |
| Green | `#426C34` | Buttons, accents, eyebrows, links on hover |
| Ink | `#16202E` | Nav and strong text |
| Body | `#3F4A5A` | Paragraph text |
| Muted | `#5F6A7C` | Secondary text |

Serif headings, sans-serif body — matching the logo's typographic feel. All 23 text/background
combinations tested at **WCAG 2.1 AA** contrast.

---

## Before this goes live

### 1. Replace the placeholders
There are **231 highlighted placeholders** across the site. They render with a yellow background so
they're impossible to miss. Search the folder for `class="ph"` to find every one.

The high-frequency ones:

| Placeholder | Count | What it needs |
|---|---|---|
| `[PHONE]` | 34 | Business phone |
| `[GA LICENSE #]` | 31 | Georgia producer license number |
| `[NUMBER]` | 31 | Carriers/products represented — required by CMS |
| `[DATE]` | 19 | Effective and review dates |
| `[EMAIL]` | 9 | Business email |
| `[STREET ADDRESS…]` | 6 | Office address |

Fastest approach — find and replace across the folder:

```bash
cd southern-comprehensive
grep -rl '\[PHONE\]' *.html | xargs sed -i '' 's|<span class="ph">\[PHONE\]</span>|(555) 123-4567|g'
```

(Drop the `''` after `-i` on Linux.) Also update the `href="tel:+10000000000"` links.

### 2. Make the forms actually send
Every form is inert right now. Pick one:

- **Netlify Forms** — add `netlify` to the `<form>` tag. Free, zero config.
- **Formspree** — set `action="https://formspree.io/f/YOUR_ID"` and `method="POST"`.
- **Your CRM** — post to its endpoint directly.

Then delete the `data-lead` attribute so the demo notice stops appearing.

### 3. Fix the cost estimator rates
`assets/js/main.js` contains a `RATES` table of **illustrative** term life rates. Replace them with
your carriers' actual filed rates, or remove the estimator. Publishing invented pricing is a real
regulatory problem, not a cosmetic one.

### 4. Add the real content
- Professional photo of Roosevelt (two placeholders: home page and about page)
- Google Maps embed on the contact page
- Scheduler link — Calendly or Google Appointments
- Google Business Profile link and reviews widget
- Real, written-permission testimonials

### 5. Compliance review — do this last and do it properly
Your executive summary named compliance as the top operational risk, and it's right.

- Every page mentioning Medicare needs carrier/FMO review before publication
- The multi-plan disclaimer and government non-affiliation statement are already in the footer of
  every page — fill in the carrier counts
- Have a Georgia attorney review `privacy.html` and `terms.html` against your actual practices
- Re-review the whole site annually before AEP

---

## Hosting

**Recommended: Netlify.** Free tier, free SSL, free forms, and — importantly — it supports the
password protection and serverless functions you'll want for the admin console.

1. Push this folder to GitHub
2. Connect the repo at netlify.com
3. Leave build command empty; publish directory is the folder root
4. Point your domain at it in Site settings → Domain management

**GitHub Pages** also works and is free, but has no server-side password protection — see the
security note below before putting the admin console on it.

---

## The AI agent console

Open `/admin/`. Default password: **`southern2026`** — change it before this touches a public server.

### Changing the password

In your browser console, run:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourNewPassword'))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
```

Paste the result into `PASSWORD_HASH` near the top of the script in `admin/index.html`.

### The agents

**Advisory board** — five strategic advisors for thinking and planning:

| Agent | What it does |
|---|---|
| CEO Business Advisor | Weekly check-in, OKRs, what you're avoiding |
| Medicare Compliance Officer | Reviews public-facing material against CMS rules with severity ratings |
| Chief Marketing Officer | Campaign plans, content calendars, lead flow |
| Sales Coach | Roleplays objections, debriefs real calls |
| Client Success Manager | Retention, referrals, touchpoint calendar |

**Working assistants** — six task-doers that produce drafts:

| Agent | What it does |
|---|---|
| Website Assistant | Drafts and tests public FAQ answers |
| Lead Qualifier | Turns an inquiry into a pre-call brief |
| Content Engine | One idea → a week of posts, captions, newsletter |
| Follow-Up Drafter | The recap email after every call |
| Client Care Reminders | Flags who to touch and when |
| Admin Cleanup | Messy notes → clean CRM records |

Every agent inherits a shared guardrail block: never invent facts or testimonials, never state plan
specifics as fact, flag anything needing compliance review, and never produce securities or legal
advice. **The AI drafts. Roosevelt approves.**

### Editing the agents
Open `admin/agents.js` in any text editor. The prompts are plain English. Rewrite them as the
business changes — that file is meant to be edited, not treated as code.

### API key
Click "API key settings" in the sidebar and paste a key from
[console.anthropic.com](https://console.anthropic.com). It's stored in that browser only.

### ⚠️ Security — read this before hosting the console publicly

The password gate and the API key are both **client-side**. That means:

- The gate stops casual visitors. It does **not** stop anyone who views the page source.
- The API key is readable by anyone with access to that browser profile.

**On Roosevelt's own computer, this is fine.** On a public server it is not.

Before putting `/admin/` on a public URL, do one of these:

1. **Netlify password protection** (simplest) — Site settings → Access control → Password protection.
   Real server-side auth, and it costs nothing on the Pro tier.
2. **Netlify Identity + a serverless function** (correct) — move the API key into an environment
   variable and proxy the Anthropic call through a function, so the key never reaches the browser.
3. **Keep it local** — don't deploy `/admin/` at all. Run it on his machine with
   `python3 -m http.server`. Zero exposure, and it works exactly the same.

Option 3 is the honest recommendation for launch. Option 2 when there's time.

---

## Phase 2 — what comes next

Deliberately not built yet, matching the proposal's phasing:

- Spanish version of every page (the structure supports it — duplicate into `/es/`)
- Public-facing website chat assistant, once the Website Assistant's answers have been reviewed
- Blog articles written from the nine outlines in `blog.html`
- Downloadable lead magnets, gated behind an email address
- CRM connection so forms create contacts automatically
- The advisor-track content, once Roosevelt holds securities registration

---

*Built from the "What We Can Build Together" proposal (Juan Cuellar, July 2026). Statistics cited on
the site come from the LIMRA & Life Happens 2025 Insurance Barometer Study.*
