/* =====================================================================
   Google sign-in + Calendar/Sheets access for Agent Tools.

   Uses Google Identity Services token flow. The access token lives in
   memory only — it is never written to localStorage — and expires after
   about an hour, at which point we ask for it again silently.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SCI_CONFIG || {};
  var SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' ');

  var token = null;
  var tokenExpiry = 0;
  var tokenClient = null;
  var listeners = [];

  function configured() {
    return !!(CFG.GOOGLE_CLIENT_ID && CFG.SHEET_ID);
  }

  function signedIn() {
    return !!token && Date.now() < tokenExpiry;
  }

  function onChange(fn) { listeners.push(fn); }
  function fire() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  function initClient() {
    if (tokenClient) return true;
    if (!window.google || !google.accounts || !google.accounts.oauth2) return false;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: function (resp) {
        if (resp && resp.access_token) {
          token = resp.access_token;
          tokenExpiry = Date.now() + ((resp.expires_in || 3600) - 60) * 1000;
        }
        var cb = tokenClient._pending;
        tokenClient._pending = null;
        if (cb) cb(resp && resp.access_token ? null : (resp && resp.error) || 'no token');
      },
      error_callback: function (err) {
        var cb = tokenClient._pending;
        tokenClient._pending = null;
        if (cb) cb((err && err.type) || 'popup blocked or closed');
      }
    });
    return true;
  }

  /* prompt:'' asks silently when a session already exists; 'consent' forces the dialog */
  function requestToken(interactive, done) {
    if (!configured()) { done('not configured'); return; }
    if (!initClient()) { done('Google library not loaded yet — reload the page.'); return; }
    tokenClient._pending = function (err) { fire(); done(err); };
    try {
      tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    } catch (e) {
      tokenClient._pending = null;
      done(e.message);
    }
  }

  function signIn(done) { requestToken(true, done || function () {}); }

  function signOut() {
    if (token && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(token); } catch (e) {}
    }
    token = null; tokenExpiry = 0; fire();
  }

  /* Ensure we have a live token, then run fn(err) */
  function withToken(fn) {
    if (signedIn()) { fn(null); return; }
    requestToken(false, function (err) {
      if (!err) { fn(null); return; }
      fn('Not signed in to Google.');
    });
  }

  function api(url, opts, done) {
    withToken(function (err) {
      if (err) { done(err); return; }
      opts = opts || {};
      opts.headers = opts.headers || {};
      opts.headers['Authorization'] = 'Bearer ' + token;
      if (opts.body) opts.headers['Content-Type'] = 'application/json';
      fetch(url, opts).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, json: j }; });
      }).then(function (res) {
        if (!res.ok) {
          var msg = (res.json && res.json.error && res.json.error.message) || ('HTTP ' + res.status);
          if (res.status === 401) { token = null; tokenExpiry = 0; msg = 'Session expired — sign in again.'; }
          if (res.status === 403) msg += ' (Check the Calendar and Sheets APIs are enabled.)';
          if (res.status === 404) msg += ' (Check the Sheet ID and tab name in config.js.)';
          done(msg);
        } else {
          done(null, res.json);
        }
      }).catch(function (e) { done(e.message); });
    });
  }

  /* ---------------- Calendar ---------------- */
  function upcomingEvents(days, done) {
    var now = new Date();
    var end = new Date(now.getTime() + (days || 14) * 864e5);
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(CFG.CALENDAR_ID || 'primary') + '/events' +
      '?timeMin=' + encodeURIComponent(now.toISOString()) +
      '&timeMax=' + encodeURIComponent(end.toISOString()) +
      '&singleEvents=true&orderBy=startTime&maxResults=100';
    api(url, null, function (err, data) {
      if (err) { done(err); return; }
      done(null, (data.items || []).map(function (e) {
        var s = e.start || {}, en = e.end || {};
        return {
          id: e.id,
          title: e.summary || '(no title)',
          start: s.dateTime || s.date,
          end: en.dateTime || en.date,
          allDay: !s.dateTime,
          guests: (e.attendees || []).filter(function (a) { return !a.self; })
                    .map(function (a) { return a.displayName || a.email; }),
          location: e.location || '',
          link: e.htmlLink || ''
        };
      }));
    });
  }

  /* ---------------- Sheets ---------------- */
  function sheetRange(a1) {
    return 'https://sheets.googleapis.com/v4/spreadsheets/' + CFG.SHEET_ID +
           '/values/' + encodeURIComponent((CFG.SHEET_TAB || 'Pipeline') + '!' + a1);
  }

  function readRows(done) {
    api(sheetRange('A1:J1000'), null, function (err, data) {
      if (err) { done(err); return; }
      var vals = data.values || [];
      if (!vals.length) { done(null, [], []); return; }
      var head = vals[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var rows = vals.slice(1).map(function (r, i) {
        var o = { _row: i + 2 };
        head.forEach(function (h, c) { o[h] = r[c] != null ? r[c] : ''; });
        return o;
      }).filter(function (o) { return o.name; });
      done(null, rows, head);
    });
  }

  function appendRow(values, done) {
    api(sheetRange('A1') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
        { method: 'POST', body: JSON.stringify({ values: [values] }) }, done);
  }

  function updateRow(rowNumber, values, done) {
    api(sheetRange('A' + rowNumber + ':J' + rowNumber) + '?valueInputOption=RAW',
        { method: 'PUT', body: JSON.stringify({ values: [values] }) }, done);
  }

  function clearRow(rowNumber, done) {
    api(sheetRange('A' + rowNumber + ':J' + rowNumber) + ':clear',
        { method: 'POST', body: '{}' }, done);
  }

  window.SCI_google = {
    configured: configured,
    signedIn: signedIn,
    signIn: signIn,
    signOut: signOut,
    onChange: onChange,
    upcomingEvents: upcomingEvents,
    readRows: readRows,
    appendRow: appendRow,
    updateRow: updateRow,
    clearRow: clearRow,
    cfg: CFG
  };
})();
