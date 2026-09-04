/* =====================================================================
   Southern Comprehensive Insurance — Agent Tools configuration

   Fill these in after completing GOOGLE-SETUP.md. None of these are
   secrets: the Client ID is designed to live in public web pages and
   only works from the origins you authorised in Google Cloud, and the
   Sheet is protected by Google sign-in, not by hiding its ID.
   ===================================================================== */
window.SCI_CONFIG = {

  /* From GOOGLE-SETUP.md Part 3d — ends in .apps.googleusercontent.com */
  GOOGLE_CLIENT_ID: '',

  /* From GOOGLE-SETUP.md Part 1 — the long id in the Sheet's URL */
  SHEET_ID: '',

  /* Tab name inside that spreadsheet */
  SHEET_TAB: 'Pipeline',

  /* Which calendar to read. 'primary' is the signed-in user's own. */
  CALENDAR_ID: 'primary',

  /* From GOOGLE-SETUP.md Part 2 — used by the Schedule page and dashboard */
  BOOKING_URL: ''
};
