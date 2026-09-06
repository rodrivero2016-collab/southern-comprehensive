/* =====================================================================
   Southern Comprehensive Insurance — Pipeline Tracker
   
   DESIGN RULE: this stores NO personally identifiable information.
   First name + last initial only. No phone, no email, no date of birth,
   no medications, no Medicare numbers, no health details. Those belong
   in a real system with proper security. The field set and the on-screen
   hints are deliberately built to keep it that way.

   Data lives in this browser's localStorage. It is not synced, not
   backed up, and not shared. Export to CSV regularly.
   ===================================================================== */
(function () {
  'use strict';

  var STORE = 'sci_pipeline_v1';

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  var STAGES = [
    { id: 'new',       label: 'New Lead',        color: '#6B7688' },
    { id: 'contacted', label: 'Contacted',       color: '#0B3F8A' },
    { id: 'scheduled', label: 'Consult Booked',  color: '#426C34' },
    { id: 'applied',   label: 'App Submitted',   color: '#8A6D0B' },
    { id: 'enrolled',  label: 'Enrolled',        color: '#365A2A' },
    { id: 'closed',    label: 'Not a Fit',       color: '#8C3A3A' }
  ];

  var COVERAGE = ['Medicare', 'Health', 'Life', 'Supplemental', 'Other'];

  /* ---------- storage ----------
     Two backends. If Google is configured and signed in, the Sheet is the
     source of truth and localStorage is just an offline cache. If not, we
     fall back to localStorage alone so the tool still works.
  ------------------------------------------------------------------ */
  function g() { return window.SCI_google; }
  function useSheet() { return g() && g().configured() && g().signedIn(); }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(STORE)) || []; }
    catch (e) { return []; }
  }
  function saveLocal(r) {
    try { localStorage.setItem(STORE, JSON.stringify(r)); } catch (e) {}
  }

  var COLS = ['id','name','county','coverage','stage','action','due','notes','updated','source'];

  function toRow(r) {
    return COLS.map(function (c) { return r[c] == null ? '' : r[c]; });
  }
  function fromSheet(o) {
    return {
      id: o.id || uid(), name: o.name || '', county: o.county || '',
      coverage: o.coverage || 'Other', stage: normStage(o.stage), action: o.action || '',
      due: /^\d{4}-\d{2}-\d{2}$/.test(o.due) ? o.due : '',
      notes: o.notes || '', updated: o.updated || today(), source: o.source || 'manual',
      _row: o._row
    };
  }
  function normStage(v) {
    v = String(v || '').toLowerCase().trim();
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === v || STAGES[i].label.toLowerCase() === v) return STAGES[i].id;
    }
    return 'new';
  }

  var rows = loadLocal();
  var syncing = false;
  var syncError = null;

  /* Pull everything from the Sheet and refresh the view */
  function pull(done) {
    if (!useSheet()) { done && done(); return; }
    syncing = true; syncError = null; render();
    g().readRows(function (err, sheetRows) {
      syncing = false;
      if (err) { syncError = err; render(); done && done(err); return; }
      rows = sheetRows.map(fromSheet);
      saveLocal(rows);
      render();
      done && done();
    });
  }

  function pushNew(rec, done) {
    if (!useSheet()) { done && done(); return; }
    g().appendRow(toRow(rec), function (err) { if (err) { syncError = err; render(); } done && done(err); });
  }
  function pushUpdate(rec, done) {
    if (!useSheet() || !rec._row) { done && done(); return; }
    g().updateRow(rec._row, toRow(rec), function (err) { if (err) { syncError = err; render(); } done && done(err); });
  }
  function pushDelete(rec, done) {
    if (!useSheet() || !rec._row) { done && done(); return; }
    g().clearRow(rec._row, function (err) { if (err) { syncError = err; render(); } done && done(err); });
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stageOf(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
    return STAGES[0];
  }
  function isOverdue(r) {
    return r.due && r.due < today() && r.stage !== 'enrolled' && r.stage !== 'closed';
  }
  function daysUntil(d) {
    if (!d) return null;
    return Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
  }

  /* ---------- CSV ---------- */
  var CSV_COLS = ['name', 'county', 'coverage', 'stage', 'action', 'due', 'notes', 'updated'];

  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCSV() {
    var out = [CSV_COLS.join(',')];
    rows.forEach(function (r) {
      out.push(CSV_COLS.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    return out.join('\r\n');
  }

  /* RFC4180-ish parser: handles quoted fields, escaped quotes, embedded commas */
  function parseCSV(text) {
    var out = [], row = [], cur = '', inQ = false, i = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cur += ch; i++; continue;
      }
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === ',') { row.push(cur); cur = ''; i++; continue; }
      if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; i++; continue; }
      cur += ch; i++;
    }
    if (cur !== '' || row.length) { row.push(cur); out.push(row); }
    return out.filter(function (r) { return r.length && r.join('').trim() !== ''; });
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- rendering ---------- */
  function visible() {
    var q = search.trim().toLowerCase();
    return rows.filter(function (r) {
      if (filterStage !== 'all' && r.stage !== filterStage) return false;
      if (!q) return true;
      return (r.name + ' ' + r.county + ' ' + r.coverage + ' ' + r.action + ' ' + r.notes)
        .toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      var ao = isOverdue(a) ? 0 : 1, bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (a.due && b.due) return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
      if (a.due) return -1;
      if (b.due) return 1;
      return (b.updated || '').localeCompare(a.updated || '');
    });
  }

  function syncPanel() {
    if (!g() || !g().configured()) {
      return '<div class="panel panel--warn" style="margin-top:22px">' +
        '<h4>Not connected to Google yet</h4>' +
        '<p class="mb0">This pipeline lives in this browser only &mdash; not synced, not backed up, not on ' +
        'your phone. Finish <code>GOOGLE-SETUP.md</code> and fill in <code>agent-tools/config.js</code> to ' +
        'store it in a Google Sheet instead. <strong>Until then, export to CSV weekly.</strong></p></div>';
    }
    if (!g().signedIn()) {
      return '<div class="panel panel--warn" style="margin-top:22px">' +
        '<h4>Signed out of Google</h4>' +
        '<p class="mb0">Showing the last copy saved in this browser. Sign in from the sidebar to load ' +
        'live data from your Sheet and save changes back to it.</p></div>';
    }
    if (syncError) {
      return '<div class="panel panel--warn" style="margin-top:22px">' +
        '<h4>Sync problem</h4><p class="mb0">' + esc(syncError) + '</p></div>';
    }
    return '<div class="panel panel--green" style="margin-top:22px">' +
      '<h4>Synced to Google Sheets</h4>' +
      '<p class="mb0">Changes save to your Sheet, so they are backed up and readable on your phone. ' +
      'Bookings from your calendar appear here automatically.' +
      (syncing ? ' <em>Syncing\u2026</em>' : '') + '</p></div>';
  }

  function render() {
    var host = document.getElementById('pipeline-view');
    if (!host) return;

    var counts = { all: rows.length };
    STAGES.forEach(function (s) {
      counts[s.id] = rows.filter(function (r) { return r.stage === s.id; }).length;
    });
    var overdue = rows.filter(isOverdue).length;
    var list = visible();

    var chips = '<button class="pchip' + (filterStage === 'all' ? ' active' : '') +
      '" data-stage="all">All <b>' + counts.all + '</b></button>' +
      STAGES.map(function (s) {
        return '<button class="pchip' + (filterStage === s.id ? ' active' : '') +
          '" data-stage="' + s.id + '"><i style="background:' + s.color + '"></i>' +
          s.label + ' <b>' + counts[s.id] + '</b></button>';
      }).join('');

    var body = list.length ? list.map(function (r) {
      var st = stageOf(r.stage);
      var od = isOverdue(r);
      var d = daysUntil(r.due);
      var when = !r.due ? '<span class="muted">&mdash;</span>'
        : od ? '<span class="pdue pdue--late">' + r.due + ' &middot; ' + Math.abs(d) + 'd late</span>'
        : d === 0 ? '<span class="pdue pdue--now">Today</span>'
        : '<span class="pdue">' + r.due + '</span>';
      return '<tr' + (od ? ' class="row--late"' : '') + '>' +
        '<td><strong>' + esc(r.name) + '</strong>' +
          (r.notes ? '<div class="small muted">' + esc(r.notes) + '</div>' : '') + '</td>' +
        '<td class="small">' + esc(r.county || '&mdash;') + '</td>' +
        '<td class="small">' + esc(r.coverage) + '</td>' +
        '<td><span class="pstage" style="background:' + st.color + '">' + st.label + '</span></td>' +
        '<td class="small">' + esc(r.action || '&mdash;') + '</td>' +
        '<td class="small">' + when + '</td>' +
        '<td class="pact">' +
          '<button data-brief="' + r.id + '" title="Send to Lead Qualifier">&#9993;</button>' +
          '<button data-edit="' + r.id + '" title="Edit">&#9998;</button>' +
          '<button data-del="' + r.id + '" title="Delete">&#10005;</button>' +
        '</td></tr>';
    }).join('') :
      '<tr><td colspan="7" class="pempty">' +
      (rows.length ? 'Nothing matches that filter.' : 'No leads yet. Click <strong>Add Lead</strong> to start.') +
      '</td></tr>';

    host.innerHTML =
      '<div class="phead">' +
        '<div>' +
          '<p class="small muted mb0">' + rows.length + ' leads' +
            (overdue ? ' &middot; <strong style="color:#8C3A3A">' + overdue + ' overdue</strong>' : '') +
          '</p>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn--primary btn--sm" id="p-add">+ Add Lead</button>' +
          '<button class="btn btn--ghost btn--sm" id="p-export">Export CSV</button>' +
          '<button class="btn btn--ghost btn--sm" id="p-import">Import</button>' +
        '</div>' +
      '</div>' +
      '<div class="pchips">' + chips + '</div>' +
      '<div class="psearch"><input type="search" id="p-search" placeholder="Search name, county, coverage, notes…" value="' + esc(search) + '"></div>' +
      '<div class="table-wrap"><table><thead><tr>' +
        '<th>Lead</th><th>County</th><th>Coverage</th><th>Stage</th><th>Next Action</th><th>Due</th><th></th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      syncPanel();

    /* events */
    host.querySelectorAll('.pchip').forEach(function (b) {
      b.onclick = function () { filterStage = b.dataset.stage; render(); };
    });
    var si = document.getElementById('p-search');
    si.oninput = function () {
      search = si.value;
      var pos = si.selectionStart;
      render();
      var ni = document.getElementById('p-search');
      ni.focus(); ni.setSelectionRange(pos, pos);
    };
    document.getElementById('p-add').onclick = function () { form(null); };
    document.getElementById('p-export').onclick = function () {
      download('sci-pipeline-' + today() + '.csv', toCSV());
    };
    document.getElementById('p-import').onclick = importCSV;
    host.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function () { form(b.dataset.edit); };
    });
    host.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var r = rows.filter(function (x) { return x.id === b.dataset.del; })[0];
        if (r && confirm('Delete "' + r.name + '"? This cannot be undone.')) {
          rows = rows.filter(function (x) { return x.id !== b.dataset.del; });
          saveLocal(rows); render();
          pushDelete(r, function () { pull(); });
        }
      };
    });
    host.querySelectorAll('[data-brief]').forEach(function (b) {
      b.onclick = function () {
        var r = rows.filter(function (x) { return x.id === b.dataset.brief; })[0];
        if (r && window.SCI_sendToAgent) {
          window.SCI_sendToAgent('qualifier',
            'Brief me on this lead before I call.\n\n' +
            'Name: ' + r.name + '\nCounty: ' + r.county + '\nCoverage: ' + r.coverage +
            '\nStage: ' + stageOf(r.stage).label + '\nNext action: ' + (r.action || '(none set)') +
            '\nDue: ' + (r.due || '(none)') + '\nNotes: ' + (r.notes || '(none)'));
        }
      };
    });
  }

  /* ---------- add / edit form ---------- */
  function form(id) {
    var r = id ? rows.filter(function (x) { return x.id === id; })[0] : null;
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML =
      '<div class="modal__box">' +
        '<h2 class="mt0">' + (r ? 'Edit lead' : 'Add lead') + '</h2>' +
        '<div class="field"><label for="f-name">Name <span class="hint">First name and last initial only ' +
          '&mdash; e.g. "Marcus T." Do not enter full names or contact details.</span></label>' +
          '<input type="text" id="f-name" value="' + esc(r ? r.name : '') + '" required></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="f-county">County</label>' +
            '<input type="text" id="f-county" placeholder="e.g. DeKalb" value="' + esc(r ? r.county : '') + '"></div>' +
          '<div class="field"><label for="f-cov">Coverage</label><select id="f-cov">' +
            COVERAGE.map(function (c) {
              return '<option' + (r && r.coverage === c ? ' selected' : '') + '>' + c + '</option>';
            }).join('') + '</select></div>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="f-stage">Stage</label><select id="f-stage">' +
            STAGES.map(function (s) {
              return '<option value="' + s.id + '"' + (r && r.stage === s.id ? ' selected' : '') + '>' +
                s.label + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field"><label for="f-due">Next action due</label>' +
            '<input type="date" id="f-due" value="' + esc(r ? r.due : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label for="f-action">Next action</label>' +
          '<input type="text" id="f-action" placeholder="e.g. Call back re: Part D formulary" value="' +
          esc(r ? r.action : '') + '"></div>' +
        '<div class="field"><label for="f-notes">Notes <span class="hint">No medical details, Social Security ' +
          'numbers, Medicare numbers, or contact information.</span></label>' +
          '<textarea id="f-notes" style="min-height:80px">' + esc(r ? r.notes : '') + '</textarea></div>' +
        '<div class="btn-row"><button class="btn btn--primary" id="f-save">Save</button>' +
          '<button class="btn btn--ghost" id="f-cancel">Cancel</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.getElementById('f-name').focus();

    wrap.querySelector('#f-save').onclick = function () {
      var name = document.getElementById('f-name').value.trim();
      if (!name) { alert('Name is required.'); return; }
      var rec = {
        id: r ? r.id : uid(),
        name: name,
        county: document.getElementById('f-county').value.trim(),
        coverage: document.getElementById('f-cov').value,
        stage: document.getElementById('f-stage').value,
        action: document.getElementById('f-action').value.trim(),
        due: document.getElementById('f-due').value,
        notes: document.getElementById('f-notes').value.trim(),
        updated: today()
      };
      if (r) {
        rec._row = r._row;
        rows = rows.map(function (x) { return x.id === r.id ? rec : x; });
        saveLocal(rows); wrap.remove(); render();
        pushUpdate(rec, function () { pull(); });
      } else {
        rec.source = 'manual';
        rows.unshift(rec);
        saveLocal(rows); wrap.remove(); render();
        pushNew(rec, function () { pull(); });
      }
    };
    wrap.querySelector('#f-cancel').onclick = function () { wrap.remove(); };
    wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };
  }

  /* ---------- import ---------- */
  function importCSV() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,text/csv';
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var grid = parseCSV(rd.result);
        if (!grid.length) { alert('That file looks empty.'); return; }
        var head = grid[0].map(function (h) { return h.trim().toLowerCase(); });
        var idx = {};
        CSV_COLS.forEach(function (c) { idx[c] = head.indexOf(c); });
        if (idx.name === -1) {
          alert('No "name" column found. Export a CSV first to see the expected format.');
          return;
        }
        var added = grid.slice(1).map(function (g) {
          var get = function (c) { return idx[c] > -1 ? (g[idx[c]] || '').trim() : ''; };
          var stage = get('stage').toLowerCase();
          var match = STAGES.filter(function (s) {
            return s.id === stage || s.label.toLowerCase() === stage;
          })[0];
          return {
            id: uid(),
            name: get('name'),
            county: get('county'),
            coverage: COVERAGE.indexOf(get('coverage')) > -1 ? get('coverage') : 'Other',
            stage: match ? match.id : 'new',
            action: get('action'),
            due: /^\d{4}-\d{2}-\d{2}$/.test(get('due')) ? get('due') : '',
            notes: get('notes'),
            updated: today()
          };
        }).filter(function (r) { return r.name; });
        if (!added.length) { alert('No rows with a name were found.'); return; }
        if (confirm('Import ' + added.length + ' lead(s)? They will be added to your existing ' +
                    rows.length + '.')) {
          rows = added.concat(rows);
          saveLocal(rows); render();
          if (useSheet()) {
            var q = added.slice();
            (function next() {
              if (!q.length) { pull(); return; }
              pushNew(q.shift(), next);
            })();
          }
        }
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  window.SCI_pipeline = { render: render, pull: pull, rows: function () { return rows; } };
})();
