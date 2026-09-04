# Google integration setup

This connects three things Roosevelt already owns:

- **Google Calendar** — where clients book
- **Google Sheets** — where the pipeline lives (durable, on his phone, backed up)
- **Apps Script** — free glue that turns a booking into a pipeline row automatically

Budget **35–45 minutes**. Do it in one sitting; the steps depend on each other.

> Do all of this signed in as **the Google Workspace account that owns scompinsurance.com**, not a
> personal Gmail. If you're setting it up on Roosevelt's behalf, have him sign in on your machine, or
> screen-share and let him click.

---

## Part 1 — Create the pipeline Sheet (5 min)

1. Go to [sheets.new](https://sheets.new)
2. Name it **SCI Pipeline**
3. Rename the bottom tab from `Sheet1` to **Pipeline** (double-click the tab)
4. Paste this into cell **A1**, exactly — it must be one row across columns A–J:

```
id	name	county	coverage	stage	action	due	notes	updated	source
```

   Paste it as tab-separated and it will fill A1:J1 in one go.

5. Make row 1 bold: select row 1 → **Format → Text → Bold**
6. Freeze it: **View → Freeze → 1 row**

**Copy the Sheet ID from the address bar.** In this URL:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                      └──────── this part ────────┘
```

Paste it somewhere for later. **Send it to me and I'll wire it in.**

---

## Part 2 — Create the appointment schedule (10 min)

1. Open [Google Calendar](https://calendar.google.com)
2. Click **Create → Appointment schedule**
3. Set it up:
   - **Title:** Free Insurance Consultation
   - **Duration:** 30 minutes (45 if he prefers room to talk)
   - **General availability:** the hours he actually wants to take calls
   - **Booked appointment settings → Buffer time:** 15 minutes between appointments
   - **Maximum bookings per day:** whatever is realistic — 4 or 5 is sane
   - **Minimum time before booking:** 4 hours, so nobody books him in 10 minutes
4. Under **Booking form**, keep name and email, and **add a phone number field**
5. Save

Then click the schedule → **Share** → **Open booking page**. Copy that URL.

**Send me that booking page URL too.**

> Business Starter allows one booking page. Business Standard and above add automated email reminders,
> which meaningfully cut no-shows — worth the upgrade if he's on Starter and this gets used.

---

## Part 3 — Google Cloud project and OAuth client (15 min)

This is what lets Agent Tools read his calendar and sheet. It sounds intimidating and isn't.

### 3a. Create the project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Top bar, click the project dropdown → **New Project**
3. Name: **SCI Agent Tools** → **Create**
4. Wait for it, then make sure it's the selected project in the top bar

### 3b. Turn on the two APIs

1. Left menu → **APIs & Services → Library**
2. Search **Google Calendar API** → click it → **Enable**
3. Back to Library, search **Google Sheets API** → click it → **Enable**

### 3c. Configure the consent screen

1. **APIs & Services → OAuth consent screen**
2. User type: **Internal** if offered (it will be, on Workspace) → **Create**
   - Internal means only accounts on scompinsurance.com can use it. That's exactly what we want.
   - If **Internal** is greyed out, choose **External** and add Roosevelt's email as a Test User in a later step.
3. Fill in:
   - **App name:** SCI Agent Tools
   - **User support email:** support@scompinsurance.com
   - **Developer contact:** your email
4. **Save and Continue** through the remaining screens. You can skip Scopes — we request them in code.

### 3d. Create the OAuth client ID

1. **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth client ID**
3. **Application type:** Web application
4. **Name:** Agent Tools Web
5. Under **Authorized JavaScript origins**, click **Add URI** and add **both**:

```
https://scompinsurance.com
https://rodrivero2016-collab.github.io
```

   If you test locally, also add `http://localhost:8000`.

6. Leave **Authorized redirect URIs** empty — we use the token flow, which doesn't need them.
7. **Create**

A dialog shows your **Client ID**, ending in `.apps.googleusercontent.com`.

**Send me that Client ID.** It is not a secret — it's designed to sit in public web pages, and it only
works from the origins you just listed.

---

## Part 4 — Apps Script: bookings become pipeline rows (10 min)

1. Open your **SCI Pipeline** sheet
2. **Extensions → Apps Script**
3. Delete whatever is in the editor
4. Paste in the entire contents of `apps-script/Code.gs` from this project
5. At the top of that file, set `SHEET_ID` to your Sheet ID from Part 1
6. Click **Save** (disk icon), name the project **SCI Booking Bridge**
7. In the function dropdown at the top, select **setUp** and click **Run**
8. Google will ask for authorization — **Review permissions → choose the account → Advanced → Go to
   SCI Booking Bridge (unsafe) → Allow**
   - "Unsafe" here just means it's your own unpublished script. It is your code, in your account.
9. Check the execution log says the trigger was installed

Test it: book an appointment on your own booking page using a different email. Within a few minutes a
row should appear in the Sheet with stage **scheduled** and source **booking**.

---

## What to send me

1. **Sheet ID** — from Part 1
2. **Booking page URL** — from Part 2
3. **OAuth Client ID** — from Part 3d

With those three I'll wire up the dashboard and the Sheets-backed pipeline, and the whole thing works
end to end.

---

## Troubleshooting

**"Access blocked: This app's request is invalid"** → the origin in Part 3d doesn't match the URL
you're on. They must match exactly, including `https://` and no trailing slash.

**Nothing appears in the Sheet after a test booking** → open Apps Script → **Executions** in the left
menu, and look for errors. Most often `SHEET_ID` is wrong or the tab isn't named `Pipeline`.

**"You do not have permission to call..."** → re-run `setUp` and complete the authorization prompt.

**Sign-in works but the dashboard is empty** → the Calendar and Sheets APIs weren't both enabled in 3b.
