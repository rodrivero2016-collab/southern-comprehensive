/* Southern Comprehensive Insurance — site scripts */
(function () {
  'use strict';

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.navtoggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? '&#10005;' : '&#9776;';
    });
    document.addEventListener('click', function (e) {
      if (window.innerWidth <= 1024 && nav.classList.contains('open') &&
          !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '&#9776;';
      }
    });
  }

  /* ---------- Mark current page in nav ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var money = function (n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  };

  /* ---------- Life coverage calculator (DIME method) ---------- */
  var covForm = document.getElementById('coverage-calc');
  if (covForm) {
    covForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var num = function (id) {
        return parseFloat(document.getElementById(id).value) || 0;
      };
      var debt     = num('cc-debt');
      var income   = num('cc-income');
      var years    = num('cc-years');
      var mortgage = num('cc-mortgage');
      var kids     = num('cc-kids');
      var final    = num('cc-final');
      var savings  = num('cc-savings');

      var education = kids * 25000;          // conservative in-state estimate per child
      var incomeNeed = income * years;
      var gross = debt + incomeNeed + mortgage + education + final;
      var net = Math.max(gross - savings, 0);

      document.getElementById('cc-total').textContent = money(net);
      document.getElementById('cc-b-debt').textContent = money(debt);
      document.getElementById('cc-b-income').textContent = money(incomeNeed);
      document.getElementById('cc-b-mortgage').textContent = money(mortgage);
      document.getElementById('cc-b-edu').textContent = money(education);
      document.getElementById('cc-b-final').textContent = money(final);
      document.getElementById('cc-b-savings').textContent = '−' + money(savings);
      var out = document.getElementById('cc-output');
      out.classList.remove('hidden');
      out.setAttribute('tabindex', '-1');
      out.focus();
      out.scrollIntoView({ block: 'center' });
    });
  }

  /* ---------- Real-cost estimator ----------
     Illustrative 20-year level term rates per $1,000 of coverage, per month.
     THESE ARE EDUCATIONAL ESTIMATES ONLY — replace with your carriers'
     actual quoted rates before publishing. Not a quote or an offer.
  ------------------------------------------------------------------ */
  var RATES = {
    // age bracket : { m: male, f: female } — dollars per $1,000 of coverage, per month.
    // Illustrative 20-year level term, preferred non-tobacco. Sanity check: a 35-year-old
    // male at $500,000 lands near $29/month, which matches typical market pricing.
    25: { m: 0.048, f: 0.042 },
    30: { m: 0.052, f: 0.044 },
    35: { m: 0.058, f: 0.050 },
    40: { m: 0.076, f: 0.064 },
    45: { m: 0.120, f: 0.096 },
    50: { m: 0.184, f: 0.140 },
    55: { m: 0.300, f: 0.220 },
    60: { m: 0.490, f: 0.350 }
  };

  var costForm = document.getElementById('cost-calc');
  if (costForm) {
    costForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var age = parseInt(document.getElementById('ce-age').value, 10);
      var sex = document.getElementById('ce-sex').value;
      var amount = parseFloat(document.getElementById('ce-amount').value) || 0;
      var tobacco = document.getElementById('ce-tobacco').value === 'yes';

      var bracket = 25;
      Object.keys(RATES).forEach(function (k) {
        if (age >= parseInt(k, 10)) bracket = parseInt(k, 10);
      });
      var rate = RATES[bracket][sex];
      if (tobacco) rate *= 2.9;
      var monthly = (amount / 1000) * rate;

      document.getElementById('ce-total').textContent = '$' + monthly.toFixed(0);
      document.getElementById('ce-daily').textContent = '$' + (monthly / 30).toFixed(2);
      document.getElementById('ce-annual').textContent = money(monthly * 12);
      document.getElementById('ce-coffee').textContent = (monthly / 5.5).toFixed(1);
      var out = document.getElementById('ce-output');
      out.classList.remove('hidden');
      out.setAttribute('tabindex', '-1');
      out.focus();
      out.scrollIntoView({ block: 'center' });
    });
  }

  /* ---------- Contact / lead forms ----------
     Static site: no backend yet. Swap the action below for Formspree,
     Netlify Forms, or your CRM endpoint before launch.
  ------------------------------------------------------------------ */
  document.querySelectorAll('form[data-lead]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = f.querySelector('[data-lead-note]');
      if (note) {
        note.classList.remove('hidden');
        note.setAttribute('role', 'status');
        note.scrollIntoView({ block: 'center' });
      }
    });
  });
})();
