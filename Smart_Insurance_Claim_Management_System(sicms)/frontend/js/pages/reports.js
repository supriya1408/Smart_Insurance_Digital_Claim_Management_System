window.Pages = window.Pages || {};

Pages.reports = async function (ctx, view) {
  var s = await Api.get('/reports/summary');
  var bs = s.byStatus || {};
  function stat(icon, cls, v, l) {
    return '<div class="card stat"><div class="stat-icon ' + cls + '">' + icon + '</div><div><div class="stat-value">' + v + '</div><div class="stat-label">' + l + '</div></div></div>';
  }
  view.innerHTML =
    '<div class="page-head"><div><h1>Claims Reports</h1><p class="muted">Live figures calculated from the claims database.</p></div>' +
    '<div class="btn-row"><button class="btn" id="csv-btn">⬇ Export CSV</button><button class="btn btn-ghost" onclick="window.print()">🖨 Print</button></div></div>' +
    '<div class="grid grid-4">' +
    stat('📄', 'bg-blue', s.totalClaims, 'Total claims') +
    stat('✅', 'bg-green', s.approvalRatePercent + '%', 'Approval rate (decided claims)') +
    stat('⏱', 'bg-amber', s.avgDecisionDays + ' days', 'Avg. time to decision') +
    stat('💰', 'bg-teal', UI.money(s.totalApproved), 'Approved of ' + UI.money(s.totalClaimed) + ' claimed') +
    '</div>' +
    '<div class="grid grid-2" style="margin-top:1.2rem">' +
    ' <div class="card"><h3>By status</h3>' + UI.barChart(bs, function (k) { return UI.STATUS_COLORS[k]; }) + '</div>' +
    ' <div class="card"><h3>Status mix</h3>' + UI.donut(bs, UI.STATUS_COLORS) + '</div>' +
    ' <div class="card"><h3>By claim type</h3>' + UI.barChart(s.byType) + '</div>' +
    ' <div class="card"><h3>By product</h3>' + UI.barChart(s.byProduct) + '</div>' +
    ' <div class="card span-2"><h3>Claims filed per month (last 6 months)</h3>' + UI.columnChart(s.byMonth) + '</div>' +
    '</div>';

  view.querySelector('#csv-btn').addEventListener('click', function (e) {
    UI.busy(e.currentTarget, function () { return Api.download('/reports/claims.csv', 'claims-report.csv'); })
      .then(function () { UI.toast('CSV downloaded', 'success'); })
      .catch(function (err) { UI.toast(err.message, 'error'); });
  });
};
