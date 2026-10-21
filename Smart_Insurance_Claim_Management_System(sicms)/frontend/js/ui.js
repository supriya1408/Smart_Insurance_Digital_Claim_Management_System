/* Small UI helper library: escaping, formatting, toasts, modals, charts. */
window.UI = (function () {
  var cfg = window.SICMS_CONFIG;
  var moneyFmt = new Intl.NumberFormat(cfg.LOCALE, { style: 'currency', currency: cfg.CURRENCY, maximumFractionDigits: 0 });

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(v) { return v === null || v === undefined || v === '' ? '—' : moneyFmt.format(Number(v)); }
  function date(v) {
    if (!v) return '—';
    var d = new Date(v);
    return isNaN(d) ? esc(v) : d.toLocaleDateString(cfg.LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function dateTime(v) {
    if (!v) return '—';
    var d = new Date(v);
    return isNaN(d) ? esc(v) : d.toLocaleString(cfg.LOCALE, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function today() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function label(s) {
    if (!s) return '';
    return String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function badge(status) {
    return '<span class="badge st-' + esc(status) + '">' + esc(label(status)) + '</span>';
  }
  function fileSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function initials(name) {
    return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }

  function toast(msg, type) {
    var box = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, type === 'error' ? 6000 : 3500);
  }

  function loader() { return '<div class="loader"><div class="spinner"></div></div>'; }

  /** Opens a modal. `body` is HTML; onMount(el, close) wires up events. Returns close(). */
  function modal(title, body, onMount) {
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h2>' + esc(title) + '</h2>' + body + '</div>';
    function close() { bd.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bd);
    bd.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    if (onMount) onMount(bd.querySelector('.modal'), close);
    var first = bd.querySelector('input, select, textarea');
    if (first) first.focus();
    return close;
  }

  function confirmBox(title, message, okText, okClass) {
    return new Promise(function (resolve) {
      modal(title, '<p>' + esc(message) + '</p><div class="form-actions">' +
        '<button class="btn btn-ghost" data-close>Cancel</button>' +
        '<button class="btn ' + (okClass || '') + '" id="cf-ok">' + esc(okText || 'OK') + '</button></div>',
        function (el, close) {
          el.querySelector('#cf-ok').addEventListener('click', function () { close(); resolve(true); });
          el.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { resolve(false); }); });
        });
    });
  }

  /** Reads all named inputs of a form into an object. */
  function formData(form) {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value.trim();
    });
    return o;
  }

  /** Disables a button while an async action runs. */
  async function busy(btn, fn) {
    var txt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Please wait…'; }
    try { return await fn(); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = txt; } }
  }

  // ---------------- Charts (no library) ----------------
  var PALETTE = ['#1f4e9c', '#0aa38f', '#e0a100', '#d64545', '#2f80ed', '#8e5bd6', '#1e9e5a', '#f2994a', '#56ccf2'];
  var STATUS_COLORS = {
    DRAFT: '#9aa3b5', SUBMITTED: '#2f80ed', UNDER_REVIEW: '#e0a100', INFO_REQUESTED: '#f2994a',
    APPROVED: '#1e9e5a', REJECTED: '#d64545', SETTLED: '#0aa38f', CLOSED: '#6c5ccf'
  };

  function barChart(map, colorFn) {
    var keys = Object.keys(map || {});
    if (!keys.length) return '<p class="empty">No data yet</p>';
    var max = Math.max.apply(null, keys.map(function (k) { return map[k]; }).concat([1]));
    return '<div class="bar-chart">' + keys.map(function (k, i) {
      var pct = (map[k] / max) * 100;
      var color = colorFn ? colorFn(k, i) : PALETTE[i % PALETTE.length];
      return '<div class="bar-row"><span title="' + esc(k) + '">' + esc(label(k)) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<strong class="right">' + map[k] + '</strong></div>';
    }).join('') + '</div>';
  }

  function columnChart(map) {
    var keys = Object.keys(map || {});
    if (!keys.length) return '<p class="empty">No data yet</p>';
    var max = Math.max.apply(null, keys.map(function (k) { return map[k]; }).concat([1]));
    return '<div class="col-chart">' + keys.map(function (k) {
      var h = (map[k] / max) * 100;
      var lbl = k;
      var m = /^(\d{4})-(\d{2})$/.exec(k);
      if (m) lbl = new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(cfg.LOCALE, { month: 'short', year: '2-digit' });
      return '<div class="col"><span class="v">' + map[k] + '</span><div class="bar" style="height:' + h + '%"></div><span class="l">' + esc(lbl) + '</span></div>';
    }).join('') + '</div>';
  }

  function donut(map, colors) {
    var keys = Object.keys(map || {}).filter(function (k) { return map[k] > 0; });
    var total = keys.reduce(function (s, k) { return s + map[k]; }, 0);
    if (!total) return '<p class="empty">No data yet</p>';
    var r = 60, c = 2 * Math.PI * r, offset = 0;
    var arcs = keys.map(function (k, i) {
      var len = (map[k] / total) * c;
      var col = (colors && colors[k]) || PALETTE[i % PALETTE.length];
      var s = '<circle r="' + r + '" cx="80" cy="80" fill="none" stroke="' + col + '" stroke-width="26" ' +
        'stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 80 80)"><title>' +
        esc(label(k)) + ': ' + map[k] + '</title></circle>';
      offset += len;
      return s;
    }).join('');
    var legend = keys.map(function (k, i) {
      var col = (colors && colors[k]) || PALETTE[i % PALETTE.length];
      return '<li><span class="sw" style="background:' + col + '"></span>' + esc(label(k)) + ' <strong>' + map[k] + '</strong></li>';
    }).join('');
    return '<div class="donut-wrap"><svg width="160" height="160" viewBox="0 0 160 160">' + arcs +
      '<text x="80" y="78" text-anchor="middle" font-size="24" font-weight="700" fill="#1d2433">' + total + '</text>' +
      '<text x="80" y="98" text-anchor="middle" font-size="11" fill="#6b7489">claims</text></svg>' +
      '<ul class="legend">' + legend + '</ul></div>';
  }

  return {
    esc: esc, money: money, date: date, dateTime: dateTime, today: today, label: label, badge: badge,
    fileSize: fileSize, initials: initials, toast: toast, loader: loader, modal: modal, confirm: confirmBox,
    formData: formData, busy: busy, barChart: barChart, columnChart: columnChart, donut: donut,
    STATUS_COLORS: STATUS_COLORS
  };
})();
