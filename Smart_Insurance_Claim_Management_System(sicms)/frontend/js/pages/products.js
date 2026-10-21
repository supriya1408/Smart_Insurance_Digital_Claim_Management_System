window.Pages = window.Pages || {};

Pages.products = async function (ctx, view) {
  var isAdmin = ctx.user.role === 'ADMIN';
  var CATEGORIES = ['HEALTH', 'MOTOR', 'LIFE', 'HOME', 'TRAVEL'];
  var ICON = { HEALTH: '🏥', MOTOR: '🚗', LIFE: '❤️', HOME: '🏠', TRAVEL: '✈️' };

  view.innerHTML = '<div class="page-head"><div><h1>Insurance Products</h1><p class="muted">Products offered by the company.</p></div>' +
    '<div class="btn-row">' + (isAdmin ? '<button class="btn" id="add-prod">➕ Add product</button>' : '') + '</div></div>' +
    '<div id="prod-grid">' + UI.loader() + '</div>';

  async function load() {
    var list = await Api.get('/products');
    if (!isAdmin) list = list.filter(function (p) { return p.active; });
    view.querySelector('#prod-grid').innerHTML = list.length ? '<div class="grid grid-3">' + list.map(function (p) {
      return '<div class="card"><div class="card-head"><h3>' + (ICON[p.category] || '📦') + ' ' + UI.esc(p.name) + '</h3>' +
        UI.badge(p.active ? 'ACTIVE' : 'INACTIVE') + '</div>' +
        '<p class="muted small" style="min-height:2.6em">' + UI.esc(p.description || '') + '</p>' +
        '<dl class="kv"><dt>Code</dt><dd>' + UI.esc(p.code) + '</dd><dt>Category</dt><dd>' + UI.esc(UI.label(p.category)) + '</dd>' +
        '<dt>Max coverage</dt><dd>' + UI.money(p.maxCoverage) + '</dd></dl>' +
        (isAdmin ? '<div class="form-actions"><button class="btn btn-outline btn-sm" data-edit="' + p.id + '">Edit</button></div>' : '') +
        '</div>';
    }).join('') + '</div>' : '<div class="card empty">No products.</div>';

    view.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        openForm(list.filter(function (p) { return String(p.id) === b.getAttribute('data-edit'); })[0]);
      });
    });
  }

  function openForm(p) {
    p = p || { active: true };
    UI.modal(p.id ? 'Edit product' : 'Add product',
      '<div id="m-err"></div><form id="prod-form" class="form-grid">' +
      '<div class="field"><label>Code *</label><input name="code" maxlength="30" value="' + UI.esc(p.code || '') + '"></div>' +
      '<div class="field"><label>Category *</label><select name="category">' + CATEGORIES.map(function (c) {
        return '<option value="' + c + '"' + (p.category === c ? ' selected' : '') + '>' + UI.label(c) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field full"><label>Name *</label><input name="name" value="' + UI.esc(p.name || '') + '"></div>' +
      '<div class="field full"><label>Description</label><textarea name="description" maxlength="500">' + UI.esc(p.description || '') + '</textarea></div>' +
      '<div class="field"><label>Max coverage (₹) *</label><input type="number" name="maxCoverage" min="1" value="' + UI.esc(p.maxCoverage || '') + '"></div>' +
      '<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" name="active"' + (p.active ? ' checked' : '') + '> Active</label></div>' +
      '</form><div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="m-ok">Save</button></div>',
      function (el, close) {
        el.querySelector('#m-ok').addEventListener('click', async function () {
          var d = UI.formData(el.querySelector('#prod-form'));
          if (!d.code || !d.name || !(Number(d.maxCoverage) > 0)) {
            el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">Code, name and a positive max coverage are required.</div>';
            return;
          }
          var body = { code: d.code, name: d.name, category: d.category, description: d.description, maxCoverage: Number(d.maxCoverage), active: d.active };
          try {
            if (p.id) await Api.put('/products/' + p.id, body); else await Api.post('/products', body);
            UI.toast('Product saved', 'success');
            close();
            await load();
          } catch (e) { el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">' + UI.esc(e.message) + '</div>'; }
        });
      });
  }

  if (isAdmin) view.querySelector('#add-prod').addEventListener('click', function () { openForm(null); });
  await load();
};
