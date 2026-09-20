/* ==========================================================
   router.js
   काम: पेज बदलना। हर पेज का address "#/..." होता है, जैसे:
   #/home   #/subjects   #/subject/physics   #/chapter/physics/1
   #/quiz   #/result/<id>   #/review/<id>   #/mistakes   #/progress   #/game   #/settings
   ========================================================== */
(function (M) {
  'use strict';

  var Router = { routes: [], currentPath: '' };
  var token = 0;

  Router.add = function (pattern, handler) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
    Router.routes.push({ re: re, keys: keys, handler: handler });
  };

  Router.parse = function () {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) h = '/home';
    var query = {};
    var i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        try { query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); } catch (e) { /* ignore */ }
      });
      h = h.slice(0, i);
    }
    return { path: h, query: query };
  };

  Router.go = function (path) {
    if (path.charAt(0) === '#') path = path.slice(1);
    var target = '#' + path;
    if (location.hash === target) Router.render();
    else location.hash = target;
  };

  Router.refresh = function (keepScroll) { Router.render({ keepScroll: !!keepScroll }); };

  Router.render = function (opts) {
    opts = opts || {};
    var my = ++token;
    var p = Router.parse();
    Router.currentPath = p.path;
    var route = null, params = {};
    for (var i = 0; i < Router.routes.length; i++) {
      var m = Router.routes[i].re.exec(p.path);
      if (m) {
        route = Router.routes[i];
        route.keys.forEach(function (k, idx) {
          try { params[k] = decodeURIComponent(m[idx + 1]); } catch (e) { params[k] = m[idx + 1]; }
        });
        break;
      }
    }
    var view;
    try {
      view = route ? route.handler(params, p.query) : M.App.notFound('यह पेज नहीं मिला।');
    } catch (err) {
      view = M.App.errorView(err);
    }
    Promise.resolve(view).then(function (v) {
      if (my !== token) return;
      M.App.applyView(v, opts);
    }).catch(function (err) {
      if (my !== token) return;
      M.App.applyView(M.App.errorView(err), opts);
    });
  };

  Router.start = function () {
    window.addEventListener('hashchange', function () { Router.render(); });
    Router.render();
  };

  M.Router = Router;
})(window.M27 = window.M27 || {});
