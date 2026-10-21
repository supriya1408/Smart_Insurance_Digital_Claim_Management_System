/* Thin wrapper around fetch() that adds the JWT token and turns errors into readable messages. */
window.Api = (function () {
  var TOKEN_KEY = 'sicms_token';
  var USER_KEY = 'sicms_user';

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }
  function saveSession(auth) {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    var headers = {};
    var t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    var init = { method: method, headers: headers };
    if (body instanceof FormData) {
      init.body = body;                       // browser sets the multipart boundary
    } else if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    var res;
    try {
      res = await fetch(SICMS_CONFIG.API_BASE + path, init);
    } catch (e) {
      throw new Error('Cannot reach the server at ' + (SICMS_CONFIG.API_BASE || location.origin) +
        '. Is the backend running?');
    }

    if (res.status === 401 && !opts.allow401) {
      clearSession();
      if (location.hash.indexOf('#/login') !== 0) {
        UI.toast('Your session has expired. Please log in again.', 'error');
        location.hash = '#/login';
      }
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      var msg = 'Request failed (' + res.status + ')';
      try {
        var err = await res.json();
        if (err && err.message) msg = err.message;
      } catch (e) { /* not JSON */ }
      throw new Error(msg);
    }
    if (opts.raw) return res;
    if (res.status === 204) return null;
    var ct = res.headers.get('content-type') || '';
    return ct.indexOf('application/json') >= 0 ? res.json() : res.text();
  }

  /** Download a protected file (needs the token, so a plain <a href> won't work). */
  async function download(path, fallbackName) {
    var res = await request('GET', path, null, { raw: true });
    var name = fallbackName || 'download';
    var cd = res.headers.get('content-disposition') || '';
    var m = /filename\*=UTF-8''([^;]+)/i.exec(cd) || /filename="?([^";]+)"?/i.exec(cd);
    if (m) name = decodeURIComponent(m[1]);
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  return {
    token: token, user: user, saveSession: saveSession, clearSession: clearSession,
    get: function (p) { return request('GET', p); },
    post: function (p, b, o) { return request('POST', p, b === undefined ? {} : b, o); },
    put: function (p, b) { return request('PUT', p, b); },
    patch: function (p, b) { return request('PATCH', p, b); },
    del: function (p) { return request('DELETE', p); },
    download: download
  };
})();
