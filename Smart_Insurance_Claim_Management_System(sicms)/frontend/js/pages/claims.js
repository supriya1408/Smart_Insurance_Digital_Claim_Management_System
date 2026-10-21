window.Pages = window.Pages || {};

Pages.claims = async function (ctx, view) {
  var user = ctx.user;
  var STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED', 'REJECTED', 'SETTLED', 'CLOSED'];
  if (user.role === 'OFFICER') STATUSES = STATUSES.slice(1);
  var title = { CUSTOMER: 'My Claims', AGENT: 'Claims Filed', OFFICER: 'Claims Queue', ADMIN: 'All Claims' }[user.role];
  var showCustomer = user.role !== 'CUSTOMER';
  var showOfficer = user.role === 'OFFICER' || user.role === 'ADMIN';

  view.innerHTML =
    '<div class="page-head"><div><h1>' + title + '</h1><p class="muted">Click a row to open the claim.</p></div>' +
    '<div class="btn-row">' + (user.role === 'CUSTOMER' || user.role === 'AGENT' ? '<a class="btn" href="#/claims/new">➕ File a claim</a>' : '') + '</div></div>' +
    '<div class="card">' +
    '  <div class="filters" style="margin-bottom:1rem">' +
    '    <input id="f-q" placeholder="Search claim #, policy #, customer, type…" value="' + UI.esc(ctx.query.q || '') + '">' +
    '    <select id="f-status"><option value="">All statuses</option>' + STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (ctx.query.status === s ? ' selected' : '') + '>' + UI.label(s) + '</option>';
    }).join('') + '</select>' +
    (user.role === 'OFFICER' ? '<label class="check"><input type="checkbox" id="f-mine"' + (ctx.query.mine === 'true' ? ' checked' : '') + '> Assigned to me</label>' : '') +
    '    <span class="muted small" id="f-count"></span>' +
    '  </div>' +
    '  <div class="table-wrap" id="claims-table">' + UI.loader() + '</div>' +
    '</div>';

  var qEl = view.querySelector('#f-q'), stEl = view.querySelector('#f-status'), mineEl = view.querySelector('#f-mine');
  var timer;

  async function load() {
    var params = [];
    if (qEl.value.trim()) params.push('q=' + encodeURIComponent(qEl.value.trim()));
    if (stEl.value) params.push('status=' + stEl.value);
    if (mineEl && mineEl.checked) params.push('mine=true');
    var list = await Api.get('/claims' + (params.length ? '?' + params.join('&') : ''));
    view.querySelector('#f-count').textContent = list.length + ' claim(s)';
    var cols = 7 + (showCustomer ? 1 : 0) + (showOfficer ? 1 : 0);
    var rows = list.length ? list.map(function (c) {
      return '<tr class="clickable" data-id="' + c.id + '">' +
        '<td><strong>' + UI.esc(c.claimNumber) + '</strong><div class="small muted">' + UI.esc(c.policyNumber) + '</div></td>' +
        (showCustomer ? '<td>' + UI.esc(c.customerName) + '</td>' : '') +
        '<td>' + UI.esc(c.productName) + '</td>' +
        '<td>' + UI.esc(UI.label(c.claimType)) + '</td>' +
        '<td class="nowrap">' + UI.date(c.incidentDate) + '</td>' +
        '<td class="right">' + UI.money(c.claimedAmount) + '</td>' +
        '<td class="right">' + UI.money(c.approvedAmount) + '</td>' +
        '<td>' + UI.badge(c.status) + '</td>' +
        (showOfficer ? '<td>' + UI.esc(c.assignedOfficer || '—') + '</td>' : '') +
        '</tr>';
    }).join('') : '<tr><td colspan="' + cols + '" class="empty">No claims match your filters.</td></tr>';

    view.querySelector('#claims-table').innerHTML =
      '<table><thead><tr><th>Claim #</th>' + (showCustomer ? '<th>Customer</th>' : '') +
      '<th>Product</th><th>Type</th><th>Incident</th><th class="right">Claimed</th><th class="right">Approved</th><th>Status</th>' +
      (showOfficer ? '<th>Officer</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>';
    view.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function () { Router.go('/claims/' + tr.getAttribute('data-id')); });
    });
  }

  function safeLoad() { load().catch(function (e) { UI.toast(e.message, 'error'); }); }
  qEl.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(safeLoad, 300); });
  stEl.addEventListener('change', safeLoad);
  if (mineEl) mineEl.addEventListener('change', safeLoad);
  await load();
};
