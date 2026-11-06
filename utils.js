/* =====================================================================
   core/utils.js — deterministic RNG, formatting, DOM helpers
   Exposes: window.WF.util
   ===================================================================== */
(function (WF) {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */

  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    if (typeof seed === 'string') seed = hashString(seed);
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
    this.calls = 0;
  }

  RNG.prototype.float = function (min, max) {
    if (min === undefined) return this._next();
    this.calls++;
    return min + this._next() * (max - min);
  };

  RNG.prototype.int = function (min, max) {
    this.calls++;
    return Math.floor(min + this._next() * (max - min + 1));
  };

  RNG.prototype.chance = function (p) {
    this.calls++;
    return this._next() < p;
  };

  RNG.prototype.pick = function (arr) {
    if (!arr || !arr.length) return null;
    this.calls++;
    return arr[Math.floor(this._next() * arr.length)];
  };

  RNG.prototype.weighted = function (entries) {
    // entries: [{ weight, value }] or [[value, weight]]
    var total = 0, i, e, w;
    for (i = 0; i < entries.length; i++) {
      e = entries[i];
      w = Array.isArray(e) ? e[1] : e.weight;
      total += w;
    }
    if (total <= 0) return entries.length ? (Array.isArray(entries[0]) ? entries[0][0] : entries[0].value) : null;
    var roll = this._next() * total;
    this.calls++;
    for (i = 0; i < entries.length; i++) {
      e = entries[i];
      w = Array.isArray(e) ? e[1] : e.weight;
      roll -= w;
      if (roll <= 0) return Array.isArray(e) ? e[0] : e.value;
    }
    e = entries[entries.length - 1];
    return Array.isArray(e) ? e[0] : e.value;
  };

  RNG.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this._next() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    this.calls++;
    return a;
  };

  RNG.prototype.sample = function (arr, n) {
    return this.shuffle(arr).slice(0, n);
  };

  /* ---------- numeric helpers ---------- */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
  function pct(v, d) { return round(v, d === undefined ? 0 : d) + '%'; }
  function signed(v, d) { var n = round(v, d === undefined ? 0 : d); return (n > 0 ? '+' : '') + n; }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- formatting ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function roman(n) {
    var map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
      [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var out = '';
    for (var i = 0; i < map.length; i++) {
      while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
    }
    return out || 'O';
  }

  function pad(n, width) {
    var s = String(n);
    while (s.length < (width || 3)) s = '0' + s;
    return s;
  }

  function signedPct(v) { return (v > 0 ? '+' : '') + round(v, 1) + '%'; }

  function titleCase(s) {
    return String(s).replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function humanize(key) {
    var labels = {
      navSkill: 'Navigation Skill', combatPower: 'Combat Power', critChance: 'Crit Chance',
      radiationRes: 'Radiation Res.', temporalRes: 'Temporal Res.', spatialRes: 'Spatial Res.',
      damageReduction: 'Damage Reduction', carry: 'Carry Capacity'
    };
    if (labels[key]) return labels[key];
    return String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- risk classification ---------- */

  function riskClass(survival) {
    if (survival >= 80) return { key: 'low', label: 'Low Risk' };
    if (survival >= 65) return { key: 'moderate', label: 'Moderate Risk' };
    if (survival >= 45) return { key: 'elevated', label: 'Elevated Risk' };
    if (survival >= 25) return { key: 'severe', label: 'Severe Risk' };
    return { key: 'critical', label: 'Critical Risk' };
  }

  /* ---------- DOM ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  function on(root, event, selector, handler) {
    root.addEventListener(event, function (e) {
      var target = e.target.closest(selector);
      if (target && root.contains(target)) handler.call(target, e, target);
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  WF.util = {
    hashString: hashString,
    RNG: RNG,
    mulberry32: mulberry32,
    clamp: clamp,
    round: round,
    pct: pct,
    signed: signed,
    signedPct: signedPct,
    lerp: lerp,
    esc: esc,
    roman: roman,
    pad: pad,
    titleCase: titleCase,
    humanize: humanize,
    uid: uid,
    riskClass: riskClass,
    $: $, $$: $$, el: el, on: on, debounce: debounce
  };
})(window.WF = window.WF || {});
