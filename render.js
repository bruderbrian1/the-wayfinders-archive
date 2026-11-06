/* =====================================================================
   ui/render.js — shell: header, archive, journey matrix, events
   Also exposes shared render helpers used by ui/panels.js
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util, A = WF.art;

  var ui = WF.ui = WF.ui || {};
  var state = null;

  /* ---------------- small helpers ---------------- */

  function pctClass(v) { return v >= 66 ? '' : v >= 40 ? 'warn' : 'danger'; }

  function bar(value, cls) {
    return '<div class="bar ' + (cls || '') + '"><i style="width:' + U.clamp(value, 0, 100) + '%"></i></div>';
  }

  function stat(k, v, cls) {
    return '<div class="stat"><div class="k">' + U.esc(k) + '</div><div class="v ' + (cls || '') + '">' + v + '</div></div>';
  }

  function riskPill(risk) {
    return '<span class="risk-pill ' + risk.key + '">' + U.esc(risk.label) + '</span>';
  }

  function rarityBadge(r) {
    var def = D.RARITY[r] || D.RARITY.common;
    return '<span class="rar ' + def.key + '">' + def.label + '</span>';
  }

  function section(label, cls) {
    return '<div class="section-label ' + (cls || '') + '">' + U.esc(label) + '</div>';
  }

  ui.helpers = { bar: bar, stat: stat, riskPill: riskPill, rarityBadge: rarityBadge, section: section, pctClass: pctClass };

  /* ---------------- header ---------------- */

  function renderHeader() {
    var exp = state.expedition;
    var breakdown = WF.inventory.survivalBreakdown(state);
    var tuned = WF.engine.tunerResult(state);
    var survival = tuned ? tuned.estimated : (breakdown ? breakdown.survival : 0);
    var cond = Math.round(state.condition);
    var status = cond <= 15 ? 'CRITICAL' : cond <= 45 ? 'DEGRADED' : survival >= 70 ? 'EN ROUTE' : 'ACTIVE';
    var statusClass = cond <= 15 ? 'neg' : cond <= 45 ? '' : 'pos';

    return '' +
      '<div class="topbar">' +
      '<div class="brand">' +
      '<div class="brand-mark">' +
      '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="20" cy="20" r="14" stroke="#3ff0d0" stroke-opacity=".55" stroke-width="1"/>' +
      '<path d="M20 3 L23 17 L37 20 L23 23 L20 37 L17 23 L3 20 L17 17 Z" fill="#d8a85a" fill-opacity=".7" stroke="#d8a85a" stroke-width=".6"/>' +
      '<circle cx="20" cy="20" r="2.4" fill="#05070a" stroke="#3ff0d0" stroke-width="1"/>' +
      '</svg></div>' +
      '<div><div class="brand-title">The Wayfinder\'s Archive</div>' +
      '<div class="brand-sub">Cartographic Survival Intelligence · v2.0</div></div>' +
      '</div>' +
      '<div class="top-divider"></div>' +
      '<div class="top-meta">' +
      '<div class="meta-cell"><div class="meta-label">Cartographer Status</div><div class="meta-value ' + statusClass + '">● ' + status + ' · ' + cond + '% INTEGRITY</div></div>' +
      '<div class="meta-cell" style="min-width:0;flex:1"><div class="meta-label">Current Expedition</div><div class="meta-value gold" title="' + U.esc(exp.name) + '">' + U.esc(exp.name) + '</div></div>' +
      '<div class="meta-cell"><div class="meta-label">World Classification</div><div class="meta-value accent">' + U.esc(exp.worldName) + '</div></div>' +
      '<div class="meta-cell"><div class="meta-label">Expedition No.</div><div class="meta-value">' + U.pad(exp.number, 3) + ' / ' + exp.seedLabel + '</div></div>' +
      '</div>' +
      '<div class="survival-chip" title="Tuned estimate · base ' + (breakdown ? Math.round(breakdown.survival) : 0) + '%">' +
      '<div class="num">' + Math.round(survival) + '<span style="font-size:12px">%</span></div>' +
      '<div class="lbl">Tuned Survival</div>' +
      '</div>' +
      '<button class="btn reroll-btn" data-action="reroll" title="Generate an entirely new expedition">' +
      '<span class="glyph">⟳</span> Reroll Horizon' +
      '</button>' +
      '</div>';
  }

  /* ---------------- archive ---------------- */

  function renderArchive() {
    var counts = WF.inventory.counts(state);
    var settings = state.settings;
    var list = WF.inventory.query(state, {
      category: settings.category, search: settings.search, sort: settings.sort
    });

    var chips = '<div class="chip-row" style="margin-bottom:10px">' +
      '<span class="chip ' + (settings.category === 'all' ? 'active' : '') + '" data-action="filter-cat" data-cat="all">All <span class="count">' + counts.all + '</span></span>' +
      D.CATEGORIES.map(function (c) {
        return '<span class="chip ' + (settings.category === c.id ? 'active' : '') + '" data-action="filter-cat" data-cat="' + c.id + '">' +
          c.label + ' <span class="count">' + (counts[c.id] || 0) + '</span></span>';
      }).join('') + '</div>';

    var sortSel = '<div class="row" style="margin-bottom:10px">' +
      '<div class="field grow"><input id="archiveSearch" type="search" placeholder="Search the archive…" value="' + U.esc(settings.search) + '" autocomplete="off"></div>' +
      '<select id="sortSelect" style="max-width:132px" aria-label="Sort archive">' +
      ['rarity', 'performance', 'level', 'name', 'quantity'].map(function (s) {
        var labels = { rarity: 'Rarity', performance: 'Performance', level: 'Level', name: 'Name', quantity: 'Quantity' };
        return '<option value="' + s + '"' + (settings.sort === s ? ' selected' : '') + '>Sort: ' + labels[s] + '</option>';
      }).join('') + '</select></div>';

    var cards = list.map(function (it) {
      var isSel = state.selection.itemId === it.instanceId;
      var perf = WF.inventory.performance(it);
      return '<div class="item-card rarity-' + (it.rarity || 'common') + ' ' + (isSel ? 'selected' : '') + ' ' + (it.equipped ? 'equipped' : '') + '" data-action="select-item" data-id="' + U.esc(it.instanceId) + '" role="button" tabindex="0">' +
        '<div class="item-sigil">' + A.itemSigil(it) + '</div>' +
        '<div class="grow" style="min-width:0">' +
        '<div class="item-line-main"><span class="item-name">' + U.esc(it.name) + '</span>' + (it.qty > 1 ? '<span class="qty">×' + it.qty + '</span>' : '') + '</div>' +
        '<div class="item-sub">' + rarityBadge(it.rarity) + '<span>LV ' + (it.level || 1) + '</span><span>·</span><span>PERF ' + perf + '</span></div>' +
        '<div class="item-sub" style="margin-top:3px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.esc(it.classification || '') + '</span></div>' +
        '</div></div>';
    }).join('');

    if (!list.length) {
      cards = '<div class="empty">No entries match this query.<br><span style="color:#33424e">Clear filters or scan the sector.</span></div>';
    }

    var w = WF.inventory.weight(state);
    var cap = WF.inventory.capacity(state);
    var load = Math.round((w / cap) * 100);

    return '<section class="panel" id="archivePanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> I. The Archive <span class="idx">/ ' + counts.all + ' entries</span></div>' +
      '<span class="meta-label" style="margin:0">' + U.pad(exp_number(), 3) + '</span></div>' +
      '<div class="panel-body" style="padding-bottom:10px">' + sortSel + chips + '</div>' +
      '<div class="archive-list scroll-y">' + cards + '</div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line-soft);padding-top:12px">' +
      '<div class="kv"><span class="k">Carrying Capacity</span><span class="v">' + w + ' / ' + cap + ' kg</span></div>' +
      '<div style="margin-top:7px">' + bar(load, load > 90 ? 'danger' : load > 70 ? 'warn' : 'gold') + '</div>' +
      '<div class="help-line" style="margin-top:8px">Select an entry to open its dossier. Equip from the dossier to apply its statistics.</div>' +
      '</div></section>';
  }

  function exp_number() { return state.expedition ? state.expedition.number : 0; }
  ui.exp_number = exp_number;

  /* ---------------- journey matrix ---------------- */

  function renderMatrix() {
    var routes = state.routes || [];
    var active = state.activeRouteId;
    var safest = routes.filter(function (r) { return r.isSafest; })[0];
    var deadliest = routes.filter(function (r) { return r.isDeadliest; })[0];
    var avgSurvival = routes.length ? Math.round(routes.reduce(function (s, r) { return s + r.survivalRate; }, 0) / routes.length) : 0;
    var avgCollapse = routes.length ? Math.round(routes.reduce(function (s, r) { return s + r.collapseIndex; }, 0) / routes.length) : 0;

    var cards = routes.map(function (r) {
      var cls = (r.id === active ? 'active ' : '') + (r.isSafest ? 'safest ' : '') + (r.isDeadliest ? 'deadliest' : '');
      return '<div class="route-card ' + cls + '" data-action="select-route" data-id="' + r.id + '" role="button" tabindex="0">' +
        '<div class="route-top"><span class="route-name">' + r.designation + ' · ' + U.esc(r.name) + '</span>' +
        '<span class="route-flags">' + (r.isSafest ? '<span class="flag safe">SAFEST</span>' : '') +
        (r.isDeadliest ? '<span class="flag dead">DEADLIEST</span>' : '') +
        (r.id === active ? '<span class="flag sel">ACTIVE</span>' : '') + '</span></div>' +
        '<div class="route-metrics">' +
        '<div class="rm"><div class="k">Survival</div><div class="v" style="color:var(--teal)">' + r.survivalRate + '%</div></div>' +
        '<div class="rm"><div class="k">Stability</div><div class="v">' + r.stability + '%</div></div>' +
        '<div class="rm"><div class="k">Collapse</div><div class="v" style="color:' + (r.collapseIndex > 60 ? 'var(--danger)' : r.collapseIndex > 40 ? 'var(--warn)' : 'var(--ok)') + '">' + r.collapseIndex + '%</div></div>' +
        '<div class="rm"><div class="k">Pick Freq.</div><div class="v">' + r.pickFreq + '%</div></div>' +
        '<div class="rm"><div class="k">Compat.</div><div class="v">' + r.compatibility + '%</div></div>' +
        '<div class="rm"><div class="k">Hazard Exp.</div><div class="v">' + r.hazardExposure + '%</div></div>' +
        '<div class="rm"><div class="k">Resource Req.</div><div class="v">' + r.resourceRequirement + '%</div></div>' +
        '<div class="rm"><div class="k">Distance</div><div class="v">' + r.distance + ' km</div></div>' +
        '</div></div>';
    }).join('');

    return '<section class="panel matrix-panel" id="matrixPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> III. Live Journey Matrix</div>' +
      '<span class="meta-label" style="margin:0">' + routes.length + ' ROUTES · SEED ' + state.expedition.seedLabel + '</span></div>' +
      '<div class="panel-body" style="padding-bottom:8px">' +
      '<div class="matrix-wrap">' + A.matrixSvg(routes, active) + '</div>' +
      '<div class="matrix-legend">' +
      '<span class="legend-item"><span class="legend-dot" style="background:var(--ok)"></span>SAFEST</span>' +
      '<span class="legend-item"><span class="legend-dot" style="background:var(--danger)"></span>DEADLIEST</span>' +
      '<span class="legend-item"><span class="legend-dot" style="background:var(--teal)"></span>ACTIVE</span>' +
      '<span class="legend-item" style="margin-left:auto">AVG SURVIVAL ' + avgSurvival + '%</span>' +
      '</div>' +
      '<div class="row" style="justify-content:space-between;margin-top:2px">' +
      '<span class="help-line">Y = survival rate · X = spatial collapse index</span>' +
      '<span class="help-line">AVG COLLAPSE ' + avgCollapse + '%</span></div>' +
      '</div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line-soft);padding-top:12px;display:flex;flex-direction:column;gap:8px;max-height:470px;overflow-y:auto">' +
      cards +
      '</div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line-soft);padding-top:10px">' +
      '<div class="kv"><span class="k">Safest Route</span><span class="v" style="color:var(--ok)">' + (safest ? safest.designation + ' · ' + safest.survivalRate + '%' : '—') + '</span></div>' +
      '<div class="kv"><span class="k">Most Dangerous</span><span class="v" style="color:var(--danger)">' + (deadliest ? deadliest.designation + ' · ' + deadliest.collapseIndex + '% collapse' : '—') + '</span></div>' +
      '<div class="help-line" style="margin-top:8px">Selecting a route applies its survival modifier to the expedition model and the Tuner.</div>' +
      '</div></section>';
  }

  /* ---------------- compare tray ---------------- */

  function renderCompareTray() {
    var ids = state.selection.compare || [];
    if (ids.length < 1) return '';
    var items = ids.map(function (id) { return WF.inventory.get(state, id); }).filter(Boolean);
    var chips = items.map(function (it) {
      return '<span class="tag gold">' + U.esc(it.name) + '</span>';
    }).join('');
    var button = items.length === 2
      ? '<button class="btn sm gold" data-action="open-compare">Compare</button>'
      : '<span class="help-line">Select one more item</span>';
    return '<div class="compare-tray"><span class="lbl">Compare</span>' + chips + button +
      '<button class="btn sm" data-action="clear-compare">Clear</button></div>';
  }

  /* ---------------- toasts / transition ---------------- */

  function toast(message, kind) {
    var host = document.getElementById('toastHost');
    if (!host) return;
    var node = document.createElement('div');
    node.className = 'toast ' + (kind || '');
    node.textContent = message;
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('out');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 320);
    }, 2400);
  }

  function transition() {
    var host = document.getElementById('fxHost');
    if (!host) return;
    host.innerHTML = '<div class="flash"></div><div class="scanline"></div>';
    setTimeout(function () { host.innerHTML = ''; }, 1000);
  }

  /* ---------------- rendering ---------------- */

  function render() {
    if (!state) return;
    document.getElementById('header').innerHTML = renderHeader();
    var nav = document.getElementById('viewNav');
    if (nav) nav.innerHTML = WF.deck ? WF.deck.renderNav() : '';

    var view = state.ui.view || 'survival';
    var survival = document.getElementById('survivalView');
    var deckView = document.getElementById('deckView');
    if (survival) survival.style.display = view === 'survival' ? '' : 'none';
    if (deckView) {
      deckView.style.display = view === 'survival' ? 'none' : '';
      deckView.innerHTML = view === 'survival' ? '' : (WF.deck ? WF.deck.render(view) : '');
    }

    if (view === 'survival') {
      document.getElementById('archivePanel').outerHTML = renderArchive();
      document.getElementById('matrixPanel').outerHTML = renderMatrix();
      WF.ui.renderTelemetry();
      WF.ui.renderTuner();
      WF.ui.renderOps();
      WF.ui.renderResources();
      WF.ui.renderCompanions();
      WF.ui.renderLog();
      var tray = document.getElementById('compareTray');
      if (tray) tray.outerHTML = '<div id="compareTray">' + renderCompareTray() + '</div>';
    }

    var fs = document.getElementById('footerSeed');
    if (fs) fs.textContent = 'EXP ' + U.pad(state.expedition.number, 3) + ' · SEED ' + state.expedition.seedLabel;
  }

  /** Adopt a state object returned by import/reset/migration paths. */
  function adopt(next) {
    state = next;
    ui.state = state;
    state.selection = state.selection || { itemId: null, compare: [] };
    state.ui = state.ui || { view: 'survival' };
    if (state.selection.itemId && !WF.inventory.get(state, state.selection.itemId)) state.selection.itemId = null;
    WF.store.save(state);
    render();
  }

  /** Render everything except sliders (used during slider drag). */
  function renderLight() {
    document.getElementById('header').innerHTML = renderHeader();
    WF.ui.renderTuner();
    WF.ui.renderTelemetry();
  }

  /* ---------------- actions ---------------- */

  var handlers = {
    reroll: function () {
      transition();
      setTimeout(function () {
        var res = WF.engine.reroll(state, { seed: WF.store.makeSeed() });
        state.__restored = false;
        WF.store.save(state);
        render();
        toast('HORIZON REROLLED — ' + res.expedition.name + ' · ' + res.expedition.worldName, 'gold');
        if (res.archived) toast('Expedition ' + U.pad(res.archived.number, 3) + ' archived to the log.', '');
      }, 380);
    },
    'select-item': function (el) {
      var id = el.getAttribute('data-id');
      state.selection.itemId = state.selection.itemId === id ? null : id;
      state.ui.telemetryTab = state.selection.itemId ? 'item' : 'sector';
      WF.store.save(state);
      render();
    },
    'filter-cat': function (el) {
      state.settings.category = el.getAttribute('data-cat');
      WF.store.save(state);
      render();
    },
    'select-route': function (el) {
      var id = el.getAttribute('data-id');
      var res = WF.inventory.equip(state, id);
      if (res.ok) {
        WF.engine.syncRouteItems(state);
        WF.engine.log(state, { type: 'system', text: 'Route ' + id.replace('route-', '').toUpperCase() + ' selected. ' + res.message });
        WF.store.save(state);
        render();
        toast(res.message);
      }
    },
    equip: function (el) {
      var id = el.getAttribute('data-id');
      var res = WF.inventory.equip(state, id);
      if (!res.ok) { toast(res.message, 'bad'); return; }
      var item = WF.inventory.get(state, id);
      if (item && item.category === 'route') {
        WF.engine.syncRouteItems(state);
        state.selection.itemId = id;
      }
      // recalibrate route metrics with new equipment
      state.routes = WF.routes.recalc(state.routes, WF.inventory.characterProfile(state).attributes, state.expedition);
      WF.engine.syncRouteItems(state);
      WF.store.save(state);
      render();
      toast(res.message);
      if (item) {
        var b = WF.inventory.survivalBreakdown(state);
        if (b) toast('Survival model updated → ' + Math.round(b.survival) + '%', b.survival >= 50 ? '' : 'bad');
      }
    },
    unequip: function (el) {
      var slot = el.getAttribute('data-slot');
      var res = WF.inventory.unequip(state, slot);
      if (!res.ok) { toast(res.message, 'bad'); return; }
      state.routes = WF.routes.recalc(state.routes, WF.inventory.characterProfile(state).attributes, state.expedition);
      WF.engine.syncRouteItems(state);
      WF.store.save(state);
      render();
      toast(res.message);
    },
    compare: function (el) {
      var id = el.getAttribute('data-id');
      var list = state.selection.compare;
      var idx = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1);
      else {
        if (list.length >= 2) list.shift();
        list.push(id);
      }
      WF.store.save(state);
      render();
    },
    'clear-compare': function () {
      state.selection.compare = [];
      WF.store.save(state);
      render();
    },
    'open-compare': function () {
      state.ui.compareOpen = true;
      WF.store.save(state);
      render();
    },
    'close-compare': function () {
      state.ui.compareOpen = false;
      WF.store.save(state);
      render();
    },
    'tab-sector': function () {
      state.selection.itemId = null;
      state.ui.telemetryTab = 'sector';
      WF.store.save(state);
      render();
    },
    survey: function () {
      var res = WF.engine.survey(state);
      if (!res.ok) { toast(res.message, 'bad'); return; }
      if (res.encounter) {
        state.pendingEncounter = res.encounter;
        toast('Contact detected: ' + res.encounter.name + '. Engage or withdraw.', 'bad');
      } else {
        toast('Survey complete: ' + res.gains.map(function (g) { return g.qty + '× ' + g.name; }).join(', '));
      }
      WF.store.save(state);
      render();
    },
    scan: function () {
      var res = WF.engine.scan(state);
      WF.store.save(state);
      render();
      toast(res.message, 'gold');
    },
    rest: function () {
      var res = WF.engine.rest(state);
      WF.store.save(state);
      render();
      toast(res.text);
    },
    engage: function () {
      var res = WF.engine.engage(state);
      state.pendingEncounter = null;
      WF.store.save(state);
      render();
      toast(res.summary, res.outcome === 'victory' ? '' : 'bad');
    },
    withdraw: function () {
      state.pendingEncounter = null;
      state.eventAdjust = U.clamp((state.eventAdjust || 0) - 3, -45, 30);
      WF.engine.log(state, { type: 'system', text: 'The Cartographer withdraws from the contact. Morale and route position suffer slightly.' });
      WF.store.save(state);
      render();
      toast('Withdrew from contact. -3 survival.');
    },
    finalize: function () {
      transition();
      setTimeout(function () {
        var res = WF.engine.finalize(state);
        WF.store.save(state);
        render();
        toast('Expedition ' + U.pad(res.record.number, 3) + ' archived — ' + res.record.outcome.toUpperCase() + ' · ' + res.record.survival + '% survival', 'gold');
        toast('New horizon generated: ' + state.expedition.name, '');
      }, 380);
    },
    use: function (el) {
      var res = WF.engine.useConsumable(state, el.getAttribute('data-id'));
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? '' : 'bad');
    },
    craft: function (el) {
      var id = el.getAttribute('data-id');
      var res = WF.inventory.craft(state, id);
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? 'gold' : 'bad');
    },
    'activate-companion': function (el) {
      var id = el.getAttribute('data-id');
      var existing = WF.companions.active(state);
      var res;
      if (existing && existing.id === id) res = WF.companions.deactivate(state);
      else res = WF.companions.activate(state, id);
      state.routes = WF.routes.recalc(state.routes, WF.inventory.characterProfile(state).attributes, state.expedition);
      WF.engine.syncRouteItems(state);
      WF.store.save(state);
      render();
      toast(res.message);
    },
    'reset-app': function () {
      if (!window.confirm('Reset the archive? All equipment, resources and expedition history will be erased.')) return;
      state = WF.store.reset();
      ui.state = state;
      render();
      toast('Archive reset. Expedition 001 generated.', 'gold');
    },
    reconstruct: function (el) {
      var seed = Number(el.getAttribute('data-seed'));
      var num = Number(el.getAttribute('data-num'));
      var world = el.getAttribute('data-world') || null;
      transition();
      setTimeout(function () {
        var res = WF.engine.reconstruct(state, seed, num, world);
        WF.store.save(state);
        render();
        toast('Sector reconstructed from seed — ' + res.expedition.name, 'gold');
      }, 380);
    },

    'set-view': function (el) {
      state.ui.view = el.getAttribute('data-view') || 'survival';
      WF.store.save(state);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    'set-codex': function (el) {
      state.ui.codexWorld = el.getAttribute('data-world');
      state.ui.view = 'codex';
      WF.store.save(state);
      render();
    },
    'rename-cartographer': function () {
      var next = window.prompt('Cartographer callsign:', state.profile ? state.profile.callsign : 'THE CARTOGRAPHER');
      if (next == null) return;
      var res = WF.profile.rename(state, next);
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? '' : 'bad');
    },
    'ai-toggle': function () {
      var cfg = WF.ai.config(state);
      var res = WF.ai.setConfig(state, { enabled: !cfg.enabled, endpoint: cfg.endpoint });
      WF.store.save(state);
      render();
      toast(res.message + (cfg.enabled ? ' AI disabled.' : ' AI enabled.'), 'gold');
    },
    'ai-save-endpoint': function () {
      var input = document.getElementById('aiEndpoint');
      var cfg = WF.ai.config(state);
      var res = WF.ai.setConfig(state, { enabled: cfg.enabled, endpoint: input ? input.value : cfg.endpoint });
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? '' : 'bad');
    },
    'ai-test': function () {
      var status = document.getElementById('aiStatus');
      if (status) { status.textContent = 'Testing endpoint…'; status.style.color = 'var(--silver)'; }
      WF.ai.testConnection(state).then(function (r) {
        var msg = r.ok ? 'Endpoint online' + (r.provider ? ' · ' + r.provider : '') : 'Endpoint unavailable: ' + (r.error || r.status || 'no response');
        var s2 = document.getElementById('aiStatus');
        if (s2) { s2.textContent = msg; s2.style.color = r.ok ? 'var(--ok)' : 'var(--danger)'; }
        toast(msg, r.ok ? '' : 'bad');
      });
    },
    'ai-generate': function (el) {
      var kind = el.getAttribute('data-kind') || 'event';
      var item = state.selection.itemId ? WF.inventory.get(state, state.selection.itemId) : null;
      toast('Narrative dispatch requested…', 'gold');
      WF.ai.generate(state, kind, { item: item }).then(function (res) {
        WF.store.save(state);
        render();
        toast(res.source === 'ai' ? 'AI narrative received.' : 'Archive template narrative generated.', res.source === 'ai' ? 'gold' : '');
      });
    },
    'export-data': function () {
      var json = WF.store.exportJson(state);
      var blob = new Blob([json], { type: 'application/json' });
      var name = 'wayfinder-archive-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.__lastExport = { name: name, bytes: json.length };
      setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
      toast('Archive exported — ' + name, 'gold');
    },
    'import-data': function () {
      var input = document.getElementById('importFile');
      if (input) input.click();
    },
    'backup-now': function () {
      var res = WF.store.saveBackup(state);
      WF.store.save(state);
      if (state.ui.view === 'vault') render();
      toast(res.ok ? 'Local backup created.' : 'Backup failed: ' + res.error, res.ok ? 'gold' : 'bad');
    },
    'restore-backup': function () {
      if (!window.confirm('Restore the last local backup? Current state will be replaced.')) return;
      var res = WF.store.restoreBackup();
      if (!res.ok) { toast(res.error, 'bad'); return; }
      adopt(res.state);
      toast('Backup restored.', 'gold');
    },
    'reset-progress': function () {
      if (!window.confirm('Reset permanent progression? Level, achievements and expedition records will be cleared. Archive and current run are kept.')) return;
      var next = WF.store.resetProgress();
      adopt(next);
      toast('Progression reset. Archive and current expedition preserved.', 'gold');
    },
    'tactical-start': function () {
      if (state.tactical) { toast('A tactical engagement is already open.', 'bad'); return; }
      var b = WF.engine.startTactical(state);
      WF.store.save(state);
      render();
      if (b) toast('Tactical engagement: ' + b.enemy.name + ' · ' + b.enemy.behavior.label, 'gold');
    },
    'tactical-act': function (el) {
      var action = el.getAttribute('data-id');
      var b = WF.engine.tacticalAct(state, action);
      WF.store.save(state);
      render();
      if (b && b.over) {
        toast(b.outcome === 'victory' ? 'Encounter won — ' + b.enemy.name + ' destroyed.' : b.outcome === 'retreat' ? 'Withdrawal successful.' : 'Encounter lost — integrity critical.', b.outcome === 'victory' ? '' : 'bad');
      }
    },
    'tactical-close': function () {
      WF.engine.closeTactical(state);
      WF.store.save(state);
      render();
    },
    'tactical-auto': function () {
      var res = WF.engine.engage(state);
      WF.store.save(state);
      render();
      toast(res.summary, res.outcome === 'victory' ? '' : 'bad');
    },
    'replay-combat': function () {
      var replay = WF.engine.replayLast(state);
      WF.store.save(state);
      render();
      if (replay) toast('Replay resolved: ' + replay.outcome + ' · ' + replay.damage + ' damage · ' + replay.rounds + ' rounds.', 'gold');
      else toast('No recorded engagement to replay.', 'bad');
    },
    'treat-injury': function () {
      if (!state.injuries || !state.injuries.length) { toast('No injuries require treatment.', ''); return; }
      if (!WF.inventory.consumeResource(state, 'medicalSupplies', 1)) { toast('No medical supplies remaining.', 'bad'); return; }
      var res = WF.tactical.treatInjury(state);
      WF.engine.log(state, { type: 'system', text: 'MEDICAL — ' + res.message + ' (1 medical supply consumed).' });
      WF.store.save(state);
      render();
      toast(res.message);
    },
    'publish-profile': function () {
      var res = WF.shared.publish(state, 'profile');
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? 'gold' : 'bad');
    },
    'publish-expedition': function () {
      var res = WF.shared.publish(state, 'expedition');
      WF.store.save(state);
      render();
      toast(res.message, res.ok ? 'gold' : 'bad');
    },
    'export-share': function () {
      var payload = WF.shared.bundle(state, 10);
      var json = JSON.stringify(payload, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var name = 'wayfinder-share-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.__lastShareExport = { name: name, bytes: json.length };
      setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
      toast('Share bundle exported — ' + name, 'gold');
    },
    'import-share': function () {
      var input = document.getElementById('importShareFile');
      if (input) input.click();
    },
    'reconstruct-shared': function (el) {
      var pub = WF.shared.findPublication(state, el.getAttribute('data-id'));
      if (!pub) { toast('Shared payload not found.', 'bad'); return; }
      var e = pub.kind === 'expedition' ? pub : (pub.expeditions && pub.expeditions[0]);
      if (!e) { toast('No reconstructable expedition in this payload.', 'bad'); return; }
      transition();
      setTimeout(function () {
        WF.engine.reconstruct(state, e.seed, e.number, e.worldId);
        WF.store.save(state);
        render();
        toast('Shared expedition reconstructed — ' + state.expedition.name, 'gold');
      }, 380);
    },
    'select-encounter': function (el) {
      state.pendingEncounter = WF.combat.generateEncounter(state, Date.now() % 9999);
      WF.store.save(state);
      render();
    }
  };

  function bind() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var action = el.getAttribute('data-action');
      if (handlers[action]) {
        e.preventDefault();
        handlers[action](el, e);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var el = e.target.closest && e.target.closest('[data-action]');
        if (el && el.getAttribute('role') === 'button') {
          e.preventDefault();
          var action = el.getAttribute('data-action');
          if (handlers[action]) handlers[action](el, e);
        }
      }
    });

    document.addEventListener('input', U.debounce(function (e) {
      if (e.target && e.target.id === 'archiveSearch') {
        state.settings.search = e.target.value;
        WF.store.save(state);
        var panel = document.getElementById('archivePanel');
        if (panel) {
          panel.outerHTML = renderArchive();
          var input = document.getElementById('archiveSearch');
          if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        }
      }
      if (e.target && e.target.id === 'supplySlider') {
        state.tuner.supplies = Number(e.target.value);
        WF.ui.renderTuner();
        document.getElementById('header').innerHTML = renderHeader();
        WF.store.save(state);
      }
      if (e.target && e.target.id === 'overclockSlider') {
        state.tuner.overclock = Number(e.target.value);
        WF.ui.renderTuner();
        document.getElementById('header').innerHTML = renderHeader();
        WF.store.save(state);
      }
    }, 90));

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'importFile') {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var parsed;
          try { parsed = JSON.parse(String(reader.result)); }
          catch (err) { toast('Import failed: file is not valid JSON.', 'bad'); return; }
          var res = WF.store.importPayload(parsed);
          if (!res.ok) { toast('Import failed: ' + res.error, 'bad'); return; }
          adopt(res.state);
          toast('Archive imported and validated.', 'gold');
        };
        reader.readAsText(file);
        e.target.value = '';
        return;
      }
      if (e.target && e.target.id === 'importShareFile') {
        var sf = e.target.files && e.target.files[0];
        if (!sf) return;
        var sreader = new FileReader();
        sreader.onload = function () {
          var payload;
          try { payload = JSON.parse(String(sreader.result)); }
          catch (err) { toast('Import failed: invalid JSON.', 'bad'); return; }
          var res = WF.shared.receive(state, payload);
          if (!res.ok) { toast('Import failed: ' + res.message, 'bad'); return; }
          WF.store.save(state);
          render();
          toast(res.message, 'gold');
        };
        sreader.readAsText(sf);
        e.target.value = '';
        return;
      }
      if (e.target && e.target.id === 'sortSelect') {
        state.settings.sort = e.target.value;
        WF.store.save(state);
        var panel = document.getElementById('archivePanel');
        if (panel) panel.outerHTML = renderArchive();
      }
    });
  }

  function init(appState) {
    state = appState;
    ui.state = state;
    bind();
    render();
    ui.render = render;
    ui.renderLight = renderLight;
    ui.toast = toast;
    ui.transition = transition;
    ui.handlers = handlers;
    ui.adopt = adopt;

    // restore last selection if it still exists
    if (state.selection.itemId && !WF.inventory.get(state, state.selection.itemId)) {
      state.selection.itemId = null;
    }
  }

  ui.init = init;
  ui.renderHeader = renderHeader;
  ui.renderArchive = renderArchive;
  ui.renderMatrix = renderMatrix;
})(window.WF = window.WF || {});
