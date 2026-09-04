/**
 * Southern Comprehensive Insurance — Booking Bridge
 *
 * Watches Google Calendar for new appointment bookings and writes each one
 * into the SCI Pipeline sheet as a lead at the "scheduled" stage.
 *
 * SETUP: paste this whole file into Extensions > Apps Script from the
 * Pipeline sheet, set SHEET_ID below, then run setUp() once.
 * See GOOGLE-SETUP.md Part 4.
 */

// ---------------------------------------------------------------------------
// CONFIG — set this
// ---------------------------------------------------------------------------
var SHEET_ID   = 'PASTE_YOUR_SHEET_ID_HERE';
var SHEET_TAB  = 'Pipeline';
var CALENDAR_ID = 'primary';

/** Only events whose title matches one of these become pipeline rows.
 *  Appointment Schedules names events after the schedule title. */
var BOOKING_KEYWORDS = ['consultation', 'consult', 'appointment', 'medicare', 'insurance review'];

var HEADERS = ['id','name','county','coverage','stage','action','due','notes','updated','source'];

// ---------------------------------------------------------------------------
// Run this once to install the trigger
// ---------------------------------------------------------------------------
function setUp() {
  if (SHEET_ID === 'PASTE_YOUR_SHEET_ID_HERE') {
    throw new Error('Set SHEET_ID at the top of this file first.');
  }

  // Remove any previous triggers so re-running is safe
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onCalendarChange') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  ScriptApp.newTrigger('onCalendarChange')
    .forUserCalendar(CALENDAR_ID === 'primary' ? Session.getEffectiveUser().getEmail() : CALENDAR_ID)
    .onEventUpdated()
    .create();

  ensureHeaders_();
  Logger.log('Trigger installed. Bookings will now sync to the Pipeline sheet.');
  Logger.log('Run backfill() if you want to import bookings already on the calendar.');
}

/** Make sure row 1 has the right headers. */
function ensureHeaders_() {
  var sh = getSheet_();
  var first = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var blank = first.every(function (c) { return !c; });
  if (blank) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    Logger.log('Headers written.');
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_TAB);
  if (!sh) throw new Error('No tab named "' + SHEET_TAB + '" in that spreadsheet.');
  return sh;
}

// ---------------------------------------------------------------------------
// Fired by Google when the calendar changes
// ---------------------------------------------------------------------------
function onCalendarChange() {
  var now = new Date();
  var from = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);   // 2 days back
  var to   = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days ahead
  syncRange_(from, to);
}

/** Import bookings already sitting on the calendar. Safe to run repeatedly. */
function backfill() {
  var now = new Date();
  var from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  var to   = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  var n = syncRange_(from, to);
  Logger.log('Backfill complete. ' + n + ' new row(s) added.');
}

function syncRange_(from, to) {
  var cal = CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Calendar not found: ' + CALENDAR_ID);

  var events = cal.getEvents(from, to);
  var sh = getSheet_();
  var known = existingEventIds_(sh);
  var added = 0;

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (!isBooking_(ev)) continue;

    var eid = String(ev.getId());
    if (known[eid]) continue;

    sh.appendRow(rowFromEvent_(ev, eid));
    known[eid] = true;
    added++;
  }
  return added;
}

/** Column A holds our row id; for booking rows it is "gcal:<eventId>". */
function existingEventIds_(sh) {
  var last = sh.getLastRow();
  var map = {};
  if (last < 2) return map;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var v = String(ids[i][0] || '');
    if (v.indexOf('gcal:') === 0) map[v.slice(5)] = true;
  }
  return map;
}

function isBooking_(ev) {
  var title = (ev.getTitle() || '').toLowerCase();
  for (var i = 0; i < BOOKING_KEYWORDS.length; i++) {
    if (title.indexOf(BOOKING_KEYWORDS[i]) !== -1) return true;
  }
  // Appointment Schedule bookings always have a guest who isn't the owner
  var guests = ev.getGuestList();
  return guests && guests.length > 0 && title.indexOf('consult') !== -1;
}

function rowFromEvent_(ev, eid) {
  var start = ev.getStartTime();
  var tz = Session.getScriptTimeZone();

  // Prefer the guest's name; fall back to parsing the title
  var who = '';
  var email = '';
  var guests = ev.getGuestList();
  for (var i = 0; i < guests.length; i++) {
    var g = guests[i];
    if (g.getEmail() && g.getEmail() !== Session.getEffectiveUser().getEmail()) {
      who = g.getName() || g.getEmail().split('@')[0];
      email = g.getEmail();
      break;
    }
  }
  if (!who) {
    var t = ev.getTitle() || '';
    var m = t.match(/(?:with|:)\s*(.+)$/i);
    who = m ? m[1].trim() : t.trim();
  }

  return [
    'gcal:' + eid,                                              // id
    shortName_(who),                                            // name
    '',                                                         // county
    guessCoverage_(ev),                                         // coverage
    'scheduled',                                                // stage
    'Prepare for consultation',                                 // action
    Utilities.formatDate(start, tz, 'yyyy-MM-dd'),              // due
    buildNote_(ev, email, tz),                                  // notes
    Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),         // updated
    'booking'                                                   // source
  ];
}

/** Keep the sheet consistent with the no-full-PII convention: first name + last initial. */
function shortName_(full) {
  var parts = String(full || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'Unknown';
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}

function guessCoverage_(ev) {
  var text = ((ev.getTitle() || '') + ' ' + (ev.getDescription() || '')).toLowerCase();
  if (text.indexOf('medicare') !== -1) return 'Medicare';
  if (text.indexOf('life') !== -1) return 'Life';
  if (text.indexOf('supplement') !== -1) return 'Supplemental';
  if (text.indexOf('health') !== -1 || text.indexOf('aca') !== -1) return 'Health';
  return 'Other';
}

function buildNote_(ev, email, tz) {
  var bits = ['Booked ' + Utilities.formatDate(ev.getStartTime(), tz, 'EEE d MMM, h:mm a')];
  if (email) bits.push('Contact on file in Calendar');
  var desc = (ev.getDescription() || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (desc) bits.push(desc.slice(0, 180));
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// Manual test — run this to confirm the sheet connection works
// ---------------------------------------------------------------------------
function testConnection() {
  var sh = getSheet_();
  Logger.log('Connected to: ' + sh.getParent().getName() + ' / ' + sh.getName());
  Logger.log('Rows currently: ' + Math.max(0, sh.getLastRow() - 1));
  var cal = CalendarApp.getDefaultCalendar();
  Logger.log('Calendar: ' + cal.getName());
  var soon = cal.getEvents(new Date(), new Date(Date.now() + 30 * 864e5));
  Logger.log('Events in next 30 days: ' + soon.length);
  var hits = 0;
  for (var i = 0; i < soon.length; i++) if (isBooking_(soon[i])) hits++;
  Logger.log('Of those, matching booking keywords: ' + hits);
}
