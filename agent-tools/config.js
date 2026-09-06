/* =====================================================================
   Southern Comprehensive Insurance — Agent Tools configuration

   Fill these in after completing GOOGLE-SETUP.md. None of these are
   secrets: the Client ID is designed to live in public web pages and
   only works from the origins you authorised in Google Cloud, and the
   Sheet is protected by Google sign-in, not by hiding its ID.
   ===================================================================== */
window.SCI_CONFIG = {

  /* From GOOGLE-SETUP.md Part 3d — ends in .apps.googleusercontent.com */
  GOOGLE_CLIENT_ID: '497192430918-98qsseol1evprocih4nben18c8rids9d.apps.googleusercontent.com',

  /* From GOOGLE-SETUP.md Part 1 — the long id in the Sheet's URL */
  SHEET_ID: '1-_QlTimRYXh9rI4pTu4UHlAv3K0T9DbYf6TS5rPXl_U',

  /* Tab name inside that spreadsheet */
  SHEET_TAB: 'Pipeline',

  /* Which calendar to read. 'primary' is the signed-in user's own. */
  CALENDAR_ID: 'primary',

  /* From GOOGLE-SETUP.md Part 2 — used by the Schedule page and dashboard */
  BOOKING_URL: 'https://calendar.app.google/SqLU8bptRmmpcVpn9'
};
