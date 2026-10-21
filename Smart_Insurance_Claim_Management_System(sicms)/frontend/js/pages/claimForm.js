window.Pages = window.Pages || {};

/** New claim (#/claims/new) and edit draft / info-requested claim (#/claims/:id/edit). */
Pages.claimForm = async function (ctx, view) {
  var user = ctx.user;
  var editing = !!ctx.params.id;
  var types = await Api.get('/claims/types');
  var existing = null, policies = [], customers = [];

  if (editing) {
    existing = await Api.get('/claims/' + ctx.params.id);
    if (existing.allowedActions.indexOf('EDIT') < 0) {
      view.innerHTML = '<div class="card"><div class="alert alert-error">This claim can no longer be edited.</div>' +
        '<a class="btn btn-outline" href="#/claims/' + existing.summary.id + '">Back to claim</a></div>';
      return;
    }
    policies = [existing.policy];
  } else if (user.role === 'AGENT') {
    customers = await Api.get('/users/customers');
  } else {
    policies = (await Api.get('/policies')).filter(function (p) { return p.status === 'ACTIVE'; });
  }

  var s = existing ? existing.summary : {};
  var title = editing ? 'Edit claim ' + s.claimNumber : 'File a new claim';

  function policyOptions(list) {
    if (!list.length) return '<option value="">No active policies</option>';
    return '<option value="">Select a policy…</option>' + list.map(function (p) {
      return '<option value="' + p.id + '">' + UI.esc(p.policyNumber + ' – ' + p.productName) + '</option>';
    }).join('');
  }

  view.innerHTML =
    '<div class="page-head"><div><h1>' + UI.esc(title) + '</h1><p class="muted">' +
    (editing && s.status === 'INFO_REQUESTED' ? 'The claims officer asked for more information. Update the details and/or upload documents, then resubmit.' :
      'Fill in the incident details. You can save a draft or submit straight away.') + '</p></div></div>' +
    (editing && existing.remarks && s.status === 'INFO_REQUESTED' ? '<div class="alert alert-warn"><strong>Officer’s request:</strong> ' + UI.esc(existing.remarks) + '</div>' : '') +
    '<div class="grid grid-3">' +
    ' <div class="card span-2"><form id="claim-form" novalidate><div id="form-error"></div><div class="form-grid">' +
    (user.role === 'AGENT' && !editing ?
      '<div class="field full"><label>Customer *</label><select name="customerId" id="customer-select"><option value="">Select a customer…</option>' +
      customers.map(function (c) { return '<option value="' + c.id + '">' + UI.esc(c.fullName + ' (' + c.email + ')') + '</option>'; }).join('') +
      '</select></div>' : '') +
    '  <div class="field full"><label>Policy *</label><select name="policyId" id="policy-select"' + (editing ? ' disabled' : '') + '>' +
    (user.role === 'AGENT' && !editing ? '<option value="">Select a customer first</option>' : policyOptions(policies)) + '</select></div>' +
    '  <div class="field"><label>Claim type *</label><select name="claimType"><option value="">Select…</option>' +
    types.map(function (t) { return '<option value="' + t + '"' + (s.claimType === t ? ' selected' : '') + '>' + UI.label(t) + '</option>'; }).join('') +
    '  </select></div>' +
    '  <div class="field"><label>Incident date *</label><input type="date" name="incidentDate" max="' + UI.today() + '" value="' + UI.esc(s.incidentDate || '') + '"></div>' +
    '  <div class="field"><label>Claimed amount (₹) *</label><input type="number" name="claimedAmount" min="1" step="0.01" value="' + UI.esc(s.claimedAmount || '') + '"><div class="hint" id="amount-hint"></div></div>' +
    '  <div class="field"><label>&nbsp;</label><div class="hint" id="period-hint"></div></div>' +
    '  <div class="field full"><label>What happened? *</label><textarea name="description" maxlength="2000" placeholder="Describe the incident, location, people involved, damage or treatment…">' + UI.esc(existing ? existing.description : '') + '</textarea></div>' +
    (editing ? '' :
      '  <div class="field full"><label>Supporting documents</label><input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"><div class="hint">PDF, images or Office files, max 10 MB each. You can also add documents later.</div></div>') +
    ' </div>' +
    ' <div class="form-actions">' +
    '   <a class="btn btn-ghost" href="' + (editing ? '#/claims/' + s.id : '#/claims') + '">Cancel</a>' +
    '   <button type="button" class="btn btn-outline" id="save-draft">' + (editing && s.status === 'INFO_REQUESTED' ? 'Save changes' : 'Save draft') + '</button>' +
    '   <button type="submit" class="btn" id="submit-claim">' + (editing && s.status === 'INFO_REQUESTED' ? 'Resubmit claim' : 'Submit claim') + '</button>' +
    ' </div></form></div>' +
    ' <div class="card" id="policy-card"><h3>Policy details</h3><p class="muted small">Select a policy to see its coverage.</p></div>' +
    '</div>';

  var form = view.querySelector('#claim-form');
  var policySel = view.querySelector('#policy-select');

  function showPolicy() {
    var p = policies.filter(function (x) { return String(x.id) === policySel.value; })[0];
    var card = view.querySelector('#policy-card');
    if (!p) {
      card.innerHTML = '<h3>Policy details</h3><p class="muted small">Select a policy to see its coverage.</p>';
      view.querySelector('#amount-hint').textContent = '';
      view.querySelector('#period-hint').textContent = '';
      return;
    }
    card.innerHTML = '<h3>Policy details</h3><dl class="kv">' +
      '<dt>Policy #</dt><dd>' + UI.esc(p.policyNumber) + '</dd>' +
      '<dt>Product</dt><dd>' + UI.esc(p.productName) + '</dd>' +
      '<dt>Category</dt><dd>' + UI.esc(UI.label(p.category)) + '</dd>' +
      '<dt>Holder</dt><dd>' + UI.esc(p.customerName) + '</dd>' +
      '<dt>Sum insured</dt><dd>' + UI.money(p.sumInsured) + '</dd>' +
      '<dt>Period</dt><dd>' + UI.date(p.startDate) + ' – ' + UI.date(p.endDate) + '</dd>' +
      '<dt>Status</dt><dd>' + UI.badge(p.status) + '</dd></dl>';
    form.claimedAmount.max = p.sumInsured;
    form.incidentDate.min = p.startDate;
    form.incidentDate.max = p.endDate < UI.today() ? p.endDate : UI.today();
    view.querySelector('#amount-hint').textContent = 'Maximum ' + UI.money(p.sumInsured);
    view.querySelector('#period-hint').textContent = 'Incident must be between ' + UI.date(p.startDate) + ' and ' + UI.date(form.incidentDate.max);
  }

  if (editing) { policySel.value = existing.policy.id; showPolicy(); }
  else if (policies.length === 1) { policySel.value = policies[0].id; showPolicy(); }
  policySel.addEventListener('change', showPolicy);

  var custSel = view.querySelector('#customer-select');
  if (custSel) {
    custSel.addEventListener('change', async function () {
      policySel.innerHTML = '<option>Loading…</option>';
      policies = [];
      if (custSel.value) {
        try {
          policies = (await Api.get('/policies?customerId=' + custSel.value)).filter(function (p) { return p.status === 'ACTIVE'; });
        } catch (e) { UI.toast(e.message, 'error'); }
      }
      policySel.innerHTML = custSel.value ? policyOptions(policies) : '<option value="">Select a customer first</option>';
      if (policies.length === 1) policySel.value = policies[0].id;
      showPolicy();
    });
  }

  function validate(d) {
    var errs = [];
    if (!d.policyId) errs.push('Select a policy');
    if (!d.claimType) errs.push('Select a claim type');
    if (!d.incidentDate) errs.push('Enter the incident date');
    else if (d.incidentDate > UI.today()) errs.push('Incident date cannot be in the future');
    if (!(Number(d.claimedAmount) > 0)) errs.push('Claimed amount must be greater than zero');
    var p = policies.filter(function (x) { return String(x.id) === String(d.policyId); })[0];
    if (p && Number(d.claimedAmount) > Number(p.sumInsured)) errs.push('Claimed amount exceeds the sum insured (' + UI.money(p.sumInsured) + ')');
    if (p && d.incidentDate && (d.incidentDate < p.startDate || d.incidentDate > p.endDate)) errs.push('Incident date must be within the policy period');
    if (!d.description || d.description.length < 10) errs.push('Please describe what happened (at least 10 characters)');
    return errs;
  }

  async function save(submit, btn) {
    var d = UI.formData(form);
    if (editing) d.policyId = existing.policy.id;
    var errs = validate(d);
    var box = view.querySelector('#form-error');
    if (errs.length) {
      box.innerHTML = '<div class="alert alert-error">' + errs.map(UI.esc).join('<br>') + '</div>';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    box.innerHTML = '';
    var payload = {
      policyId: Number(d.policyId), claimType: d.claimType, incidentDate: d.incidentDate,
      claimedAmount: Number(d.claimedAmount), description: d.description, submit: submit
    };
    try {
      await UI.busy(btn, async function () {
        var result = editing ? await Api.put('/claims/' + s.id, payload) : await Api.post('/claims', payload);
        var filesEl = view.querySelector('#files');
        var failed = 0;
        if (filesEl && filesEl.files.length) {
          for (var i = 0; i < filesEl.files.length; i++) {
            var fd = new FormData();
            fd.append('file', filesEl.files[i]);
            fd.append('documentType', 'SUPPORTING');
            try { await Api.post('/claims/' + result.summary.id + '/documents', fd); }
            catch (e) { failed++; UI.toast(filesEl.files[i].name + ': ' + e.message, 'error'); }
          }
        }
        UI.toast((submit ? 'Claim ' + result.summary.claimNumber + ' submitted' : 'Draft saved') +
          (failed ? ' (' + failed + ' file(s) failed)' : ''), failed ? 'info' : 'success');
        Router.go('/claims/' + result.summary.id);
      });
    } catch (e) {
      box.innerHTML = '<div class="alert alert-error">' + UI.esc(e.message) + '</div>';
    }
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); save(true, view.querySelector('#submit-claim')); });
  view.querySelector('#save-draft').addEventListener('click', function (e) { save(false, e.currentTarget); });
};
