/* =====================================================================
   Agent Tools — Dashboard
   Pulls today's and this week's appointments from Google Calendar and
   combines them with pipeline stats from the Sheet.
   ===================================================================== */
(function () {
  'use strict';

  var events = null;
  var evError = null;
  var loading = false;

  function g() { return window.SCI_google; }
  function P() { return window.SCI_pipeline; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dayKey(iso) { return String(iso || '').slice(0, 10); }
  function timeOf(iso) {
    if (!iso || iso.length <= 10) return 'All day';
    var d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function dayLabel(k) {
    var d = new Date(k + 'T12:00:00');
    var t = today();
    if (k === t) return 'Today';
    var tm = new Date(new Date(t + 'T12:00:00').getTime() + 864e5).toISOString().slice(0, 10);
    if (k === tm) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function load(done) {
    if (!g() || !g().configured() || !g().signedIn()) { done && done(); return; }
    loading = true; evError = null; render();
    g().upcomingEvents(14, function (err, list) {
      loading = false;
      if (err) { evError = err; } else { events = list; }
      render();
      done && done();
    });
  }

  function render() {
    var host = document.getElementById('dashboard-view');
    if (!host) return;

    var rows = P() ? P().rows() : [];
    var t = today();

    var STAGES = [
      ['new', 'New Lead'], ['contacted', 'Contacted'], ['scheduled', 'Consult Booked'],
      ['applied', 'App Submitted'], ['enrolled', 'Enrolled'], ['closed', 'Not a Fit']
    ];
    var counts = {};
    STAGES.forEach(function (s) {
      counts[s[0]] = rows.filter(function (r) { return r.stage === s[0]; }).length;
    });
    var overdue = rows.filter(function (r) {
      return r.due && r.due < t && r.stage !== 'enrolled' && r.stage !== 'closed';
    });
    var dueToday = rows.filter(function (r) { return r.due === t; });
    var active = rows.filter(function (r) { return r.stage !== 'enrolled' && r.stage !== 'closed'; }).length;

    /* --- appointments --- */
    var apptHtml;
    if (!g() || !g().configured()) {
      apptHtml = '<div class="dcard"><h3>Appointments</h3>' +
        '<p class="small muted mb0">Not connected to Google yet. Finish <code>GOOGLE-SETUP.md</code> and ' +
        'fill in <code>agent-tools/config.js</code>.</p></div>';
    } else if (!g().signedIn()) {
      apptHtml = '<div class="dcard"><h3>Appointments</h3>' +
        '<p class="small muted">Sign in to Google to see your calendar.</p>' +
        '<button class="btn btn--primary btn--sm" id="d-signin">Sign in with Google</button></div>';
    } else if (loading) {
      apptHtml = '<div class="dcard"><h3>Appointments</h3><p class="small muted mb0">Loading…</p></div>';
    } else if (evError) {
      apptHtml = '<div class="dcard"><h3>Appointments</h3>' +
        '<p class="small mb0" style="color:#8C3A3A">' + esc(evError) + '</p></div>';
    } else {
      var list = events || [];
      var byDay = {};
      list.forEach(function (e) { (byDay[dayKey(e.start)] = byDay[dayKey(e.start)] || []).push(e); });
      var keys = Object.keys(byDay).sort().slice(0, 7);
      apptHtml = '<div class="dcard"><h3>Next 14 days <span class="dpill">' + list.length + '</span></h3>' +
        (keys.length ? keys.map(function (k) {
          return '<div class="dday"><h4>' + dayLabel(k) + '</h4>' +
            byDay[k].map(function (e) {
              return '<div class="dev">' +
                '<span class="dev__t">' + esc(timeOf(e.start)) + '</span>' +
                '<span class="dev__n">' + esc(e.title) +
                  (e.guests.length ? '<small>' + esc(e.guests.join(', ')) + '</small>' : '') +
                '</span></div>';
            }).join('') + '</div>';
        }).join('') : '<p class="small muted mb0">Nothing booked in the next two weeks.</p>') +
        '</div>';
    }

    /* --- needs attention --- */
    function actionRow(r, late) {
      return '<div class="dev">' +
        '<span class="dev__t' + (late ? ' dev__t--late' : '') + '">' + esc(r.due || '') + '</span>' +
        '<span class="dev__n">' + esc(r.name) +
          (r.action ? '<small>' + esc(r.action) + '</small>' : '') +
        '</span></div>';
    }
    var attention = overdue.concat(dueToday);
    var attHtml = '<div class="dcard"><h3>Needs attention' +
      (attention.length ? ' <span class="dpill dpill--red">' + attention.length + '</span>' : '') + '</h3>' +
      (attention.length
        ? (overdue.length ? '<div class="dday"><h4>Overdue</h4>' + overdue.map(function (r) { return actionRow(r, true); }).join('') + '</div>' : '') +
          (dueToday.length ? '<div class="dday"><h4>Due today</h4>' + dueToday.map(function (r) { return actionRow(r, false); }).join('') + '</div>' : '')
        : '<p class="small muted mb0">Nothing overdue. Good place to be.</p>') +
      '</div>';

    /* --- pipeline snapshot --- */
    var stageHtml = '<div class="dcard"><h3>Pipeline <span class="dpill">' + active + ' active</span></h3>' +
      '<div class="dstages">' + STAGES.map(function (s) {
        var n = counts[s[0]] || 0;
        var pct = rows.length ? Math.round(n / rows.length * 100) : 0;
        return '<div class="dstage"><span>' + s[1] + '</span>' +
          '<div class="dbar"><i style="width:' + pct + '%"></i></div>' +
          '<b>' + n + '</b></div>';
      }).join('') + '</div>' +
      '<button class="btn btn--ghost btn--sm mt2" id="d-open-pipeline">Open pipeline</button></div>';

    host.innerHTML =
      '<div class="phead"><div>' +
        '<p class="small muted mb0">' + new Date().toLocaleDateString('en-US',
          { weekday: 'long', month: 'long', day: 'numeric' }) + '</p></div>' +
        '<div class="btn-row"><button class="btn btn--ghost btn--sm" id="d-refresh">Refresh</button>' +
        (g() && g().cfg && g().cfg.BOOKING_URL
          ? '<a class="btn btn--primary btn--sm" href="' + esc(g().cfg.BOOKING_URL) +
            '" target="_blank" rel="noopener">Booking page</a>' : '') +
        '</div></div>' +
      '<div class="dgrid">' + apptHtml + attHtml + stageHtml + '</div>';

    var b;
    if ((b = document.getElementById('d-signin'))) {
      b.onclick = function () { g().signIn(function () { load(); if (P()) P().pull(); }); };
    }
    if ((b = document.getElementById('d-refresh'))) {
      b.onclick = function () { load(); if (P()) P().pull(); };
    }
    if ((b = document.getElementById('d-open-pipeline'))) {
      b.onclick = function () { if (window.SCI_showPipeline) window.SCI_showPipeline(); };
    }
  }

  window.SCI_dashboard = { render: render, load: load };
})();
