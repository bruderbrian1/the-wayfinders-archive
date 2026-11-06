/* =====================================================================
   ui/sigil.js — procedural SVG artwork (no external images)
   Exposes: WF.art
   ===================================================================== */
(function (WF) {
  'use strict';

  var U = WF.util, D = WF.data;

  function rngFor(str) { return new U.RNG(U.hashString(str)); }

  function rarityColor(r) {
    return (D.RARITY[r] || { color: '#8a97a3' }).color;
  }

  /* ---------------- item sigils ---------------- */

  function itemSigil(item, cls) {
    if (!item) return '';
    var rng = rngFor(item.instanceId || item.id || item.name);
    var col = rarityColor(item.rarity);
    var w = 100, h = 100;
    var uid = 'sg' + (item.instanceId || item.id || '').replace(/[^a-z0-9]/gi, '').slice(-10);
    var shapes = '';

    // shared outer rings
    shapes += '<circle cx="50" cy="50" r="34" fill="none" stroke="' + col + '" stroke-opacity=".28" stroke-width=".8"/>';
    shapes += '<circle cx="50" cy="50" r="42" fill="none" stroke="' + col + '" stroke-opacity=".13" stroke-width=".6" stroke-dasharray="2 5"/>';

    var cat = item.category;
    var i, a, x1, y1, x2, y2;

    if (cat === 'weapon') {
      for (i = 0; i < 3; i++) {
        var off = i * 6 - 6;
        shapes += '<path d="M' + (30 + off) + ' 74 L' + (64 + off) + ' 26 l7 5 -34 48 z" fill="' + col + '" fill-opacity="' + (0.32 - i * 0.08) + '" stroke="' + col + '" stroke-opacity=".7" stroke-width=".7"/>';
      }
      shapes += '<path d="M24 62 L44 82" stroke="' + col + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    } else if (cat === 'armor') {
      shapes += '<path d="M50 18 L76 29 v22 c0 16 -12 27 -26 33 -14 -6 -26 -17 -26 -33 V29 z" fill="' + col + '" fill-opacity=".14" stroke="' + col + '" stroke-opacity=".8" stroke-width="1"/>';
      shapes += '<path d="M38 34 h24 M38 46 h24 M38 58 h16" stroke="' + col + '" stroke-opacity=".4" stroke-width="1.2"/>';
      shapes += '<circle cx="50" cy="70" r="3.4" fill="' + col + '" fill-opacity=".55"/>';
    } else if (cat === 'relic') {
      shapes += '<circle cx="50" cy="50" r="23" fill="none" stroke="' + col + '" stroke-width="1.2" opacity=".85"/>';
      for (i = 0; i < 8; i++) {
        a = (i / 8) * Math.PI * 2;
        x1 = 50 + Math.cos(a) * 23; y1 = 50 + Math.sin(a) * 23;
        x2 = 50 + Math.cos(a) * (i % 2 ? 30 : 34); y2 = 50 + Math.sin(a) * (i % 2 ? 30 : 34);
        shapes += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="1.2" opacity=".7"/>';
      }
      shapes += '<path d="M50 34 L58 54 L50 66 L42 54 Z" fill="' + col + '" fill-opacity=".5" stroke="' + col + '" stroke-width=".8"/>';
    } else if (cat === 'artifact') {
      shapes += '<path d="M50 16 L82 34 v32 L50 84 L18 66 V34 Z" fill="' + col + '" fill-opacity=".1" stroke="' + col + '" stroke-opacity=".8" stroke-width="1.1"/>';
      shapes += '<path d="M50 30 L68 42 v18 L50 72 L32 60 V42 Z" fill="none" stroke="' + col + '" stroke-opacity=".5" stroke-width="1"/>';
      shapes += '<circle cx="50" cy="50" r="5" fill="' + col + '" fill-opacity=".6"/>';
      shapes += '<path d="M50 50 L50 72 M50 50 L68 42" stroke="' + col + '" stroke-opacity=".5" stroke-width="1"/>';
    } else if (cat === 'companion') {
      shapes += '<rect x="30" y="32" width="40" height="36" rx="7" fill="' + col + '" fill-opacity=".1" stroke="' + col + '" stroke-opacity=".75" stroke-width="1.1"/>';
      shapes += '<circle cx="41" cy="48" r="3.4" fill="' + col + '" fill-opacity=".85"/>';
      shapes += '<circle cx="59" cy="48" r="3.4" fill="' + col + '" fill-opacity=".85"/>';
      shapes += '<path d="M40 59 h20" stroke="' + col + '" stroke-opacity=".6" stroke-width="1.2"/>';
      shapes += '<path d="M50 32 v-8 M38 68 v8 M62 68 v8" stroke="' + col + '" stroke-opacity=".45" stroke-width="1"/>';
      shapes += '<circle cx="50" cy="22" r="2" fill="' + col + '"/>';
    } else if (cat === 'supply') {
      shapes += '<rect x="28" y="30" width="44" height="42" rx="2" fill="' + col + '" fill-opacity=".1" stroke="' + col + '" stroke-opacity=".75" stroke-width="1.1"/>';
      shapes += '<path d="M28 42 h44 M40 30 v12 M60 30 v12" stroke="' + col + '" stroke-opacity=".45" stroke-width="1"/>';
      shapes += '<path d="M50 54 v14 M43 61 h14" stroke="' + col + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    } else if (cat === 'material') {
      for (i = 0; i < 3; i++) {
        shapes += '<path d="M' + (26 + i * 4) + ' ' + (66 - i * 13) + ' h22 l8 8 h-22 z" fill="' + col + '" fill-opacity="' + (0.12 + i * 0.06) + '" stroke="' + col + '" stroke-opacity=".6" stroke-width=".9"/>';
      }
      shapes += '<circle cx="63" cy="36" r="2" fill="' + col + '" opacity=".8"/>';
    } else if (cat === 'route') {
      shapes += '<path d="M26 72 C36 58 36 46 50 42 C64 38 62 26 74 22" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="4 3" opacity=".85"/>';
      shapes += '<circle cx="26" cy="72" r="3" fill="' + col + '"/>';
      shapes += '<circle cx="74" cy="22" r="3" fill="none" stroke="' + col + '" stroke-width="1.4"/>';
      shapes += '<circle cx="50" cy="42" r="2" fill="' + col + '" opacity=".6"/>';
    } else {
      shapes += '<circle cx="50" cy="50" r="12" fill="' + col + '" fill-opacity=".3"/>';
    }

    // procedural star specks
    for (i = 0; i < 9; i++) {
      var sx = rng.int(8, 92), sy = rng.int(8, 92), sr = rng.float(0.4, 1.2);
      shapes += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr.toFixed(2) + '" fill="' + col + '" opacity="' + rng.float(0.12, 0.5).toFixed(2) + '"/>';
    }

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" class="' + (cls || '') + '" role="img" aria-label="' + U.esc(item.name) + '">' +
      '<defs><radialGradient id="' + uid + '" cx="50%" cy="42%" r="60%">' +
      '<stop offset="0%" stop-color="' + col + '" stop-opacity=".20"/>' +
      '<stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="100" height="100" fill="url(#' + uid + ')"/>' + shapes + '</svg>';
  }

  /* ---------------- world / hero art ---------------- */

  function worldArt(exp) {
    if (!exp) return '';
    var rng = rngFor(exp.id + 'art');
    var p = exp.palette || { a: '#3ff0d0', b: '#d8a85a', c: '#cfe0ea' };
    var s = '';
    var i;

    var defs = '<defs>' +
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#05070a"/>' +
      '<stop offset="55%" stop-color="' + p.a + '" stop-opacity=".14"/>' +
      '<stop offset="100%" stop-color="' + p.b + '" stop-opacity=".10"/>' +
      '</linearGradient>' +
      '<radialGradient id="glow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + p.a + '" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="' + p.a + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="fade" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="#05070a" stop-opacity=".95"/>' +
      '<stop offset="100%" stop-color="#05070a" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="planetG" cx="34%" cy="28%" r="78%">' +
      '<stop offset="0%" stop-color="' + p.c + '" stop-opacity=".52"/>' +
      '<stop offset="42%" stop-color="' + p.a + '" stop-opacity=".28"/>' +
      '<stop offset="100%" stop-color="#01060a" stop-opacity=".95"/>' +
      '</radialGradient>' +
      '<linearGradient id="rimG" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + p.b + '" stop-opacity=".7"/>' +
      '<stop offset="100%" stop-color="' + p.a + '" stop-opacity="0"/>' +
      '</linearGradient></defs>';

    s += '<rect width="400" height="210" fill="url(#sky)"/>';

    // stars / particles
    for (i = 0; i < 44; i++) {
      s += '<circle cx="' + rng.int(0, 400) + '" cy="' + rng.int(0, 130) + '" r="' + rng.float(0.3, 1.5).toFixed(2) +
        '" fill="' + (i % 5 === 0 ? p.b : p.c) + '" opacity="' + rng.float(0.1, 0.65).toFixed(2) + '"/>';
    }

    var glX = rng.int(90, 320), glY = rng.int(60, 150);
    s += '<ellipse cx="' + glX + '" cy="' + glY + '" rx="150" ry="110" fill="url(#glow)" opacity=".65"/>';

    function horizon(y, fill, op) {
      var d = 'M0 ' + y;
      for (var x = 0; x <= 400; x += 40) {
        d += ' L' + x + ' ' + (y + rng.int(-16, 12));
      }
      d += ' L400 210 L0 210 Z';
      return '<path d="' + d + '" fill="' + fill + '" opacity="' + op + '"/>';
    }

    var world = exp.worldId;

    // shared alien sky: a banded planet and a small moon (reference 3)
    if (world !== 'cosmic-void' && world !== 'verdant-cataclysm') {
      var px = rng.int(250, 350), py = rng.int(24, 64), pr = rng.int(38, 70);
      s += '<circle cx="' + px + '" cy="' + py + '" r="' + pr + '" fill="url(#planetG)"/>';
      s += '<circle cx="' + px + '" cy="' + py + '" r="' + pr + '" fill="none" stroke="url(#rimG)" stroke-width="1.2" opacity=".8"/>';
      s += '<path d="M' + (px - pr) + ' ' + py + ' q' + pr + ' ' + Math.round(pr * 0.35) + ' ' + (pr * 2) + ' 0" fill="none" stroke="' + p.c + '" stroke-opacity=".16" stroke-width="2"/>';
      s += '<circle cx="' + rng.int(60, 130) + '" cy="' + rng.int(26, 52) + '" r="' + rng.int(5, 11) + '" fill="' + p.c + '" fill-opacity=".18" stroke="' + p.a + '" stroke-opacity=".3"/>';
    }

    if (world === 'cosmic-void') {
      s += '<circle cx="' + rng.int(240, 330) + '" cy="' + rng.int(55, 90) + '" r="' + rng.int(26, 44) + '" fill="none" stroke="' + p.a + '" stroke-opacity=".55" stroke-width="1"/>';
      s += '<circle cx="' + rng.int(240, 330) + '" cy="' + rng.int(55, 90) + '" r="' + rng.int(44, 62) + '" fill="none" stroke="' + p.b + '" stroke-opacity=".22" stroke-width=".7" stroke-dasharray="3 8"/>';
      for (i = 0; i < 5; i++) {
        s += '<line x1="' + rng.int(0, 400) + '" y1="' + rng.int(0, 90) + '" x2="' + rng.int(0, 400) + '" y2="' + rng.int(100, 170) + '" stroke="' + p.c + '" stroke-opacity=".14" stroke-width=".8"/>';
      }
      s += '<path d="M0 178 Q100 150 200 176 T400 160 L400 210 L0 210 Z" fill="#0a0d14" opacity=".9"/>';
    } else if (world === 'sunken-cyber-grid') {
      // skyline
      for (i = 0; i < 14; i++) {
        var bw = rng.int(18, 44), bh = rng.int(30, 96), bx = rng.int(-10, 390);
        s += '<rect x="' + bx + '" y="' + (196 - bh) + '" width="' + bw + '" height="' + bh + '" fill="#070c12" stroke="' + p.a + '" stroke-opacity=".22" stroke-width=".7"/>';
        for (var wy = 196 - bh + 8; wy < 188; wy += 12) {
          s += '<line x1="' + (bx + 4) + '" y1="' + wy + '" x2="' + (bx + bw - 4) + '" y2="' + wy + '" stroke="' + (rng.chance(0.5) ? p.a : p.b) + '" stroke-opacity="' + rng.float(0.06, 0.3).toFixed(2) + '" stroke-width="1.4"/>';
        }
      }
      s += '<rect y="176" width="400" height="34" fill="' + p.a + '" fill-opacity=".10"/>';
      for (i = 0; i < 9; i++) {
        s += '<line x1="0" y1="' + rng.int(176, 210) + '" x2="400" y2="' + rng.int(176, 210) + '" stroke="' + p.b + '" stroke-opacity=".18" stroke-width=".7"/>';
      }
    } else if (world === 'ashen-kingdoms') {
      // ruined towers
      for (i = 0; i < 5; i++) {
        var tw = rng.int(26, 48), th = rng.int(60, 130), tx = rng.int(20, 340);
        s += '<path d="M' + tx + ' 200 V' + (200 - th) + ' l' + (tw / 2) + ' -18 l' + (tw / 2) + ' 18 V200 Z" fill="#080b10" stroke="' + p.b + '" stroke-opacity=".2" stroke-width=".8"/>';
        s += '<rect x="' + (tx + tw / 2 - 3) + '" y="' + (200 - th + 22) + '" width="6" height="9" fill="' + p.b + '" fill-opacity=".32"/>';
      }
      // ash
      for (i = 0; i < 34; i++) {
        s += '<circle cx="' + rng.int(0, 400) + '" cy="' + rng.int(10, 200) + '" r="' + rng.float(0.5, 1.6).toFixed(2) + '" fill="' + p.c + '" opacity="' + rng.float(0.1, 0.45).toFixed(2) + '"/>';
      }
      s += '<path d="M0 186 Q80 172 160 184 T400 176 L400 210 L0 210 Z" fill="#0a0a0c" opacity=".92"/>';
    } else if (world === 'forgotten-wastes') {
      var sunX = rng.int(90, 310);
      s += '<circle cx="' + sunX + '" cy="60" r="' + rng.int(18, 28) + '" fill="' + p.a + '" fill-opacity=".28"/>';
      s += '<circle cx="' + sunX + '" cy="60" r="' + rng.int(30, 38) + '" fill="none" stroke="' + p.a + '" stroke-opacity=".3" stroke-width="1"/>';
      s += horizon(150, p.a, 0.07);
      s += horizon(172, p.b, 0.05);
      s += '<path d="M0 188 Q100 168 200 188 T400 178 L400 210 L0 210 Z" fill="#0b0906" opacity=".9"/>';
      for (i = 0; i < 6; i++) {
        s += '<path d="M' + rng.int(0, 380) + ' ' + rng.int(150, 200) + ' q30 -8 60 0" fill="none" stroke="' + p.c + '" stroke-opacity=".13" stroke-width=".8"/>';
      }
    } else if (world === 'hollow-dimension') {
      s += '<g opacity=".8">';
      for (i = 0; i < 4; i++) {
        var cx = rng.int(40, 360), cy2 = rng.int(40, 150), sz = rng.int(24, 54);
        s += '<path d="M' + cx + ' ' + (cy2 - sz) + ' L' + (cx + sz) + ' ' + cy2 + ' L' + cx + ' ' + (cy2 + sz) + ' L' + (cx - sz) + ' ' + cy2 + ' Z" fill="none" stroke="' + (i % 2 ? p.b : p.a) + '" stroke-opacity=".35" stroke-width="1"/>';
      }
      s += '</g>';
      for (i = 0; i < 5; i++) {
        var yx = rng.int(10, 390);
        s += '<path d="M' + yx + ' 0 L' + (yx + rng.int(-40, 40)) + ' 210" stroke="' + p.c + '" stroke-opacity=".13" stroke-width="1"/>';
      }
      s += '<path d="M0 190 L400 190 L400 210 L0 210 Z" fill="#08070f" opacity=".85"/>';
    } else {
      // verdant
      for (i = 0; i < 7; i++) {
        var vx = rng.int(0, 400), vh = rng.int(70, 160);
        s += '<path d="M' + vx + ' 205 C' + (vx - 6) + ' ' + (205 - vh * 0.5) + ' ' + (vx + 12) + ' ' + (185 - vh) + ' ' + (vx + 4) + ' ' + (200 - vh) + '" fill="none" stroke="' + p.a + '" stroke-opacity=".3" stroke-width="1.2"/>';
      }
      for (i = 0; i < 16; i++) {
        s += '<circle cx="' + rng.int(0, 400) + '" cy="' + rng.int(40, 190) + '" r="' + rng.float(1, 3).toFixed(1) + '" fill="' + p.a + '" opacity="' + rng.float(0.05, 0.35).toFixed(2) + '"/>';
      }
      s += '<path d="M0 188 Q60 150 120 180 T260 164 T400 186 L400 210 L0 210 Z" fill="#060c08" opacity=".9"/>';
    }

    // vignette + fade
    s += '<rect width="400" height="210" fill="url(#fade)"/>';
    s += '<rect width="400" height="210" fill="none" stroke="' + p.a + '" stroke-opacity=".12"/>';

    // coordinate tick marks
    for (i = 1; i < 8; i++) {
      s += '<line x1="' + (i * 50) + '" y1="0" x2="' + (i * 50) + '" y2="4" stroke="' + p.a + '" stroke-opacity=".35"/>';
    }

    return '<svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + defs + s + '</svg>';
  }

  /* ---------------- matrix chart ---------------- */

  function matrixSvg(routes, activeId) {
    if (!routes || !routes.length) return '';
    var W = 400, H = 300, pad = 40;
    var s = '';

    function x(v) { return pad + (v / 100) * (W - pad - 12); }
    function y(v) { return H - pad - (v / 100) * (H - pad - 16); }

    // danger zones (background bands by collapse index)
    s += '<defs>' +
      '<linearGradient id="mx" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#35ffb0" stop-opacity=".08"/>' +
      '<stop offset="45%" stop-color="#ffb347" stop-opacity=".05"/>' +
      '<stop offset="100%" stop-color="#ff3d6e" stop-opacity=".11"/>' +
      '</linearGradient>' +
      '<linearGradient id="my" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="#ff3d6e" stop-opacity=".08"/>' +
      '<stop offset="100%" stop-color="#35ffb0" stop-opacity=".04"/>' +
      '</linearGradient>' +
      '</defs>';
    s += '<rect x="' + pad + '" y="16" width="' + (W - pad - 12) + '" height="' + (H - pad - 16) + '" fill="url(#mx)"/>';
    s += '<rect x="' + pad + '" y="16" width="' + (W - pad - 12) + '" height="' + (H - pad - 16) + '" fill="url(#my)"/>';

    // grid
    for (var g = 0; g <= 100; g += 25) {
      s += '<line x1="' + x(g) + '" y1="16" x2="' + x(g) + '" y2="' + (H - pad) + '" stroke="#123845" stroke-width=".7" stroke-dasharray="2 5"/>';
      s += '<line x1="' + pad + '" y1="' + y(g) + '" x2="' + (W - 12) + '" y2="' + y(g) + '" stroke="#123845" stroke-width=".7" stroke-dasharray="2 5"/>';
    }

    // axes
    s += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - 12) + '" y2="' + (H - pad) + '" stroke="#1c5566" stroke-width="1"/>';
    s += '<line x1="' + pad + '" y1="16" x2="' + pad + '" y2="' + (H - pad) + '" stroke="#1c5566" stroke-width="1"/>';

    // axis labels
    s += '<text x="' + (W / 2) + '" y="' + (H - 8) + '" fill="#6f7d8b" font-size="8" font-family="monospace" text-anchor="middle" letter-spacing="1.4">SPATIAL COLLAPSE INDEX →</text>';
    s += '<text x="12" y="' + (H / 2) + '" fill="#6f7d8b" font-size="8" font-family="monospace" text-anchor="middle" letter-spacing="1.4" transform="rotate(-90 12 ' + (H / 2) + ')">SURVIVAL RATE →</text>';

    // tick labels
    [0, 25, 50, 75, 100].forEach(function (t) {
      s += '<text x="' + x(t) + '" y="' + (H - pad + 12) + '" fill="#46545f" font-size="7" font-family="monospace" text-anchor="middle">' + t + '</text>';
      s += '<text x="' + (pad - 6) + '" y="' + (y(t) + 2.5) + '" fill="#46545f" font-size="7" font-family="monospace" text-anchor="end">' + t + '</text>';
    });

    // route trails from origin-ish anchor
    routes.forEach(function (r) {
      var active = r.id === activeId;
      var col = r.isSafest ? '#35ffb0' : r.isDeadliest ? '#ff3d6e' : '#35e6ff';
      s += '<circle cx="' + x(r.collapseIndex) + '" cy="' + y(r.survivalRate) + '" r="' + (active ? 12 : 8) + '" fill="' + col + '" fill-opacity=".08"/>';
      if (active) {
        s += '<circle cx="' + x(r.collapseIndex) + '" cy="' + y(r.survivalRate) + '" r="16" fill="none" stroke="' + col + '" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 4"/>';
      }
      s += '<circle cx="' + x(r.collapseIndex) + '" cy="' + y(r.survivalRate) + '" r="' + (active ? 5 : 3.6) + '" fill="' + col + '" stroke="#05070a" stroke-width="1.4"/>';
      s += '<text x="' + (x(r.collapseIndex) + 9) + '" y="' + (y(r.survivalRate) - 6) + '" fill="' + col + '" font-size="7.5" font-family="monospace" letter-spacing=".8">' + r.designation + '</text>';
    });

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="matrix-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Route efficiency matrix">' + s + '</svg>';
  }

  WF.art = { itemSigil: itemSigil, worldArt: worldArt, matrixSvg: matrixSvg, rarityColor: rarityColor };
})(window.WF = window.WF || {});
