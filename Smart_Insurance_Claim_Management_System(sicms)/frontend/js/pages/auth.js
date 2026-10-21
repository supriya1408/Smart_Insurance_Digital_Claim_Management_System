window.Pages = window.Pages || {};

(function () {
  var HERO =
    '<div class="auth-hero">' +
    '  <h1>Smart Insurance<br>Claim Management System</h1>' +
    '  <p>One digital platform for customers, agents, claims officers and administrators.</p>' +
    '  <ul>' +
    '    <li>File claims online and upload supporting documents</li>' +
    '    <li>Track every claim from submission to settlement</li>' +
    '    <li>Officers review, approve, reject or request more information</li>' +
    '    <li>Admins manage users, products, policies and reports</li>' +
    '  </ul>' +
    '</div>';

  var DEMO = [
    ['Customer', 'customer@sicms.com'], ['Agent', 'agent@sicms.com'],
    ['Officer', 'officer@sicms.com'], ['Admin', 'admin@sicms.com']
  ];

  Pages.login = async function (ctx, root) {
    root.innerHTML =
      '<div class="auth-page">' + HERO +
      '  <div class="auth-form-wrap"><div class="card auth-card">' +
      '    <h1>Sign in</h1><p class="muted">Welcome back! Please enter your details.</p>' +
      '    <div id="login-error"></div>' +
      '    <form id="login-form" novalidate>' +
      '      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required></div>' +
      '      <div class="field" style="margin-top:.8rem"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>' +
      '      <button class="btn btn-block" style="margin-top:1.2rem" type="submit" id="login-btn">Sign in</button>' +
      '    </form>' +
      '    <p class="small" style="margin-top:1rem">New customer? <a href="#/register">Create an account</a></p>' +
      '    <div class="demo-accounts alert alert-info"><strong>Demo accounts</strong> (password <code>Password@123</code>):<br>' +
      DEMO.map(function (d) { return '<button type="button" class="btn btn-outline btn-sm" data-email="' + d[1] + '">' + d[0] + '</button>'; }).join('') +
      '    </div>' +
      '  </div></div>' +
      '</div>';

    var form = root.querySelector('#login-form');
    root.querySelectorAll('[data-email]').forEach(function (b) {
      b.addEventListener('click', function () {
        form.email.value = b.getAttribute('data-email');
        form.password.value = 'Password@123';
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit'));
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = UI.formData(form);
      var errBox = root.querySelector('#login-error');
      errBox.innerHTML = '';
      if (!data.email || !data.password) {
        errBox.innerHTML = '<div class="alert alert-error">Please enter email and password.</div>';
        return;
      }
      try {
        await UI.busy(root.querySelector('#login-btn'), async function () {
          var auth = await Api.post('/auth/login', data, { allow401: true });
          Api.saveSession(auth);
          UI.toast('Welcome, ' + auth.user.fullName + '!', 'success');
          Router.go('/dashboard');
        });
      } catch (err) {
        errBox.innerHTML = '<div class="alert alert-error">' + UI.esc(err.message) + '</div>';
      }
    });
  };

  Pages.register = async function (ctx, root) {
    root.innerHTML =
      '<div class="auth-page">' + HERO +
      '  <div class="auth-form-wrap"><div class="card auth-card">' +
      '    <h1>Create account</h1><p class="muted">Register as a customer to file and track claims.</p>' +
      '    <div id="reg-error"></div>' +
      '    <form id="reg-form" novalidate>' +
      '      <div class="field"><label>Full name</label><input name="fullName" required maxlength="120"></div>' +
      '      <div class="field" style="margin-top:.8rem"><label>Email</label><input name="email" type="email" required></div>' +
      '      <div class="field" style="margin-top:.8rem"><label>Phone</label><input name="phone" placeholder="Optional"></div>' +
      '      <div class="field" style="margin-top:.8rem"><label>Password</label><input name="password" type="password" minlength="8" required><div class="hint">At least 8 characters</div></div>' +
      '      <div class="field" style="margin-top:.8rem"><label>Confirm password</label><input name="confirm" type="password" required></div>' +
      '      <button class="btn btn-block" style="margin-top:1.2rem" type="submit" id="reg-btn">Create account</button>' +
      '    </form>' +
      '    <p class="small" style="margin-top:1rem">Already registered? <a href="#/login">Sign in</a></p>' +
      '  </div></div>' +
      '</div>';

    var form = root.querySelector('#reg-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var d = UI.formData(form);
      var errBox = root.querySelector('#reg-error');
      var problems = [];
      if (!d.fullName) problems.push('Full name is required');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) problems.push('Enter a valid email');
      if (d.password.length < 8) problems.push('Password must be at least 8 characters');
      if (d.password !== d.confirm) problems.push('Passwords do not match');
      if (problems.length) {
        errBox.innerHTML = '<div class="alert alert-error">' + problems.map(UI.esc).join('<br>') + '</div>';
        return;
      }
      errBox.innerHTML = '';
      try {
        await UI.busy(root.querySelector('#reg-btn'), async function () {
          var auth = await Api.post('/auth/register',
            { fullName: d.fullName, email: d.email, phone: d.phone, password: d.password }, { allow401: true });
          Api.saveSession(auth);
          UI.toast('Account created. Welcome!', 'success');
          Router.go('/dashboard');
        });
      } catch (err) {
        errBox.innerHTML = '<div class="alert alert-error">' + UI.esc(err.message) + '</div>';
      }
    });
  };
})();
