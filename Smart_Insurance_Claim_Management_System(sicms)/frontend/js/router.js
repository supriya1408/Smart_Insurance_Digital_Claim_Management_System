/* Tiny hash router: routes like '#/claims/:id' */
window.Router = (function () {
  var routes = [];

  function add(pattern, handler, opts) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re: re, keys: keys, handler: handler, opts: opts || {} });
  }

  function current() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = h.indexOf('?');
    var path = q >= 0 ? h.slice(0, q) : h;
    var query = {};
    if (q >= 0) h.slice(q + 1).split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { path: path, query: query };
  }

  function resolve() {
    var cur = current();
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i].re.exec(cur.path);
      if (m) {
        var params = {};
        routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        return { route: routes[i], params: params, query: cur.query, path: cur.path };
      }
    }
    return null;
  }

  function go(path) { location.hash = '#' + path; }

  return { add: add, resolve: resolve, go: go };
})();
