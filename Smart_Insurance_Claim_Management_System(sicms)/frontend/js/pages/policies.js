window.Pages = window.Pages || {};

Pages.policies = async function (ctx, view) {
  var user = ctx.user;
  var canIssue = user.role === 'ADMIN' || user.role === 'AGENT';
  var title = user.role === 'CUSTOMER' ? 'My Policies' : 'Policies';

  view.innerHTML =
    '<div class="page-head"><div><h1>' + title + '</h1><p class="muted">' +
    (user.role === 'CUSTOMER' ? 'Policies you hold. You can file a claim against any active policy.' : 'Issue and view customer policies.') + '</p></div>' +
    '<div class="btn-row">' + (canIssue ? '<button class="btn" id="issue-btn">➕ Issue policy</button>' : '') + '</div></div>' +
    '<div class="card"><div class="filters" style="margin-bottom:1rem"><input id="p-q" placeholder="Search policy #, customer, product…"></div>' +
    '<div class="table-wrap" id="pol-table">' + UI.loader() + '</div></div>';

  var all = [];
  async function load() {
    all = await Api.get('/policies');
    draw();
  }

  function draw() {
    var q = view.querySelector('#p-q').value.trim().toLowerCase();
    var list = all.filter(function (p) {
      return !q || [p.policyNumber, p.customerName, p.productName, p.category].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    var rows = list.length ? list.map(function (p) {
      var actions = '';
      if (user.role === 'CUSTOMER' && p.status === 'ACTIVE') actions = '<a class="btn btn-outline btn-sm" href="#/claims/new">File claim</a>';
      if (user.role === 'ADMIN' && p.status === 'ACTIVE') actions = '<button class="btn btn-ghost btn-sm" data-cancel="' + p.id + '">Cancel</button>';
      return '<tr><td><strong>' + UI.esc(p.policyNumber) + '</strong></td>' +
        (user.role === 'CUSTOMER' ? '' : '<td>' + UI.esc(p.customerName) + '</td>') +
        '<td>' + UI.esc(p.productName) + '<div class="small muted">' + UI.esc(UI.label(p.category)) + '</div></td>' +
        '<td class="right">' + UI.money(p.sumInsured) + '</td><td class="right">' + UI.money(p.premium) + '</td>' +
        '<td class="nowrap">' + UI.date(p.startDate) + ' – ' + UI.date(p.endDate) + '</td>' +
        '<td>' + UI.badge(p.status) + '</td><td>' + actions + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="empty">No policies found.</td></tr>';
    view.querySelector('#pol-table').innerHTML =
      '<table><thead><tr><th>Policy #</th>' + (user.role === 'CUSTOMER' ? '' : '<th>Customer</th>') +
      '<th>Product</th><th class="right">Sum insured</th><th class="right">Premium</th><th>Period</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';

    view.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!(await UI.confirm('Cancel policy', 'Cancel this policy? No new claims can be filed against it.', 'Cancel policy', 'btn-danger'))) return;
        try {
          await Api.post('/policies/' + b.getAttribute('data-cancel') + '/cancel', {});
          UI.toast('Policy cancelled', 'success');
          await load();
        } catch (e) { UI.toast(e.message, 'error'); }
      });
    });
  }

  view.querySelector('#p-q').addEventListener('input', draw);

  if (canIssue) {
    view.querySelector('#issue-btn').addEventListener('click', async function () {
      var data;
      try { data = await Promise.all([Api.get('/users/customers'), Api.get('/products')]); }
      catch (e) { UI.toast(e.message, 'error'); return; }
      var customers = data[0], products = data[1].filter(function (p) { return p.active; });
      var start = UI.today();
      var end = new Date(); end.setFullYear(end.getFullYear() + 1); end.setDate(end.getDate() - 1);
      end = end.toISOString().slice(0, 10);

      UI.modal('Issue a new policy',
        '<div id="m-err"></div><form id="pol-form" class="form-grid">' +
        '<div class="field full"><label>Customer *</label><select name="customerId"><option value="">Select…</option>' +
        customers.map(function (c) { return '<option value="' + c.id + '">' + UI.esc(c.fullName + ' (' + c.email + ')') + '</option>'; }).join('') + '</select></div>' +
        '<div class="field full"><label>Product *</label><select name="productId" id="m-prod"><option value="">Select…</option>' +
        products.map(function (p) { return '<option value="' + p.id + '" data-max="' + p.maxCoverage + '">' + UI.esc(p.name + ' – max ' + UI.money(p.maxCoverage)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Sum insured (₹) *</label><input type="number" name="sumInsured" min="1"></div>' +
        '<div class="field"><label>Annual premium (₹) *</label><input type="number" name="premium" min="0"></div>' +
        '<div class="field"><label>Start date *</label><input type="date" name="startDate" value="' + start + '"></div>' +
        '<div class="field"><label>End date *</label><input type="date" name="endDate" value="' + end + '"></div>' +
        '</form><div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="m-ok">Issue policy</button></div>',
        function (el, close) {
          el.querySelector('#m-ok').addEventListener('click', async function (e) {
            var d = UI.formData(el.querySelector('#pol-form'));
            var opt = el.querySelector('#m-prod').selectedOptions[0];
            var err = [];
            if (!d.customerId) err.push('Select a customer');
            if (!d.productId) err.push('Select a product');
            if (!(Number(d.sumInsured) > 0)) err.push('Enter the sum insured');
            else if (opt && opt.dataset.max && Number(d.sumInsured) > Number(opt.dataset.max)) err.push('Sum insured exceeds product maximum');
            if (d.premium === '' || Number(d.premium) < 0) err.push('Enter the premium');
            if (!d.startDate || !d.endDate || d.endDate <= d.startDate) err.push('End date must be after start date');
            if (err.length) { el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">' + err.join('<br>') + '</div>'; return; }
            try {
              await UI.busy(e.currentTarget, async function () {
                var p = await Api.post('/policies', {
                  customerId: Number(d.customerId), productId: Number(d.productId), sumInsured: Number(d.sumInsured),
                  premium: Number(d.premium), startDate: d.startDate, endDate: d.endDate
                });
                UI.toast('Policy ' + p.policyNumber + ' issued', 'success');
              });
              close();
              await load();
            } catch (ex) { el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">' + UI.esc(ex.message) + '</div>'; }
          });
        });
    });
  }

  await load();
};
