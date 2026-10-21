window.Pages = window.Pages || {};

Pages.audit = async function (ctx, view) {
  var list = await Api.get('/audit?limit=500');
  view.innerHTML = '<div class="page-head"><div><h1>Audit Log</h1><p class="muted">Latest 500 security and business events.</p></div></div>' +
    '<div class="card"><div class="filters" style="margin-bottom:1rem"><input id="a-q" placeholder="Filter by user, action, reference…"><span class="muted small" id="a-count"></span></div>' +
    '<div class="table-wrap" id="a-table"></div></div>';

  function draw() {
    var q = view.querySelector('#a-q').value.trim().toLowerCase();
    var rows = list.filter(function (a) {
      return !q || [a.actor, a.action, a.entityType, a.entityRef, a.details].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    view.querySelector('#a-count').textContent = rows.length + ' event(s)';
    view.querySelector('#a-table').innerHTML = '<table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th><th>Details</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (a) {
        return '<tr><td class="nowrap">' + UI.dateTime(a.timestamp) + '</td><td>' + UI.esc(a.actor) + '</td><td><strong>' + UI.esc(UI.label(a.action)) + '</strong></td>' +
          '<td>' + UI.esc(a.entityType || '') + '</td><td>' + UI.esc(a.entityRef || '') + '</td><td>' + UI.esc(a.details || '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">No events.</td></tr>') + '</tbody></table>';
  }
  view.querySelector('#a-q').addEventListener('input', draw);
  draw();
};
