/* Stands in for the claude.ai runtime on Vercel.
   window.claude.use('db')        -> shared store via /api/db (Upstash Redis), polled every 15s
   window.claude.use('downloads') -> normal browser downloads
   window.claude.use('user')      -> not used here (everyone can edit)            */
(function () {
  var POLL_MS = 15000;
  var KEY = 'hubsales.pw';

  function getPw() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setPw(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

  /* ---------- password gate ---------- */
  var gateWaiters = [];
  function askPassword(wrong) {
    return new Promise(function (resolve) {
      gateWaiters.push(resolve);
      if (document.getElementById('pwGate')) {
        if (wrong) document.getElementById('pwErr').textContent = 'That password is not right.';
        return;
      }
      var d = document.createElement('div');
      d.id = 'pwGate';
      d.setAttribute('style', 'position:fixed;inset:0;z-index:100;background:var(--bg,#f3f4f2);display:flex;align-items:center;justify-content:center;padding:16px');
      d.innerHTML =
        '<form style="background:var(--panel,#fff);border:1px solid var(--line,#ddd);border-radius:10px;padding:24px;width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px">' +
        '<b style="font-size:17px">Hub Sales</b>' +
        '<span style="color:var(--ink-2,#555);font-size:13px">Enter the team password to open the dashboard.</span>' +
        '<input type="password" id="pwIn" autocomplete="current-password" placeholder="Team password" style="padding:8px 10px">' +
        '<span id="pwErr" style="color:var(--bad-ink,#b02a2a);font-size:13px">' + (wrong ? 'That password is not right.' : '') + '</span>' +
        '<button class="btn primary" type="submit">Open</button></form>';
      document.body.appendChild(d);
      setTimeout(function () { var i = document.getElementById('pwIn'); if (i) i.focus(); }, 0);
      d.querySelector('form').onsubmit = function (ev) {
        ev.preventDefault();
        setPw(document.getElementById('pwIn').value);
        d.remove();
        var w = gateWaiters; gateWaiters = [];
        w.forEach(function (fn) { fn(); });
      };
    });
  }

  /* ---------- visible error bar (shows the server's actual reason) ---------- */
  function showProblem(text) {
    var bar = document.getElementById('apiProblem');
    if (!text) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'apiProblem';
      bar.setAttribute('role', 'alert');
      bar.setAttribute('style', 'position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:70;max-width:calc(100% - 32px);background:var(--bad,#d03b3b);color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.18)');
      document.body.appendChild(bar);
    }
    bar.textContent = 'Not saved: ' + text;
  }

  async function api(method, body, retried) {
    var res;
    try {
      res = await fetch('/api/db', {
        method: method,
        headers: { 'content-type': 'application/json', 'x-app-password': getPw() },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
    } catch (e) { showProblem('the server could not be reached. Check your internet connection.'); throw err('unavailable', 'Network error'); }
    if (res.status === 404 && !(res.headers.get('content-type') || '').includes('json')) {
      showProblem('the /api/db function is missing. Make sure the "api" folder (with db.js inside) was uploaded to GitHub, then redeploy.');
      throw err('unavailable', 'API missing');
    }
    if (res.status === 401) {
      await askPassword(!!getPw() || retried);
      return api(method, body, true);
    }
    var json = {};
    try { json = await res.json(); } catch (e) {}
    if (!res.ok && !(res.status === 404 && json.code === 'invalid_argument')) {
      showProblem(json.error || ('server error ' + res.status));
      throw err(json.code === 'invalid_argument' ? 'internal' : (json.code || 'internal'), json.error || ('HTTP ' + res.status));
    }
    if (!res.ok) throw err(json.code, json.error);
    showProblem('');
    return json;
  }

  /* ---------- local mirror + listeners ---------- */
  var docs = {};            // path -> data
  var listeners = [];       // {type:'doc'|'col', path, cb, last}
  var loaded = false, inflight = null;

  function snapDoc(path) {
    var has = Object.prototype.hasOwnProperty.call(docs, path);
    var data = has ? clone(docs[path]) : undefined;
    return { id: path.split('/').pop(), exists: has, data: function () { return data; } };
  }
  function snapCol(col) {
    var pre = col + '/';
    var list = Object.keys(docs).filter(function (p) { return p.indexOf(pre) === 0 && p.slice(pre.length).indexOf('/') < 0; }).sort();
    return { docs: list.map(snapDoc), size: list.length, empty: !list.length };
  }
  function sigFor(l) {
    if (l.type === 'doc') return JSON.stringify(docs[l.path] === undefined ? null : docs[l.path]);
    var pre = l.path + '/', o = {};
    Object.keys(docs).sort().forEach(function (p) { if (p.indexOf(pre) === 0) o[p] = docs[p]; });
    return JSON.stringify(o);
  }
  function emit(l, force) {
    var s = sigFor(l);
    if (!force && s === l.last) return;
    l.last = s;
    try { l.cb(l.type === 'doc' ? snapDoc(l.path) : snapCol(l.path)); } catch (e) { console.error(e); }
  }
  function emitAll() { listeners.forEach(function (l) { emit(l, false); }); }

  function pull() {
    if (inflight) return inflight;
    inflight = api('GET').then(function (j) {
      docs = j.docs || {}; loaded = true; emitAll();
    }).catch(function (e) {
      console.error(e);
      listeners.forEach(function (l) { if (l.onErr && !loaded) l.onErr(e); });
    }).finally(function () { inflight = null; });
    return inflight;
  }
  setInterval(function () { if (!document.hidden) pull(); }, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(); });

  async function write(body) {
    await api('POST', body);
    await pull();
  }

  function docRef(path) {
    return {
      id: path.split('/').pop(),
      get: async function () { await pull(); return snapDoc(path); },
      set: function (data) { return write({ op: 'set', path: path, data: data }); },
      update: function (data) { return write({ op: 'update', path: path, data: data }); },
      delete: function () { return write({ op: 'delete', path: path }); },
      onSnapshot: function (cb, onErr) {
        var l = { type: 'doc', path: path, cb: cb, onErr: onErr, last: undefined };
        listeners.push(l);
        if (loaded) emit(l, true); else pull();
        return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
      }
    };
  }
  var db = {
    doc: docRef,
    collection: function (name) {
      return {
        doc: function (id) { return docRef(name + '/' + id); },
        get: async function () { await pull(); return snapCol(name); },
        onSnapshot: function (cb, onErr) {
          var l = { type: 'col', path: name, cb: cb, onErr: onErr, last: undefined };
          listeners.push(l);
          if (loaded) emit(l, true); else pull();
          return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
        }
      };
    }
  };

  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = o.filename || 'download';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }
  };

  window.claude = {
    use: async function (name) {
      if (name === 'db') return db;
      if (name === 'downloads') return downloads;
      return null;
    }
  };
})();
