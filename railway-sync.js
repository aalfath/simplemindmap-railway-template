/*
 * SimpleMindMap server storage for the Railway template.
 *
 * Upstream SimpleMindMap keeps the open map, its settings and the UI language in the
 * browser's localStorage under four keys, so a map lives in one browser only. This script
 * runs before the app's own scripts and mirrors those four keys to the server
 * (nginx WebDAV on a Railway volume, behind the same login as the app):
 *   - on load it fetches each key from /api/state/<KEY> and puts it in localStorage,
 *     so every browser that signs in opens the same map;
 *   - whenever the app writes one of the keys, it saves it to the server (debounced),
 *     and flushes pending saves when the tab is hidden or closed.
 * If the server has no copy yet but this browser does, the browser's copy is uploaded.
 * Last write wins: it is shared storage, not live collaboration.
 */
(function () {
  'use strict';
  var KEYS = ['SIMPLE_MIND_MAP_DATA', 'SIMPLE_MIND_MAP_CONFIG', 'SIMPLE_MIND_MAP_LANG', 'SIMPLE_MIND_MAP_LOCAL_CONFIG'];
  var BASE = 'api/state/';
  var DEBOUNCE_MS = 600;
  var ls;
  try { ls = window.localStorage; } catch (e) { return; }
  if (!ls) return;
  var proto = Object.getPrototypeOf(ls);
  var origSet = proto.setItem, origRemove = proto.removeItem;
  var pending = {}, timers = {}, failed = false, badge = null;

  function isKey(k) { return KEYS.indexOf(String(k)) !== -1; }

  function showBadge(text, ok) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { showBadge(text, ok); }); return; }
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'railway-sync-status';
      badge.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;padding:6px 10px;border-radius:4px;' +
        'font:12px/1.4 sans-serif;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none';
      document.body.appendChild(badge);
    }
    badge.textContent = text;
    badge.style.background = ok ? '#67c23a' : '#f56c6c';
    badge.style.display = 'block';
    if (ok) setTimeout(function () { if (!failed) badge.style.display = 'none'; }, 1500);
  }

  // 1. Load the server copy before the app reads localStorage (synchronous on purpose).
  var loadError = false;
  KEYS.forEach(function (key) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', BASE + key + '?t=' + Date.now(), false);
      xhr.send(null);
      if (xhr.status === 200) {
        origSet.call(ls, key, xhr.responseText);
      } else if (xhr.status === 404) {
        var local = ls.getItem(key);
        if (local !== null) pending[key] = local; // server has nothing yet: upload this browser's copy
      } else {
        loadError = true;
      }
    } catch (e) {
      loadError = true;
    }
  });
  // Self-hosted copy: skip upstream's one-time "web version is a trial, download the client" pop-up,
  // and start in English unless a language was saved before.
  try { if (ls.getItem('webUseTip') === null) origSet.call(ls, 'webUseTip', '1'); } catch (e) {}
  try { if (ls.getItem('SIMPLE_MIND_MAP_LANG') === null) { origSet.call(ls, 'SIMPLE_MIND_MAP_LANG', 'en'); pending['SIMPLE_MIND_MAP_LANG'] = 'en'; } } catch (e) {}
  // Upstream's AI panel talks to its desktop client on the visitor's own machine (localhost:3456),
  // which a hosted copy doesn't have, so start with it switched off (Settings can turn it back on).
  try {
    if (ls.getItem('SIMPLE_MIND_MAP_LOCAL_CONFIG') === null) {
      var lc = JSON.stringify({ enableAi: false });
      origSet.call(ls, 'SIMPLE_MIND_MAP_LOCAL_CONFIG', lc); pending['SIMPLE_MIND_MAP_LOCAL_CONFIG'] = lc;
    }
  } catch (e) {}
  if (loadError) { failed = true; showBadge('Could not load your saved map from the server. Reload to retry.', false); }

  // 2. Save to the server whenever the app writes one of the keys.
  function send(key, value, keepalive) {
    var opts = { method: value === null ? 'DELETE' : 'PUT', credentials: 'same-origin', cache: 'no-store' };
    if (value !== null) { opts.body = value; opts.headers = { 'Content-Type': 'application/octet-stream' }; }
    if (keepalive && (value === null || value.length < 60000)) opts.keepalive = true;
    return fetch(BASE + key, opts).then(function (r) {
      if (!(r.ok || (value === null && r.status === 404))) throw new Error('HTTP ' + r.status);
      if (failed) { failed = false; showBadge('Saved to server', true); }
    }).catch(function (err) {
      failed = true;
      pending[key] = value;
      showBadge('Not saved to server (' + err.message + '). Retrying…', false);
      schedule(key, 5000);
    });
  }
  function flush(key, keepalive) {
    clearTimeout(timers[key]); delete timers[key];
    if (!(key in pending)) return;
    var value = pending[key]; delete pending[key];
    send(key, value, keepalive);
  }
  function schedule(key, ms) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () { flush(key, false); }, ms || DEBOUNCE_MS);
  }
  function flushAll(keepalive) { Object.keys(pending).forEach(function (k) { flush(k, keepalive); }); }

  proto.setItem = function (key, value) {
    var r = origSet.apply(this, arguments);
    if (this === ls && isKey(key)) { pending[key] = String(value); schedule(String(key)); }
    return r;
  };
  proto.removeItem = function (key) {
    var r = origRemove.apply(this, arguments);
    if (this === ls && isKey(key)) { pending[key] = null; schedule(String(key)); }
    return r;
  };

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushAll(true); });
  window.addEventListener('pagehide', function () { flushAll(true); });
  if (Object.keys(pending).length) setTimeout(function () { flushAll(false); }, 0);
  window.__railwaySync = { flush: function () { flushAll(false); }, keys: KEYS };
})();
