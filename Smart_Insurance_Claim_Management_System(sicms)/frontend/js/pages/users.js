window.Pages = window.Pages || {};

Pages.users = async function (ctx, view) {
  var ROLES = ['CUSTOMER', 'AGENT', 'OFFICER', 'ADMIN'];
  view.innerHTML = '<div class="page-head"><div><h1>Users &amp; Roles</h1><p class="muted">Create staff accounts, change roles and activate / deactivate users.</p></div>' +
    '<div class="btn-row"><button class="btn" id="add-user">➕ Add user</button></div></div>' +
    '<div class="card"><div class="filters" style="margin-bottom:1rem"><input id="u-q" placeholder="Search name or email…">' +
    '<select id="u-role"><option value="">All roles</option>' + ROLES.map(function (r) { return '<option value="' + r + '">' + UI.label(r) + '</option>'; }).join('') + '</select></div>' +
    '<div class="table-wrap" id="u-table">' + UI.loader() + '</div></div>';

  var all = [];
  async function load() { all = await Api.get('/users'); draw(); }

  function draw() {
    var q = view.querySelector('#u-q').value.trim().toLowerCase();
    var role = view.querySelector('#u-role').value;
    var list = all.filter(function (u) {
      return (!role || u.role === role) && (!q || (u.fullName + ' ' + u.email).toLowerCase().indexOf(q) >= 0);
    });
    var me = ctx.user.id;
    view.querySelector('#u-table').innerHTML = '<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (u) {
        var self = u.id === me;
        return '<tr><td><strong>' + UI.esc(u.fullName) + '</strong>' + (self ? ' <span class="role-tag">You</span>' : '') + '</td><td>' + UI.esc(u.email) + '</td><td>' + UI.esc(u.phone || '—') + '</td>' +
          '<td><select data-role="' + u.id + '"' + (self ? ' disabled' : '') + ' style="width:auto">' + ROLES.map(function (r) {
            return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + UI.label(r) + '</option>';
          }).join('') + '</select></td>' +
          '<td>' + UI.badge(u.active ? 'ACTIVE' : 'INACTIVE') + '</td><td class="nowrap">' + UI.date(u.createdAt) + '</td>' +
          '<td>' + (self ? '' : '<button class="btn btn-ghost btn-sm" data-toggle="' + u.id + '" data-active="' + u.active + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button>') + '</td></tr>';
      }).join('') : '<tr><td colspan="7" class="empty">No users found.</td></tr>') + '</tbody></table>';

    view.querySelectorAll('[data-role]').forEach(function (s) {
      s.addEventListener('change', async function () {
        try { await Api.patch('/users/' + s.getAttribute('data-role'), { role: s.value }); UI.toast('Role updated', 'success'); await load(); }
        catch (e) { UI.toast(e.message, 'error'); await load(); }
      });
    });
    view.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var activate = b.getAttribute('data-active') !== 'true';
        try { await Api.patch('/users/' + b.getAttribute('data-toggle'), { active: activate }); UI.toast(activate ? 'User activated' : 'User deactivated', 'success'); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
      });
    });
  }

  view.querySelector('#u-q').addEventListener('input', draw);
  view.querySelector('#u-role').addEventListener('change', draw);
  view.querySelector('#add-user').addEventListener('click', function () {
    UI.modal('Add user', '<div id="m-err"></div><form id="u-form" class="form-grid">' +
      '<div class="field full"><label>Full name *</label><input name="fullName"></div>' +
      '<div class="field"><label>Email *</label><input name="email" type="email"></div>' +
      '<div class="field"><label>Phone</label><input name="phone"></div>' +
      '<div class="field"><label>Role *</label><select name="role">' + ROLES.map(function (r) { return '<option value="' + r + '"' + (r === 'OFFICER' ? ' selected' : '') + '>' + UI.label(r) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Temporary password *</label><input name="password" type="password" minlength="8"></div>' +
      '</form><div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="m-ok">Create user</button></div>',
      function (el, close) {
        el.querySelector('#m-ok').addEventListener('click', async function () {
          var d = UI.formData(el.querySelector('#u-form'));
          if (!d.fullName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || d.password.length < 8) {
            el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">Name, a valid email and a password of 8+ characters are required.</div>';
            return;
          }
          try { await Api.post('/users', d); UI.toast('User created', 'success'); close(); await load(); }
          catch (e) { el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">' + UI.esc(e.message) + '</div>'; }
        });
      });
  });

  await load();
};
