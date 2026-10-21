window.Pages = window.Pages || {};

Pages.dashboard = async function (ctx, view) {
  var user = ctx.user;
  var results = await Promise.all([Api.get('/reports/summary'), Api.get('/claims')]);
  var s = results[0], claims = results[1];
  var bs = s.byStatus || {};

  var intro = {
    CUSTOMER: 'Track your claims and policies in one place.',
    AGENT: 'Claims you have filed on behalf of your customers.',
    OFFICER: 'Your claims work queue and processing overview.',
    ADMIN: 'Organisation-wide overview of claims activity.'
  }[user.role];

  var actions = '';
  if (user.role === 'CUSTOMER' || user.role === 'AGENT') actions = '<a class="btn" href="#/claims/new">➕ File a claim</a>';
  if (user.role === 'OFFICER') actions = '<a class="btn" href="#/claims?status=SUBMITTED">Review new claims</a>';
  if (user.role === 'ADMIN') actions = '<a class="btn btn-outline" href="#/reports">View reports</a>';

  function stat(icon, cls, value, lbl) {
    return '<div class="card stat"><div class="stat-icon ' + cls + '">' + icon + '</div><div><div class="stat-value">' +
      value + '</div><div class="stat-label">' + lbl + '</div></div></div>';
  }

  var stats;
  if (user.role === 'OFFICER') {
    var mine = claims.filter(function (c) { return c.assignedOfficer === user.fullName && c.status === 'UNDER_REVIEW'; }).length;
    stats = stat('📥', 'bg-blue', bs.SUBMITTED || 0, 'New – awaiting review') +
      stat('🔎', 'bg-amber', mine, 'Under review by me') +
      stat('⏳', 'bg-red', bs.INFO_REQUESTED || 0, 'Waiting on customer') +
      stat('✅', 'bg-green', s.approvalRatePercent + '%', 'Approval rate');
  } else {
    stats = stat('📄', 'bg-blue', s.totalClaims, 'Total claims') +
      stat('⏳', 'bg-amber', s.openClaims, 'Open / in progress') +
      stat('💰', 'bg-teal', UI.money(s.totalClaimed), 'Total claimed') +
      stat('✅', 'bg-green', UI.money(s.totalApproved), 'Total approved');
  }

  var recent = claims.slice(0, 6);
  var rows = recent.length ? recent.map(function (c) {
    return '<tr class="clickable" data-id="' + c.id + '"><td><strong>' + UI.esc(c.claimNumber) + '</strong></td>' +
      '<td>' + UI.esc(c.productName) + '</td>' +
      (user.role === 'CUSTOMER' ? '' : '<td>' + UI.esc(c.customerName) + '</td>') +
      '<td>' + UI.esc(UI.label(c.claimType)) + '</td><td class="right">' + UI.money(c.claimedAmount) + '</td>' +
      '<td>' + UI.badge(c.status) + '</td><td class="nowrap">' + UI.date(c.updatedAt) + '</td></tr>';
  }).join('') : '<tr><td colspan="7" class="empty">No claims yet.</td></tr>';

  var attention = '';
  if (user.role === 'CUSTOMER' || user.role === 'AGENT') {
    var need = claims.filter(function (c) { return c.status === 'INFO_REQUESTED' || c.status === 'DRAFT'; });
    if (need.length) {
      attention = '<div class="alert alert-warn"><strong>Action needed:</strong> ' + need.map(function (c) {
        return '<a href="#/claims/' + c.id + '">' + UI.esc(c.claimNumber) + '</a> (' + UI.esc(UI.label(c.status)) + ')';
      }).join(', ') + '</div>';
    }
  }

  view.innerHTML =
    '<div class="page-head"><div><h1>Hello, ' + UI.esc(user.fullName.split(' ')[0]) + ' 👋</h1><p class="muted">' + intro + '</p></div>' +
    '<div class="btn-row">' + actions + '</div></div>' + attention +
    '<div class="grid grid-4">' + stats + '</div>' +
    '<div class="grid grid-2" style="margin-top:1.2rem">' +
    '  <div class="card"><div class="card-head"><h3>Claims by status</h3></div>' + UI.donut(bs, UI.STATUS_COLORS) + '</div>' +
    '  <div class="card"><div class="card-head"><h3>Claims filed – last 6 months</h3></div>' + UI.columnChart(s.byMonth) + '</div>' +
    '</div>' +
    '<div class="card" style="margin-top:1.2rem"><div class="card-head"><h3>Recent claims</h3><a href="#/claims">View all →</a></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Claim #</th><th>Product</th>' + (user.role === 'CUSTOMER' ? '' : '<th>Customer</th>') +
    '<th>Type</th><th class="right">Claimed</th><th>Status</th><th>Updated</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';

  view.querySelectorAll('tr[data-id]').forEach(function (tr) {
    tr.addEventListener('click', function () { Router.go('/claims/' + tr.getAttribute('data-id')); });
  });
};
