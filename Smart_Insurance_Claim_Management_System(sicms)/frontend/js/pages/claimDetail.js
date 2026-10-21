window.Pages = window.Pages || {};

Pages.claimDetail = async function (ctx, view) {
  var user = ctx.user;
  var id = ctx.params.id;
  var claim = await Api.get('/claims/' + id);
  render();

  function stepper(status) {
    var rejected = status === 'REJECTED' || (status === 'CLOSED' && claim.summary.approvedAmount !== null && Number(claim.summary.approvedAmount) === 0);
    var steps = rejected
      ? ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CLOSED']
      : ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'SETTLED', 'CLOSED'];
    var cur = status === 'INFO_REQUESTED' ? 'UNDER_REVIEW' : status;
    var idx = steps.indexOf(cur);
    return '<div class="stepper">' + steps.map(function (st, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'current' : '');
      if (st === 'REJECTED' && i <= idx) cls = 'bad';
      if (i === idx && status === 'CLOSED') cls = 'done';
      var lbl = (st === 'UNDER_REVIEW' && status === 'INFO_REQUESTED') ? 'Info requested' : UI.label(st);
      return '<div class="step ' + cls + '"><div class="dot">' + (cls === 'done' ? '✓' : (cls === 'bad' ? '✕' : i + 1)) + '</div>' + UI.esc(lbl) + '</div>';
    }).join('') + '</div>';
  }

  function actionButtons(a) {
    var b = [];
    if (a.indexOf('EDIT') >= 0) b.push('<a class="btn btn-outline" href="#/claims/' + id + '/edit">✏️ Edit</a>');
    if (a.indexOf('SUBMIT') >= 0) b.push('<button class="btn" data-act="SUBMIT">' + (claim.summary.status === 'INFO_REQUESTED' ? 'Resubmit' : 'Submit claim') + '</button>');
    if (a.indexOf('START_REVIEW') >= 0) b.push('<button class="btn" data-act="START_REVIEW">🔎 Start review</button>');
    if (a.indexOf('APPROVE') >= 0) b.push('<button class="btn btn-success" data-act="APPROVE">✔ Approve</button>');
    if (a.indexOf('REJECT') >= 0) b.push('<button class="btn btn-danger" data-act="REJECT">✕ Reject</button>');
    if (a.indexOf('REQUEST_INFO') >= 0) b.push('<button class="btn btn-warning" data-act="REQUEST_INFO">❓ Request info</button>');
    if (a.indexOf('SETTLE') >= 0) b.push('<button class="btn btn-success" data-act="SETTLE">💸 Mark settled</button>');
    if (a.indexOf('CLOSE') >= 0) b.push('<button class="btn btn-ghost" data-act="CLOSE">Close claim</button>');
    if (a.indexOf('ASSIGN') >= 0) b.push('<button class="btn btn-outline" data-act="ASSIGN">👤 Assign officer</button>');
    return b.join('');
  }

  function render() {
    var s = claim.summary, p = claim.policy, a = claim.allowedActions;
    var docs = claim.documents.length ? '<ul class="doc-list">' + claim.documents.map(function (d) {
      return '<li><div><strong>' + UI.esc(d.fileName) + '</strong><div class="small muted">' + UI.esc(UI.label(d.documentType)) + ' · ' +
        UI.fileSize(d.sizeBytes) + ' · ' + UI.esc(d.uploadedBy || '') + ' · ' + UI.dateTime(d.uploadedAt) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-doc="' + d.id + '" data-name="' + UI.esc(d.fileName) + '">⬇ Download</button></li>';
    }).join('') + '</ul>' : '<p class="muted small">No documents uploaded yet.</p>';

    var upload = a.indexOf('UPLOAD') >= 0 ?
      '<div class="dropzone" id="dropzone"><p>Drag & drop files here, or</p>' +
      '<div class="filters" style="justify-content:center"><select id="doc-type">' +
      ['SUPPORTING', 'MEDICAL_REPORT', 'INVOICE', 'POLICE_REPORT', 'PHOTO', 'ID_PROOF', 'ESTIMATE', 'OTHER'].map(function (t) {
        return '<option value="' + t + '">' + UI.label(t) + '</option>';
      }).join('') + '</select>' +
      '<label class="btn btn-outline btn-sm">Choose files<input type="file" id="doc-file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"></label></div>' +
      '<p class="small">PDF, JPG, PNG, DOC(X), XLS(X), TXT · max 10 MB</p></div>' : '';

    var timeline = '<ul class="timeline">' + claim.history.slice().reverse().map(function (h) {
      var change = h.fromStatus === h.toStatus ? '' : (h.fromStatus ? UI.badge(h.fromStatus) + ' → ' : '') + UI.badge(h.toStatus);
      return '<li><div>' + change + '</div><div style="margin-top:.25rem">' + UI.esc(h.comment || '') + '</div>' +
        '<div class="when">' + UI.esc(h.changedBy) + ' · ' + UI.dateTime(h.changedAt) + '</div></li>';
    }).join('') + '</ul>';

    view.innerHTML =
      '<div class="page-head"><div><a href="#/claims" class="small">← Back to claims</a><h1 style="margin-top:.3rem">Claim ' + UI.esc(s.claimNumber) + ' ' + UI.badge(s.status) + '</h1>' +
      '<p class="muted">' + UI.esc(UI.label(s.claimType)) + ' · ' + UI.esc(s.productName) + ' · filed ' + UI.dateTime(s.createdAt) + '</p></div>' +
      '<div class="btn-row">' + actionButtons(a) + '</div></div>' +
      (s.status === 'INFO_REQUESTED' && claim.remarks ? '<div class="alert alert-warn"><strong>Information requested:</strong> ' + UI.esc(claim.remarks) + '</div>' : '') +
      (s.status === 'REJECTED' && claim.remarks ? '<div class="alert alert-error"><strong>Rejection reason:</strong> ' + UI.esc(claim.remarks) + '</div>' : '') +
      '<div class="card">' + stepper(s.status) + '</div>' +
      '<div class="grid grid-3">' +
      ' <div class="span-2">' +
      '  <div class="card"><h3>Claim details</h3><dl class="kv">' +
      '   <dt>Claim type</dt><dd>' + UI.esc(UI.label(s.claimType)) + '</dd>' +
      '   <dt>Incident date</dt><dd>' + UI.date(s.incidentDate) + '</dd>' +
      '   <dt>Claimed amount</dt><dd>' + UI.money(s.claimedAmount) + '</dd>' +
      '   <dt>Approved amount</dt><dd>' + UI.money(s.approvedAmount) + '</dd>' +
      '   <dt>Submitted</dt><dd>' + UI.dateTime(claim.submittedAt) + '</dd>' +
      '   <dt>Decision date</dt><dd>' + UI.dateTime(claim.decidedAt) + '</dd>' +
      '   <dt>Latest remarks</dt><dd>' + UI.esc(claim.remarks || '—') + '</dd>' +
      '  </dl><h3 style="margin-top:1rem">Description</h3><p style="white-space:pre-wrap;margin:0">' + UI.esc(claim.description) + '</p></div>' +
      '  <div class="card"><div class="card-head"><h3>Documents (' + claim.documents.length + ')</h3></div>' + docs + upload + '</div>' +
      ' </div>' +
      ' <div>' +
      '  <div class="card"><h3>Policy</h3><dl class="kv">' +
      '   <dt>Policy #</dt><dd>' + UI.esc(p.policyNumber) + '</dd>' +
      '   <dt>Product</dt><dd>' + UI.esc(p.productName) + '</dd>' +
      '   <dt>Sum insured</dt><dd>' + UI.money(p.sumInsured) + '</dd>' +
      '   <dt>Period</dt><dd>' + UI.date(p.startDate) + ' – ' + UI.date(p.endDate) + '</dd>' +
      '   <dt>Status</dt><dd>' + UI.badge(p.status) + '</dd></dl></div>' +
      '  <div class="card"><h3>People</h3><dl class="kv">' +
      '   <dt>Customer</dt><dd>' + UI.esc(claim.customer.fullName) + '<div class="small muted">' + UI.esc(claim.customer.email) + '</div></dd>' +
      '   <dt>Filed by</dt><dd>' + UI.esc(claim.filedBy ? claim.filedBy.fullName : '—') + '</dd>' +
      '   <dt>Claims officer</dt><dd>' + UI.esc(claim.assignedOfficer ? claim.assignedOfficer.fullName : 'Not assigned') + '</dd></dl></div>' +
      '  <div class="card"><h3>History</h3>' + timeline + '</div>' +
      ' </div>' +
      '</div>';

    wire();
  }

  function wire() {
    view.querySelectorAll('[data-doc]').forEach(function (b) {
      b.addEventListener('click', function () {
        Api.download('/documents/' + b.getAttribute('data-doc') + '/download', b.getAttribute('data-name'))
          .catch(function (e) { UI.toast(e.message, 'error'); });
      });
    });
    view.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () { handleAction(b.getAttribute('data-act'), b); });
    });

    var input = view.querySelector('#doc-file');
    var dz = view.querySelector('#dropzone');
    if (input) input.addEventListener('change', function () { uploadFiles(input.files); input.value = ''; });
    if (dz) {
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); });
    }
  }

  async function uploadFiles(files) {
    var type = view.querySelector('#doc-type').value;
    var ok = 0;
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) { UI.toast(files[i].name + ' is larger than 10 MB', 'error'); continue; }
      var fd = new FormData();
      fd.append('file', files[i]);
      fd.append('documentType', type);
      try { await Api.post('/claims/' + id + '/documents', fd); ok++; }
      catch (e) { UI.toast(files[i].name + ': ' + e.message, 'error'); }
    }
    if (ok) {
      UI.toast(ok + ' document(s) uploaded', 'success');
      await reload();
    }
  }

  async function reload() {
    claim = await Api.get('/claims/' + id);
    render();
  }

  async function runAction(promiseFn, okMsg) {
    try {
      claim = await promiseFn();
      UI.toast(okMsg, 'success');
      render();
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function commentModal(title, opts) {
    return new Promise(function (resolve) {
      var amountField = opts.amount ? '<div class="field"><label>Approved amount (₹) *</label><input type="number" id="m-amount" min="1" step="0.01" max="' +
        claim.summary.claimedAmount + '" value="' + claim.summary.claimedAmount + '"><div class="hint">Up to ' + UI.money(claim.summary.claimedAmount) + '</div></div>' : '';
      UI.modal(title, '<div id="m-err"></div>' + amountField +
        '<div class="field" style="margin-top:.8rem"><label>' + UI.esc(opts.label) + (opts.required ? ' *' : '') + '</label><textarea id="m-comment" maxlength="1000" placeholder="' + UI.esc(opts.placeholder || '') + '"></textarea></div>' +
        '<div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn ' + (opts.btnClass || '') + '" id="m-ok">' + UI.esc(opts.okText) + '</button></div>',
        function (el, close) {
          el.querySelector('#m-ok').addEventListener('click', function () {
            var comment = el.querySelector('#m-comment').value.trim();
            var amtEl = el.querySelector('#m-amount');
            var amount = amtEl ? Number(amtEl.value) : null;
            var err = '';
            if (opts.required && !comment) err = 'Please enter ' + opts.label.toLowerCase();
            if (amtEl && !(amount > 0)) err = 'Enter an approved amount greater than zero';
            if (amtEl && amount > Number(claim.summary.claimedAmount)) err = 'Approved amount cannot exceed the claimed amount';
            if (err) { el.querySelector('#m-err').innerHTML = '<div class="alert alert-error">' + UI.esc(err) + '</div>'; return; }
            close();
            resolve({ comment: comment, amount: amount });
          });
        });
    });
  }

  async function handleAction(act, btn) {
    var path = '/claims/' + id + '/actions';
    if (act === 'SUBMIT') {
      if (!claim.documents.length && !(await UI.confirm('No documents attached', 'You have not uploaded any supporting documents. Submit anyway?', 'Submit'))) return;
      return runAction(function () { return Api.post('/claims/' + id + '/submit', {}); }, 'Claim submitted');
    }
    if (act === 'START_REVIEW') {
      return runAction(function () { return Api.post(path, { action: 'START_REVIEW' }); }, 'Review started – claim assigned to you');
    }
    if (act === 'APPROVE') {
      var r = await commentModal('Approve claim', { amount: true, label: 'Comment', placeholder: 'Optional note for the customer', okText: 'Approve', btnClass: 'btn-success' });
      return runAction(function () { return Api.post(path, { action: 'APPROVE', approvedAmount: r.amount, comment: r.comment }); }, 'Claim approved');
    }
    if (act === 'REJECT') {
      var r2 = await commentModal('Reject claim', { label: 'Reason for rejection', required: true, okText: 'Reject', btnClass: 'btn-danger' });
      return runAction(function () { return Api.post(path, { action: 'REJECT', comment: r2.comment }); }, 'Claim rejected');
    }
    if (act === 'REQUEST_INFO') {
      var r3 = await commentModal('Request more information', { label: 'Information required', required: true, placeholder: 'e.g. Please upload the discharge summary and final bill', okText: 'Send request', btnClass: 'btn-warning' });
      return runAction(function () { return Api.post(path, { action: 'REQUEST_INFO', comment: r3.comment }); }, 'Information requested from customer');
    }
    if (act === 'SETTLE') {
      var r4 = await commentModal('Mark claim as settled', { label: 'Payment reference / note', placeholder: 'e.g. NEFT ref UTR123456', okText: 'Mark settled', btnClass: 'btn-success' });
      return runAction(function () { return Api.post(path, { action: 'SETTLE', comment: r4.comment }); }, 'Claim settled');
    }
    if (act === 'CLOSE') {
      if (!(await UI.confirm('Close claim', 'Closing is final. No further changes or uploads will be possible.', 'Close claim'))) return;
      return runAction(function () { return Api.post(path, { action: 'CLOSE' }); }, 'Claim closed');
    }
    if (act === 'ASSIGN') {
      var officers;
      try { officers = await Api.get('/users/officers'); } catch (e) { UI.toast(e.message, 'error'); return; }
      UI.modal('Assign claims officer',
        '<div class="field"><label>Officer</label><select id="m-officer">' + officers.map(function (o) {
          var sel = claim.assignedOfficer && claim.assignedOfficer.id === o.id ? ' selected' : '';
          return '<option value="' + o.id + '"' + sel + '>' + UI.esc(o.fullName) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="m-ok">Assign</button></div>',
        function (el, close) {
          el.querySelector('#m-ok').addEventListener('click', function () {
            var officerId = Number(el.querySelector('#m-officer').value);
            close();
            runAction(function () { return Api.post('/claims/' + id + '/assign', { officerId: officerId }); }, 'Officer assigned');
          });
        });
    }
  }
};
