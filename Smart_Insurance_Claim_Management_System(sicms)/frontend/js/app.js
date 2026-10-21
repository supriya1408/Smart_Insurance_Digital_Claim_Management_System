/* Application bootstrap: layout, role-based navigation and routing. */
(function () {
  var ALL = ['CUSTOMER', 'AGENT', 'OFFICER', 'ADMIN'];

  var NAV = [
    { path: '/dashboard', icon: '🏠', text: 'Dashboard', roles: ALL },
    { path: '/claims', icon: '📄', text: { CUSTOMER: 'My Claims', AGENT: 'Claims Filed', OFFICER: 'Claims Queue', ADMIN: 'All Claims' }, roles: ALL },
    { path: '/claims/new', icon: '➕', text: 'File a Claim', roles: ['CUSTOMER', 'AGENT'] },
    { path: '/policies', icon: '🛡️', text: { CUSTOMER: 'My Policies', AGENT: 'Policies', ADMIN: 'Policies', OFFICER: 'Policies' }, roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
    { path: '/products', icon: '📦', text: 'Products', roles: ALL },
    { path: '/users', icon: '👥', text: 'Users & Roles', roles: ['ADMIN'] },
    { path: '/reports', icon: '📊', text: 'Reports', roles: ['OFFICER', 'ADMIN'] },
    { path: '/audit', icon: '🧾', text: 'Audit Log', roles: ['ADMIN'] }
  ];

  // ---------- Routes ----------
  Router.add('/login', Pages.login, { public: true });
  Router.add('/register', Pages.register, { public: true });
  Router.add('/dashboard', Pages.dashboard);
  Router.add('/claims', Pages.claims);
  Router.add('/claims/new', Pages.claimForm, { roles: ['CUSTOMER', 'AGENT'] });
  Router.add('/claims/:id/edit', Pages.claimForm, { roles: ['CUSTOMER', 'AGENT'] });
  Router.add('/claims/:id', Pages.claimDetail);
  Router.add('/policies', Pages.policies, { roles: ['CUSTOMER', 'AGENT', 'ADMIN'] });
  Router.add('/products', Pages.products);
  Router.add('/users', Pages.users, { roles: ['ADMIN'] });
  Router.add('/reports', Pages.reports, { roles: ['OFFICER', 'ADMIN'] });
  Router.add('/audit', Pages.audit, { roles: ['ADMIN'] });

  var root = document.getElementById('app');

  function navText(item, role) { return typeof item.text === 'string' ? item.text : item.text[role]; }

  function renderShell(user) {
    var links = NAV.filter(function (n) { return n.roles.indexOf(user.role) >= 0; }).map(function (n) {
      return '<a href="#' + n.path + '" data-path="' + n.path + '"><span class="icon">' + n.icon + '</span>' + UI.esc(navText(n, user.role)) + '</a>';
    }).join('');

    root.innerHTML =
      '<div class="app-shell">' +
      '  <aside class="sidebar" id="sidebar">' +
      '    <div class="brand"><div class="brand-logo">SI</div><div class="brand-name">Smart Insurance<small>Claim Management System</small></div></div>' +
      '    <nav class="nav">' + links + '</nav>' +
      '    <div class="sidebar-footer">v1.0 · Plain HTML/CSS/JS frontend</div>' +
      '  </aside>' +
      '  <div class="main">' +
      '    <header class="topbar">' +
      '      <div class="left"><button class="menu-toggle" id="menu-toggle" aria-label="Menu">☰</button><strong id="page-title"></strong></div>' +
      '      <div class="user-chip">' +
      '        <div class="who right"><div>' + UI.esc(user.fullName) + '</div><span class="role-tag">' + UI.esc(UI.label(user.role)) + '</span></div>' +
      '        <div class="avatar">' + UI.esc(UI.initials(user.fullName)) + '</div>' +
      '        <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>' +
      '      </div>' +
      '    </header>' +
      '    <main class="content" id="view"></main>' +
      '  </div>' +
      '</div>';

    document.getElementById('logout-btn').addEventListener('click', function () {
      Api.clearSession();
      Router.go('/login');
    });
    document.getElementById('menu-toggle').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
    root.dataset.shellFor = user.email + '|' + user.role;
  }

  function highlightNav(path) {
    var best = null;
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.classList.remove('active');
      var p = a.getAttribute('data-path');
      if (path === p || path.indexOf(p + '/') === 0) {
        if (!best || p.length > best.getAttribute('data-path').length) best = a;
      }
    });
    if (best) best.classList.add('active');
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  }

  async function render() {
    var match = Router.resolve();
    var user = Api.user();

    if (!match) { Router.go(user ? '/dashboard' : '/login'); return; }

    if (match.route.opts.public) {
      if (user && Api.token()) { Router.go('/dashboard'); return; }
      root.dataset.shellFor = '';
      await match.route.handler({ params: match.params, query: match.query }, root);
      return;
    }

    if (!user || !Api.token()) { Router.go('/login'); return; }

    var roles = match.route.opts.roles;
    if (roles && roles.indexOf(user.role) < 0) {
      UI.toast('You do not have access to that page', 'error');
      Router.go('/dashboard');
      return;
    }

    if (root.dataset.shellFor !== user.email + '|' + user.role) renderShell(user);
    highlightNav(match.path);
    var view = document.getElementById('view');
    view.innerHTML = UI.loader();
    window.scrollTo(0, 0);
    try {
      await match.route.handler({ params: match.params, query: match.query, user: user }, view);
      var h1 = view.querySelector('h1');
      document.getElementById('page-title').textContent = h1 ? h1.textContent : '';
      document.title = (h1 ? h1.textContent + ' · ' : '') + 'Smart Insurance CMS';
    } catch (e) {
      if (e.message === 'Unauthorized') return;
      view.innerHTML = '<div class="card"><div class="alert alert-error">' + UI.esc(e.message) + '</div>' +
        '<button class="btn btn-outline" onclick="location.reload()">Retry</button></div>';
    }
  }

  window.addEventListener('hashchange', render);
  render();   // scripts are loaded at the end of <body>, so the DOM is ready
})();
