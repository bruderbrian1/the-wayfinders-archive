/* =====================================================================
   ui/panels.js — telemetry dossier, tuner, operations, resources,
   companions and expedition log.
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util, A = WF.art;
  var ui = WF.ui = WF.ui || {};
  var H = null;

  function h() { return ui.helpers; }
  function state() { return ui.state; }

  /* ==================================================================
     TELEMETRY
     ================================================================== */

  function renderTelemetry() {
    var s = state();
    var host = document.getElementById('telemetryPanel');
    if (!host) return;
    if (s.ui.compareOpen && (s.selection.compare || []).length === 2) {
      host.outerHTML = renderCompare();
      return;
    }
    var item = s.selection.itemId ? WF.inventory.get(s, s.selection.itemId) : null;
    host.outerHTML = item ? renderItemDossier(item) : renderSectorBrief();
  }

  /* ---------- sector brief ---------- */

  function renderSectorBrief() {
    var s = state(), exp = s.expedition;
    var bd = WF.inventory.survivalBreakdown(s);
    var risk = U.riskClass(bd.survival);

    var hazardCard = function (hz, label) {
      return '<div class="exp-cell" style="border-color:rgba(255,95,109,.22)">' +
        '<div class="k">' + label + '</div>' +
        '<div class="v" style="color:#ffd6d9">' + U.esc(hz.name) + '</div>' +
        '<div style="margin-top:6px">' + h().bar(hz.severity, hz.severity > 80 ? 'danger' : 'warn') + '</div>' +
        '<div class="help-line" style="margin-top:4px">SEVERITY ' + hz.severity + '% · counter: ' + U.titleCase(hz.resistance) + '</div>' +
        '<div class="help-line" style="margin-top:4px;color:#7d8b97">' + U.esc(hz.desc) + '</div>' +
        '</div>';
    };

    var resources = exp.resources.map(function (r) {
      return '<span class="tag teal">' + U.esc(r.name) + ' · ' + r.availability + '% avail.</span>';
    }).join('');

    var objectives = exp.objectives.map(function (o, i) {
      return '<li><span class="mark">' + U.pad(i + 1, 2) + '</span><span>' + U.esc(WF.world.fill(o.text, {
        place: exp.placeName || exp.sector, sector: exp.sector, world: exp.worldName
      })) + ' <span class="tag" style="margin-left:6px">' + o.tag + '</span></span></li>';
    }).join('');

    var model = survivalModelRows(bd);

    return '<section class="panel telemetry-panel" id="telemetryPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> II. Telemetry / Sector Brief</div>' +
      '<span class="meta-label" style="margin:0">LIVE MODEL</span></div>' +
      '<div class="telemetry-hero">' +
      '<div class="hero-art">' + A.worldArt(exp) +
      '<span class="hero-tag">' + U.esc(exp.worldName) + '</span>' +
      '<span class="hero-coord">' + U.esc(WF.lore.sectorReport(exp)) + '</span>' +
      '</div>' +
      '<div class="hero-head"><div class="title-block">' +
      '<h2 class="hero-title">' + U.esc(exp.name) + '</h2>' +
      '<div class="hero-class">' + U.esc(exp.classification) + ' · EXPEDITION ' + U.pad(exp.number, 3) + '</div>' +
      '</div><div style="text-align:right;flex:0 0 auto">' + h().riskPill(risk) +
      '<div class="help-line" style="margin-top:6px">SEED ' + exp.seedLabel + '</div></div></div>' +
      '</div>' +

      '<div class="hero-body">' +
      '<div class="lore-quote">' + U.esc(exp.narrative) + '</div>' +

      '<div class="tag-list">' +
      exp.conditions.map(function (c) { return '<span class="tag">' + U.esc(c) + '</span>'; }).join('') +
      '<span class="tag bad">' + U.esc(exp.faction) + '</span>' +
      '</div>' +

      h().section('SECTOR TELEMETRY') +
      '<div class="stat-grid">' +
      h().stat('Difficulty', exp.difficulty.score + '% · ' + exp.difficulty.label, exp.difficulty.score > 70 ? 'neg' : '') +
      h().stat('Survival Rating', Math.round(bd.survival) + '%', 'teal') +
      h().stat('Base Survival', exp.survivalBase + '%') +
      h().stat('Integrity', Math.round(s.condition) + '%', s.condition < 40 ? 'neg' : 'pos') +
      h().stat('Anomaly Level', exp.anomalyLevel + '%', exp.anomalyLevel > 70 ? 'neg' : '') +
      h().stat('Temporal Stability', exp.temporalStability + '%', exp.temporalStability < 45 ? 'neg' : 'pos') +
      h().stat('Sector Coords', exp.coords.x + ' / ' + exp.coords.y, 'gold') +
      h().stat('Depth', exp.depth + ' km') +
      '</div>' +

      h().section('ENVIRONMENTAL HAZARDS', 'gold') +
      '<div class="exp-grid">' +
      hazardCard(exp.primaryHazard, 'PRIMARY HAZARD') +
      hazardCard(exp.secondaryHazard, 'SECONDARY HAZARD') +
      '</div>' +

      h().section('ACTIVE PERKS & PENALTIES') +
      '<div class="two-col" style="gap:10px">' +
      '<div><div class="help-line" style="color:var(--ok);margin-bottom:6px">PERKS</div><div class="tag-list">' +
      exp.perks.map(function (p) { return '<span class="tag good" title="' + U.esc(p.desc) + '">' + U.esc(p.name) + ' ' + U.signed(p.survival) + '</span>'; }).join('') +
      '</div></div>' +
      '<div><div class="help-line" style="color:var(--danger);margin-bottom:6px">PENALTIES</div><div class="tag-list">' +
      exp.penalties.map(function (p) { return '<span class="tag bad" title="' + U.esc(p.desc) + '">' + U.esc(p.name) + ' ' + U.signed(p.survival) + '</span>'; }).join('') +
      '</div></div></div>' +

      h().section('EXPLORATION OBJECTIVES') +
      '<ul class="objectives">' + objectives + '</ul>' +

      h().section('AVAILABLE RESOURCES') +
      '<div class="tag-list">' + resources + '</div>' +

      h().section('SURVIVAL MODEL — LIVE BREAKDOWN', 'gold') +
      '<table class="spec-table">' + model + '</table>' +
      '<div class="help-line" style="margin-top:8px">Every value above derives from equipment, companion, route, hazards and field condition. Nothing is decorative.</div>' +
      '</div></section>';
  }

  function survivalModelRows(bd) {
    function row(k, v, cls) {
      return '<tr><td>' + k + '</td><td style="color:' + (cls === 'pos' ? 'var(--ok)' : cls === 'neg' ? 'var(--danger)' : 'var(--text)') + '">' +
        (typeof v === 'number' ? U.signedPct(v) : v) + '</td></tr>';
    }
    var rows = '';
    rows += row('Generated base survival', bd.base + '%', '');
    rows += row('Navigation skill', bd.navBonus, bd.navBonus >= 0 ? 'pos' : 'neg');
    rows += row('Resistance profile', bd.resistBonus, bd.resistBonus >= 0 ? 'pos' : 'neg');
    rows += row('Combat power', bd.combatBonus, bd.combatBonus >= 0 ? 'pos' : 'neg');
    rows += row('Armor', bd.armorBonus, bd.armorBonus >= 0 ? 'pos' : 'neg');
    rows += row('Health & condition', bd.healthBonus + bd.conditionBonus, (bd.healthBonus + bd.conditionBonus) >= 0 ? 'pos' : 'neg');
    rows += row('Expedition perks', bd.perkBonus, bd.perkBonus >= 0 ? 'pos' : 'neg');
    rows += row('Expedition penalties', bd.penaltyTotal, bd.penaltyTotal >= 0 ? 'pos' : 'neg');
    rows += row('Companion AI', bd.companionBonus, bd.companionBonus >= 0 ? 'pos' : 'neg');
    rows += row('Active route', bd.routeBonus, bd.routeBonus >= 0 ? 'pos' : 'neg');
    rows += row('Field events', bd.eventAdjust, bd.eventAdjust >= 0 ? 'pos' : 'neg');
    rows += '<tr><td style="color:var(--teal)"><b>Survival rating</b></td><td style="color:var(--teal)"><b>' + Math.round(bd.survival) + '%</b></td></tr>';
    return rows;
  }

  /* ---------- item dossier ---------- */

  function renderItemDossier(item) {
    var s = state(), exp = s.expedition;
    var perf = WF.inventory.performance(item);
    var compat = WF.inventory.compatScore(item, exp);
    var isEquipped = item.equipped;
    var slot = WF.inventory.slotFor(item);
    var rows = WF.inventory.statRows(item);
    var comp = WF.inventory.companionOf(item);

    var bonusTable = rows.map(function (r) {
      return '<tr><td>' + U.esc(r.label) + '</td><td style="color:' + (r.value >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + (r.value >= 0 ? '+' : '') + r.value + '</td></tr>';
    }).join('');

    var extraTable = (item.extraSpecs || []).map(function (sp) {
      return '<tr><td>' + U.esc(sp[0]) + '</td><td>' + U.esc(sp[1]) + '</td></tr>';
    }).join('');

    var compatNames = (item.compat || []).map(function (id) {
      var w = D.WORLD_BY_ID[id];
      return '<span class="tag ' + (id === exp.worldId ? 'good' : '') + '">' + U.esc(w ? w.name : id) + '</span>';
    }).join('') || '<span class="tag">Universal / field-issue</span>';

    var actions = '';
    if (slot) {
      actions += '<button class="btn ' + (isEquipped ? '' : 'primary') + '" data-action="equip" data-id="' + U.esc(item.instanceId) + '">' +
        (isEquipped ? 'Unequip' : slot === 'route' ? 'Activate Route' : 'Equip') + '</button>';
      if (isEquipped) actions += '<button class="btn sm" data-action="unequip" data-slot="' + slot + '">Remove from slot</button>';
    }
    if (WF.engine.canUse(item)) {
      actions += '<button class="btn gold" data-action="use" data-id="' + U.esc(item.instanceId) + '">Use · ' + item.qty + ' left</button>';
    }
    if (item.craft) {
      var status = WF.inventory.costStatus(s, item);
      actions += '<button class="btn" data-action="craft" data-id="' + U.esc(item.instanceId) + '" ' + (status.ok ? '' : 'disabled') + '>Fabricate</button>';
    }
    actions += '<button class="btn sm" data-action="compare" data-id="' + U.esc(item.instanceId) + '">' +
      ((s.selection.compare || []).indexOf(item.instanceId) >= 0 ? 'Remove from compare' : 'Compare') + '</button>';
    actions += '<button class="btn sm" data-action="tab-sector">← Sector Brief</button>';

    var records = (s.history || []).filter(function (r) {
      return (r.equipment || []).indexOf(item.name) >= 0 ||
        (r.discoveries || []).some(function (d) { return d.indexOf(item.name) >= 0; });
    }).slice(0, 3);

    var historyHtml = records.length ? records.map(function (r) {
      return '<div class="kv"><span class="k">EXP ' + U.pad(r.number, 3) + ' · ' + U.esc(r.worldName) + '</span>' +
        '<span class="v">' + r.survival + '% · ' + r.outcome.toUpperCase() + '</span></div>';
    }).join('') : '<div class="help-line">No archived deployment yet. Equip and finalise an expedition to generate records.</div>';

    var craftRows = '';
    if (item.craft) {
      var st = WF.inventory.costStatus(s, item);
      craftRows = st.rows.map(function (r) {
        return '<tr><td>' + U.esc(r.name) + '</td><td style="color:' + (r.ok ? 'var(--text)' : 'var(--danger)') + '">' + r.have + ' / ' + r.need + '</td></tr>';
      }).join('');
    }

    return '<section class="panel telemetry-panel" id="telemetryPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> II. Telemetry / Artifact Dossier</div>' +
      '<span class="meta-label" style="margin:0">' + U.esc(D.CATEGORY_BY_ID[item.category] ? D.CATEGORY_BY_ID[item.category].label : '') + '</span></div>' +

      '<div class="hero-art" style="height:196px">' + A.worldArt(exp) +
      '<div style="position:absolute;inset:0;display:grid;place-items:center">' +
      '<div class="item-sigil" style="width:132px;height:132px;background:rgba(5,7,10,.55);backdrop-filter:blur(3px);border-color:rgba(216,168,90,.4);box-shadow:0 0 50px rgba(0,0,0,.7)">' +
      A.itemSigil(item) + '</div></div>' +
      '<span class="hero-tag">' + (isEquipped ? 'EQUIPPED' : 'ARCHIVE ENTRY') + '</span>' +
      '<span class="hero-coord">' + U.esc(item.instanceId) + '</span>' +
      '</div>' +

      '<div class="hero-head"><div class="title-block">' +
      '<h2 class="hero-title">' + U.esc(item.name) + '</h2>' +
      '<div class="hero-class">' + h().rarityBadge(item.rarity) + ' <span style="margin-left:6px">' + U.esc(item.classification) + '</span></div>' +
      '</div><div style="text-align:right"><div class="help-line">ITEM LEVEL</div>' +
      '<div style="font-family:var(--mono);font-size:24px;color:var(--gold)">' + (item.level || 1) + '</div></div></div>' +

      '<div class="hero-body">' +
      '<div class="lore-quote">' + U.esc(item.lore) + '</div>' +

      '<div class="stat-grid">' +
      h().stat('Performance Index', perf + ' / 100', 'teal') +
      h().stat('Environmental Fit', compat + '%', compat >= 80 ? 'pos' : compat >= 50 ? '' : 'neg') +
      h().stat('Inventory Qty', '×' + (item.qty || 1), 'gold') +
      h().stat('Mass', (item.weight || 0) + ' kg') +
      h().stat('Slot', slot ? U.titleCase(slot) : 'Consumable / Material') +
      h().stat('Trade Value', (item.value || 0) + ' cr') +
      (item.category === 'route' ? h().stat('Projected Survival', item.survivalRate + '%', 'teal') : '') +
      '</div>' +

      h().section('NARRATIVE LORE') +
      '<p style="font-size:12.5px;color:#b8c6d1;line-height:1.65">' + U.esc(item.lore) + '</p>' +
      '<div class="kv"><span class="k">Discovery Location</span><span class="v">' + U.esc(item.discovery || 'Unknown') + '</span></div>' +

      (comp ? '<div style="margin-top:14px" class="ability-box"><div class="ability-name">' + U.esc(comp.name) + ' · ' + U.esc(comp.role) + '</div>' +
        '<div class="ability-text">' + U.esc(comp.backstory) + '</div>' +
        '<div class="tag-list" style="margin-top:8px"><span class="tag gold">PERSONALITY: ' + U.esc(comp.personality) + '</span>' +
        '<span class="tag ' + (comp.compat.indexOf(exp.worldId) >= 0 ? 'good' : 'bad') + '">' +
        (comp.compat.indexOf(exp.worldId) >= 0 ? 'COMPATIBLE' : 'REDUCED SYNC') + '</span>' +
        '<span class="tag">LEVEL ' + comp.level + '</span></div></div>' : '') +

      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:14px">' + actions + '</div>' +

      h().section('TECHNICAL SPECIFICATIONS') +
      '<table class="spec-table">' + extraTable + '</table>' +

      h().section('STATISTICAL PERFORMANCE', 'gold') +
      (bonusTable ? '<table class="spec-table">' + bonusTable + '</table>' : '<div class="help-line">This entry carries no direct attribute bonuses. Its value is tactical.</div>') +

      h().section('SPECIAL ABILITY') +
      (item.ability ? '<div class="ability-box"><div class="ability-name">' + U.esc(item.ability.name) + '</div>' +
        '<div class="ability-text">' + U.esc(item.ability.text) + '</div></div>' : '<div class="help-line">None recorded.</div>') +

      (compatNames ? h().section('ENVIRONMENTAL COMPATIBILITY') + '<div class="tag-list">' + compatNames + '</div>' : '') +

      (craftRows ? h().section('FABRICATION COST') + '<table class="spec-table">' + craftRows + '</table>' : '') +

      h().section('HISTORICAL EXPEDITION RECORDS', 'gold') +
      historyHtml +
      '<div class="help-line" style="margin-top:10px">Equipping this entry immediately recalculates the survival model, route matrix and tuning readout.</div>' +
      '</div></section>';
  }

  /* ---------- comparison ---------- */

  function renderCompare() {
    var s = state();
    var ids = s.selection.compare;
    var a = WF.inventory.get(s, ids[0]);
    var b = WF.inventory.get(s, ids[1]);
    if (!a || !b) {
      s.ui.compareOpen = false;
      return renderSectorBrief();
    }
    var cmp = WF.inventory.compare(a, b);

    var rows = cmp.rows.map(function (r) {
      var cls = r.delta > 0 ? 'var(--ok)' : r.delta < 0 ? 'var(--danger)' : 'var(--silver-dim)';
      return '<tr><td>' + U.esc(r.label) + '</td>' +
        '<td style="color:' + (r.a >= 0 ? 'var(--text)' : 'var(--danger)') + '">' + (r.a >= 0 ? '+' : '') + r.a + '</td>' +
        '<td style="color:' + (r.b >= 0 ? 'var(--text)' : 'var(--danger)') + '">' + (r.b >= 0 ? '+' : '') + r.b + '</td>' +
        '<td style="color:' + cls + '">' + (r.delta > 0 ? '+' : '') + r.delta + '</td></tr>';
    }).join('');

    function col(item) {
      return '<div style="flex:1;min-width:0">' +
        '<div class="item-sigil lg" style="height:130px">' + A.itemSigil(item) + '</div>' +
        '<div style="margin-top:10px;font-family:var(--serif);font-size:19px;color:#efe7d8">' + U.esc(item.name) + '</div>' +
        '<div style="margin-top:4px">' + h().rarityBadge(item.rarity) + ' <span class="help-line">LV ' + item.level + '</span></div>' +
        '<div class="kv" style="margin-top:8px"><span class="k">Performance</span><span class="v">' + WF.inventory.performance(item) + '</span></div>' +
        '<div class="kv"><span class="k">Slot</span><span class="v">' + U.titleCase(WF.inventory.slotFor(item) || '—') + '</span></div>' +
        '<div class="kv"><span class="k">Class</span><span class="v" style="font-size:9px">' + U.esc(item.classification) + '</span></div>' +
        '</div>';
    }

    return '<section class="panel telemetry-panel" id="telemetryPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> II. Telemetry / Equipment Comparison</div>' +
      '<button class="btn sm" data-action="close-compare">Close</button></div>' +
      '<div class="hero-body">' +
      '<div class="row" style="gap:14px;align-items:flex-start">' + col(a) + '<div style="flex:0 0 auto;align-self:center;color:var(--gold);font-family:var(--mono)">VS</div>' + col(b) + '</div>' +
      h().section('DELTA ANALYSIS', 'gold') +
      '<table class="spec-table"><tr><td style="color:var(--silver-dim)">Stat</td><td style="color:var(--gold-dim)">' + U.esc(a.name.split(' ').slice(-1)[0]) + '</td><td style="color:var(--gold-dim)">' + U.esc(b.name.split(' ').slice(-1)[0]) + '</td><td style="color:var(--gold-dim)">Δ</td></tr>' +
      rows + '<tr><td><b>Performance</b></td><td colspan="2"></td><td style="color:' + (cmp.performanceDelta >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' +
      (cmp.performanceDelta >= 0 ? '+' : '') + cmp.performanceDelta + '</td></tr></table>' +
      '<div class="help-line" style="margin-top:10px">Δ is calculated as right-hand item minus left-hand item. Equip either entry to apply the difference to the live model.</div>' +
      '<div class="row" style="margin-top:14px;gap:8px">' +
      '<button class="btn" data-action="equip" data-id="' + U.esc(a.instanceId) + '">Equip ' + U.esc(a.name) + '</button>' +
      '<button class="btn" data-action="equip" data-id="' + U.esc(b.instanceId) + '">Equip ' + U.esc(b.name) + '</button>' +
      '<button class="btn sm" data-action="close-compare">Close</button></div>' +
      '</div></section>';
  }


  function attrRowsHtml() {
    var s = state();
    var a = WF.inventory.characterProfile(s).attributes;
    return D.ATTRIBUTES.map(function (at) {
      var v = a[at.key];
      return '<div class="attr-row"><span class="attr-name">' + at.label + '</span>' +
        '<span class="attr-bar">' + h().bar((v / at.max) * 100, v / at.max > 0.66 ? '' : v / at.max > 0.4 ? 'warn' : 'danger') + '</span>' +
        '<span class="attr-val">' + v + '</span></div>';
    }).join('');
  }

  function slotRowsHtml() {
    var s = state();
    return D.SLOTS.map(function (slot) {
      var it = WF.inventory.equipped(s, slot.id);
      var name = it ? it.name : (slot.id === 'route' ? 'No route selected' : '— empty —');
      return '<div class="kv"><span class="k">' + slot.label + '</span>' +
        '<span class="v" style="display:flex;gap:8px;align-items:center;justify-content:flex-end">' +
        '<span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + (it ? 'var(--text)' : 'var(--silver-dim)') + '">' + U.esc(name) + '</span>' +
        (it ? '<button class="btn sm" data-action="unequip" data-slot="' + slot.id + '">×</button>' : '') +
        '</span></div>';
    }).join('');
  }

  /* ==================================================================
     EXPEDITION TUNER
     ================================================================== */

  function renderTuner() {
    var s = state();
    var res = WF.engine.tunerResult(s);
    var host = document.getElementById('tunerPanel');
    if (!host || !res) return;
    var bd = res.breakdown;

    var breakdownRows = [
      ['Generated base survival', bd.base + '%'],
      ['Equipment navigation', U.signedPct(bd.navBonus)],
      ['Resistance profile', U.signedPct(bd.resistBonus)],
      ['Combat / armor', U.signedPct(bd.combatBonus + bd.armorBonus)],
      ['Health & condition', U.signedPct(bd.healthBonus + bd.conditionBonus)],
      ['Perks / penalties', U.signedPct(bd.perkBonus + bd.penaltyTotal)],
      ['Companion AI', U.signedPct(bd.companionBonus)],
      ['Active route', U.signedPct(bd.routeBonus)],
      ['Field events', U.signedPct(bd.eventAdjust)]
    ].map(function (r) {
      return '<div class="kv"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>';
    }).join('');

    host.outerHTML = '<section class="panel" id="tunerPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> IV. Expedition Tuner <span class="idx">/ survival calculator</span></div>' +
      '<button class="btn sm" data-action="reroll">Recalibrate</button></div>' +
      '<div class="panel-body"><div class="tuner-grid">' +

      '<div>' +
      '<div class="slider-block">' +
      '<div class="slider-head"><span class="slider-label">A · Supplies Consumed</span><span class="slider-value">' + s.tuner.supplies + '%</span></div>' +
      '<input id="supplySlider" type="range" min="0" max="100" step="1" value="' + s.tuner.supplies + '" aria-label="Supplies consumed percentage">' +
      '<div class="slider-scale"><span>0% · fasting</span><span>50% · nominal</span><span>100% · stripped</span></div>' +
      '</div>' +
      '<div class="slider-block" style="margin-bottom:6px">' +
      '<div class="slider-head"><span class="slider-label">B · Engine Overclocking Rate</span><span class="slider-value">' + s.tuner.overclock + '%</span></div>' +
      '<input id="overclockSlider" type="range" min="0" max="150" step="1" value="' + s.tuner.overclock + '" aria-label="Engine overclocking rate percentage">' +
      '<div class="slider-scale"><span>0% · idle</span><span>50% · cruise</span><span>150% · burn</span></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="font-family:var(--mono);font-size:9px;color:var(--silver-dim);letter-spacing:.08em">LIVE MODEL CONTRIBUTIONS</div>' +
      '<div style="margin-top:6px">' + breakdownRows + '</div>' +
      '</div>' +

      '<div class="tuner-readout">' +
      '<div class="help-line">ESTIMATED SURVIVAL</div>' +
      '<div class="big-survival"><span class="num">' + Math.round(res.estimated) + '</span><span class="pct">%</span>' +
      '<span class="delta ' + (res.delta >= 0 ? 'pos' : 'neg') + '">' + U.signedPct(res.delta) + '</span></div>' +
      '<div>' + h().riskPill(res.risk) + '</div>' +
      h().bar(res.estimated, res.estimated >= 65 ? '' : res.estimated >= 40 ? 'warn' : 'danger') +
      '<div class="formula">' +
      'BASE SURVIVAL <b>' + Math.round(res.base) + '%</b><br>' +
      'SUPPLY MOD <b>' + U.signedPct(res.supplyMod) + '</b> = (50 − ' + s.tuner.supplies + ') × 0.18<br>' +
      'OVERCLOCK MOD <b>' + U.signedPct(res.overclockMod) + '</b> = (50 − ' + s.tuner.overclock + ') × 0.12<br>' +
      'VARIANCE <b>' + U.signedPct(res.variance) + '</b><br>' +
      'ESTIMATED = clamp(' + Math.round(res.base) + ' + ' + U.round(res.variance, 1) + ', 0, 100)' +
      '</div>' +
      '<div class="help-line">Base survival already includes equipped gear, companion, route, hazards and field condition. Clamped 0–100.</div>' +
      '</div>' +

      '</div></div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line-soft)">' +
      h().section('CARTOGRAPHER PROFILE', 'gold') +
      attrRowsHtml() +
      '<div class="kv"><span class="k">Critical Chance</span><span class="v">' + WF.inventory.characterProfile(s).attributes.critChance + '%</span></div>' +
      '<div class="kv"><span class="k">Damage Reduction</span><span class="v">' + WF.inventory.characterProfile(s).attributes.damageReduction + '%</span></div>' +
      h().section('EQUIPMENT SLOTS', 'gold') +
      slotRowsHtml() +
      '<div class="help-line" style="margin-top:8px">Attributes recompute from equipped archive entries on every change. Unequip here or equip from any dossier.</div>' +
      '</div></section>';
  }

  /* ==================================================================
     OPERATIONS + CARTOGRAPHER
     ================================================================== */


  function threatProjection() {
    var s = state(), exp = s.expedition;
    var a = WF.inventory.characterProfile(s).attributes;
    var weapon = WF.inventory.equipped(s, 'weapon');
    var pool = exp.enemyPool || [];
    if (!pool.length) return null;
    var n = pool.length, hpSum = 0, atkSum = 0, penSum = 0;
    pool.forEach(function (e) { hpSum += e.health; atkSum += e.attack; penSum += e.penetration; });
    var avgHp = hpSum / n, avgAtk = atkSum / n, avgPen = penSum / n;
    var critChance = Math.min(60, 7 + (weapon ? (weapon.bonuses.critChance || 0) : 0));
    var critMult = 1 + (critChance / 100) * 0.7;
    var pdps = (11 + a.combatPower * 0.88) * critMult * (1 - Math.min(0.5, avgPen / 300));
    var armorMit = (a.armor * (1 - (avgPen / 100) * 0.6)) / ((a.armor * (1 - (avgPen / 100) * 0.6)) + 115);
    var edps = avgAtk * (1 - armorMit) * (1 - Math.min(0.55, a.damageReduction / 100)) + exp.primaryHazard.severity * 0.03;
    var ttk = avgHp / Math.max(1, pdps);
    var ttd = (a.health * (s.condition / 100)) / Math.max(1, edps);
    var win = U.clamp((ttd / (ttk + ttd)) * 100, 3, 97);
    var expectedDamage = Math.min(a.health * (s.condition / 100), ttk * edps);
    var env = exp.primaryHazard.severity * 0.11 * (1 - (a.spatialRes + a.temporalRes + a.radiationRes) / 3 / (((a.spatialRes + a.temporalRes + a.radiationRes) / 3) + 55));
    return {
      avgHp: Math.round(avgHp), avgAtk: Math.round(avgAtk), pdps: Math.round(pdps), edps: Math.round(edps),
      win: Math.round(win), ttk: U.round(ttk, 1), ttd: U.round(ttd, 1),
      expectedDamage: Math.round(expectedDamage), env: Math.max(0, Math.round(env)),
      tiers: pool.map(function (e) { return 'T' + e.tier; }).join(' ')
    };
  }

  function statusChips(statuses) {
    var keys = Object.keys(statuses || {});
    if (!keys.length) return '<span class="help-line">No active effects</span>';
    return keys.map(function (k) {
      var st = statuses[k];
      return '<span class="tag ' + (k === 'guarded' || k === 'escort' ? 'good' : k === 'exposed' || k === 'burning' || k === 'bleeding' || k === 'irradiated' || k === 'stunned' ? 'bad' : 'gold') + '">' +
        U.titleCase(k) + (st.turns && st.turns < 90 ? ' · ' + st.turns : '') + '</span>';
    }).join('');
  }

  function tacticalHtml(battle) {
    var s = state();
    var e = battle.enemy, p = battle.player;
    var hpPct = U.clamp((e.hp / e.maxHp) * 100, 0, 100);
    var pPct = U.clamp((p.hp / p.maxHp) * 100, 0, 100);
    var energyPct = U.clamp((p.energy / p.energyMax) * 100, 0, 100);

    var actions = WF.tactical.ACTIONS.map(function (a) {
      var disabled = battle.over;
      if (a.id === 'overcharge' && p.energy < a.cost) disabled = true;
      if (a.id === 'item') {
        var kit = WF.inventory.get(s, 's-medkit');
        if (!kit || kit.qty <= 0) disabled = true;
      }
      return '<button class="btn tactical-btn ' + (a.id === 'strike' ? 'primary' : a.id === 'retreat' ? 'danger' : '') + '" ' +
        'data-action="tactical-act" data-id="' + a.id + '" ' + (disabled ? 'disabled' : '') + ' title="' + U.esc(a.hint) + '">' +
        (a.id === 'item' ? 'Field Kit · ' + (function () { var k = WF.inventory.get(s, 's-medkit'); return k ? k.qty : 0; })() : a.label) +
        (a.cost ? ' <span style="opacity:.6">(' + a.cost + '⚡)</span>' : '') + '</button>';
    }).join('');

    var log = battle.log.slice(-16).map(function (r) {
      return '<div class="l ' + (r.kind === 'crit' ? 'crit' : r.kind === 'hit' ? 'hit' : r.kind === 'good' ? 'good' : 'sys') + '">' + U.esc(r.text) + '</div>';
    }).join('');

    return '<div class="tactical-panel">' +
      '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px">' +
      '<div><div class="section-label" style="margin:0">TACTICAL ENCOUNTER · ROUND ' + battle.round + '</div>' +
      '<div class="help-line">SEED ' + battle.seed.toString(16).toUpperCase() + ' · ' + battle.decisions.length + ' DECISIONS RECORDED</div></div>' +
      '<span class="tag bad">' + U.esc(e.behavior.label) + '</span></div>' +

      '<div class="enemy-card" style="margin-top:10px;border-color:' + (battle.over && battle.outcome === 'victory' ? 'rgba(85,227,154,.4)' : 'rgba(255,95,109,.3)') + '">' +
      '<div class="row" style="justify-content:space-between"><div><div class="enemy-name">' + U.esc(e.name) + '</div>' +
      '<div class="enemy-class">' + U.esc(e.class) + ' · TIER ' + e.tier + '</div></div>' +
      '<div style="text-align:right"><div class="mono-label">ENEMY INTEGRITY</div>' +
      '<div style="font-family:var(--mono);font-size:20px;color:' + (hpPct > 35 ? '#ffd6d9' : 'var(--danger)') + '">' + Math.max(0, Math.round(e.hp)) + ' / ' + e.maxHp + '</div></div></div>' +
      '<div style="margin-top:8px">' + h().bar(hpPct, 'danger') + '</div>' +
      '<div class="stat-grid" style="margin-top:10px">' +
      h().stat('Attack', e.attack, 'neg') + h().stat('Penetration', e.penetration + '%', 'neg') +
      h().stat('Behaviour', e.behavior.label) + h().stat('Ability', U.esc(e.ability.name.split(' ')[0]), 'gold') +
      '</div>' +
      '<div class="tag-list" style="margin-top:8px">' + statusChips(e.statuses) + '</div>' +
      '<div class="help-line" style="margin-top:6px">' + U.esc(e.behavior.desc) + '</div></div>' +

      '<div class="player-battle" style="margin-top:10px">' +
      '<div class="row" style="justify-content:space-between"><span class="mono-label">CARTOGRAPHER INTEGRITY</span>' +
      '<span class="mono-label" style="color:var(--teal)">' + Math.max(0, Math.round(p.hp)) + ' / ' + p.maxHp + '</span></div>' +
      '<div style="margin-top:5px">' + h().bar(pPct, pPct > 60 ? '' : pPct > 30 ? 'warn' : 'danger') + '</div>' +
      '<div class="row" style="justify-content:space-between;margin-top:8px"><span class="mono-label">ENERGY</span>' +
      '<span class="mono-label" style="color:var(--gold)">' + p.energy + ' / ' + p.energyMax + '</span></div>' +
      '<div style="margin-top:5px">' + h().bar(energyPct, 'gold') + '</div>' +
      '<div class="tag-list" style="margin-top:8px">' + statusChips(p.statuses) + '</div></div>' +

      '<div class="row wrap tactical-actions" style="gap:6px;margin-top:12px">' + actions + '</div>' +
      (battle.over
        ? '<div class="battle-result ' + battle.outcome + '">' +
        '<div class="mono-label">ENGAGEMENT CLOSED · ' + battle.outcome.toUpperCase() + '</div>' +
        '<div class="help-line" style="margin-top:4px">' + battle.damageSustained + ' damage sustained · ' + battle.environmentalDamage + ' environmental · integrity ' + battle.finalCondition + '%</div>' +
        '<div class="row" style="gap:8px;margin-top:8px"><button class="btn primary" data-action="tactical-close">Close Engagement</button>' +
        '<button class="btn sm" data-action="replay-combat">Replay Decisions</button></div></div>'
        : '') +

      '<div class="combat-log" style="margin-top:10px">' + log + '</div>' +
      '</div>';
  }

  function renderOps() {
    var s = state();
    var host = document.getElementById('opsPanel');
    if (!host) return;
    var exp = s.expedition;
    var route = WF.engine.activeRoute(s);
    var companion = WF.companions.active(s);
    var quests = WF.quests ? WF.quests.ensure(s) : [];
    var activeQuests = quests.filter(function (q) { return q.status === 'active' && q.revealed; });

    var pending = s.pendingEncounter;
    var combatHtml = '';

    if (s.tactical) {
      combatHtml = tacticalHtml(s.tactical);
    } else if (pending) {
      combatHtml += '<div class="enemy-card" style="margin-top:10px">' +
        '<div class="enemy-name">' + U.esc(pending.name) + '</div>' +
        '<div class="enemy-class">' + U.esc(pending.class) + ' · TIER ' + pending.tier + (pending.elite ? ' · ELITE' : '') + '</div>' +
        '<div class="enemy-stats">' +
        '<div class="es"><span class="k">Health</span><span class="v">' + pending.health + '</span></div>' +
        '<div class="es"><span class="k">Attack</span><span class="v">' + pending.attack + '</span></div>' +
        '<div class="es"><span class="k">Penetration</span><span class="v">' + pending.penetration + '%</span></div>' +
        '<div class="es"><span class="k">Adaptation</span><span class="v">' + pending.adaptation + '%</span></div>' +
        '</div>' +
        '<div class="ability-box" style="margin-top:10px"><div class="ability-name">' + U.esc(pending.ability.name) + '</div>' +
        '<div class="ability-text">' + U.esc(pending.ability.text) + '</div></div>' +
        '<div class="row" style="margin-top:12px;gap:8px">' +
        '<button class="btn primary" data-action="tactical-start">Engage Tactically</button>' +
        '<button class="btn" data-action="tactical-auto">Auto-Resolve</button>' +
        '<button class="btn sm" data-action="withdraw">Withdraw</button></div></div>';
    }

    if (s.lastCombat && !s.tactical) {
      var lc = s.lastCombat;
      combatHtml += '<div style="margin-top:10px">' +
        '<div class="row" style="justify-content:space-between"><span class="section-label" style="margin:0">COMBAT RESOLUTION</span>' +
        '<span class="tag ' + (lc.outcome === 'victory' ? 'good' : 'bad') + '">' + lc.outcome.toUpperCase() + '</span></div>' +
        '<div class="enemy-card" style="margin-top:8px">' +
        '<div class="row" style="justify-content:space-between"><div class="enemy-name" style="font-size:16px">' + U.esc(lc.enemy.name) + '</div>' +
        (lc.seed ? '<span class="mono-label">SEED ' + lc.seed.toString(16).toUpperCase() + '</span>' : '') + '</div>' +
        '<div class="enemy-stats" style="margin-top:8px">' +
        '<div class="es"><span class="k">Damage Taken</span><span class="v">' + lc.damageSustained + '</span></div>' +
        '<div class="es"><span class="k">Environmental</span><span class="v">' + (lc.environmentalDamage || 0) + '</span></div>' +
        '<div class="es"><span class="k">Integrity</span><span class="v">' + lc.condition + '%</span></div>' +
        '<div class="es"><span class="k">Survival Δ</span><span class="v">' + U.signed(lc.survivalDelta) + '</span></div>' +
        '</div>' +
        (lc.loot && lc.loot.length ? '<div class="tag-list" style="margin-top:8px">' + lc.loot.map(function (l) {
          return '<span class="tag gold">+' + l.qty + ' ' + U.esc(l.name) + '</span>';
        }).join('') + '</div>' : '') +
        '<div class="combat-log" style="margin-top:10px">' + lc.rounds.slice(-14).map(function (r) {
          return '<div class="l ' + (r.kind === 'crit' ? 'crit' : r.kind === 'hit' ? 'hit' : r.kind === 'good' ? 'good' : 'sys') + '">' + U.esc(r.text) + '</div>';
        }).join('') + '</div>' +
        '<div class="row" style="gap:8px;margin-top:8px">' +
        (lc.decisions ? '<button class="btn sm" data-action="replay-combat">Replay Recorded Decisions</button>' : '') +
        '<span class="help-line">' + U.esc(lc.summary) + '</span></div>' +
        (lc.replay ? '<div class="help-line" style="color:var(--ok);margin-top:4px">Replay verified: ' + U.esc(lc.replay.outcome) + ' · ' + lc.replay.damage + ' damage · ' + lc.replay.rounds + ' rounds.</div>' : '') +
        '</div></div>';
    }

    var missionStrip = activeQuests.slice(0, 5).map(function (q) {
      var st = q.stages[0];
      var pct = st ? U.clamp((st.progress / st.target) * 100, 0, 100) : 0;
      return '<div class="mini-quest ' + (q.kind === 'primary' ? 'primary' : '') + '">' +
        '<div class="row" style="justify-content:space-between"><span class="mono-label" style="color:var(--gold-dim)">' + q.label + '</span>' +
        '<span class="mono-label">' + (st ? Math.min(st.progress, st.target) + '/' + st.target : '—') + '</span></div>' +
        '<div style="font-size:11px;color:#cdd9e2;margin-top:2px">' + U.esc(q.title) + '</div>' +
        '<div style="margin-top:5px">' + h().bar(pct, pct >= 100 ? '' : 'warn') + '</div></div>';
    }).join('') || '<div class="help-line">No active assignments. Reroll to generate a mission board.</div>';

    var injuries = (s.injuries || []).map(function (inj) {
      return '<span class="tag bad">' + U.esc(inj.name) + '</span>';
    }).join('') || '<span class="tag good">No injuries</span>';

    host.outerHTML = '<section class="panel" id="opsPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> V. Journey Operations</div>' +
      '<span class="meta-label" style="margin:0">' + U.esc(route ? route.designation + ' ROUTE' : 'NO ROUTE') + '</span></div>' +
      '<div class="panel-body">' +
      '<div class="stat-grid">' +
      h().stat('Route', route ? route.designation : '—', 'teal') +
      h().stat('Companion', companion ? companion.name : 'NONE', companion ? 'gold' : '') +
      h().stat('Integrity', Math.round(s.condition) + '%', s.condition < 40 ? 'neg' : 'pos') +
      h().stat('Level', s.profile ? s.profile.level : 1, 'gold') +
      '</div>' +
      '<div class="row wrap" style="gap:8px;margin-top:12px">' +
      '<button class="btn primary" data-action="survey">Survey Sector · 1⚡ 1🍖</button>' +
      '<button class="btn" data-action="scan">Deep Scan</button>' +
      '<button class="btn" data-action="rest">Make Camp</button>' +
      '<button class="btn" data-action="use" data-id="s-medkit" ' + (function () { var kit = WF.inventory.get(s, 's-medkit'); return kit && kit.qty > 0 ? '' : 'disabled'; })() + '>Trauma Kit · ' + (function () { var kit = WF.inventory.get(s, 's-medkit'); return kit ? kit.qty : 0; })() + '</button>' +
      '<button class="btn danger" data-action="tactical-start" ' + (s.tactical ? 'disabled' : '') + '>Tactical Engage</button>' +
      '<button class="btn" data-action="tactical-auto" ' + (s.tactical ? 'disabled' : '') + '>Auto-Resolve</button>' +
      '<button class="btn gold" data-action="finalize">Finalize &amp; Reroll</button>' +
      '</div>' +
      '<div class="help-line" style="margin-top:8px">Tactical engagements record every decision and can be replayed from the same seed. Auto-resolve uses the deterministic quick model.</div>' +
      combatHtml +

      '<div class="divider"></div>' +
      '<div class="row" style="justify-content:space-between"><span class="section-label" style="margin:0">MISSION CONTROL</span>' +
      '<button class="btn sm" data-action="set-view" data-view="missions">Open Board</button></div>' +
      '<div class="mission-strip">' + missionStrip + '</div>' +

      '<div class="divider"></div>' +
      '<div class="row" style="justify-content:space-between"><span class="section-label" style="margin:0">INJURIES &amp; RECOVERY</span>' +
      '<button class="btn sm" data-action="treat-injury" ' + ((s.injuries || []).length ? '' : 'disabled') + '>Treat (1 med)</button></div>' +
      '<div class="tag-list" style="margin-top:6px">' + injuries + '</div>' +
      '<div class="help-line" style="margin-top:6px">Injuries apply real penalties to attributes. Camp with medical supplies or treat directly to recover.</div>' +
      '</div></section>';
  }

  /* ==================================================================
     RESOURCES + CRAFTING
     ================================================================== */

  function resourceGlyph(name) {
    var p = {
      scrap: '<path d="M4 15 h10 l4 4 H8 z M7 9 h9 l3 4 H10 z" stroke="currentColor" fill="none" stroke-width="1.3"/>',
      circuit: '<rect x="5" y="7" width="14" height="11" rx="2" stroke="currentColor" fill="none" stroke-width="1.3"/><path d="M9 12h6M12 9v6" stroke="currentColor" stroke-width="1.2"/>',
      crystal: '<path d="M12 3 L18 10 L12 21 L6 10 Z" stroke="currentColor" fill="none" stroke-width="1.3"/><path d="M6 10 h12" stroke="currentColor" stroke-width="1"/>',
      void: '<circle cx="12" cy="12" r="5" stroke="currentColor" fill="none" stroke-width="1.3"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width=".7" stroke-dasharray="2 3"/>',
      medical: '<rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" fill="none" stroke-width="1.3"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.6"/>',
      energy: '<rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" fill="none" stroke-width="1.3"/><path d="M13 7 l-4 6 h3 l-1 5 4-6 h-3 z" fill="currentColor"/>',
      food: '<path d="M6 8 h12 v12 H6 z" stroke="currentColor" fill="none" stroke-width="1.3"/><path d="M6 12h12" stroke="currentColor" stroke-width="1"/>',
      relic: '<path d="M12 3 l3 6 6 1 -4 5 1 6 -6-3 -6 3 1-6 -4-5 6-1 z" stroke="currentColor" fill="none" stroke-width="1.1"/>'
    };
    return '<svg viewBox="0 0 24 24">' + (p[name] || p.scrap) + '</svg>';
  }

  function renderResources() {
    var s = state();
    var host = document.getElementById('resourcesPanel');
    if (!host) return;
    var w = WF.inventory.weight(s), cap = WF.inventory.capacity(s);

    var cells = D.RESOURCES.map(function (r) {
      var qty = s.resources[r.id] || 0;
      var fill = U.clamp(qty * 4, 2, 100);
      return '<div class="res-cell" title="' + U.esc(r.desc) + '">' +
        '<span class="res-glyph">' + resourceGlyph(r.glyph) + '</span>' +
        '<div class="grow"><div class="res-name">' + U.esc(r.name) + '</div>' +
        '<div class="res-qty">' + qty + ' <span style="font-size:8px;color:var(--silver-dim)">' + r.unit + '</span></div></div>' +
        '<div style="align-self:stretch;width:2px;background:#0b1218"><div style="width:100%;height:' + fill + '%;background:var(--teal-dim);align-self:flex-end"></div></div>' +
        '</div>';
    }).join('');

    var recipes = WF.inventory.craftable(s).slice(0, 8).map(function (it) {
      var st = WF.inventory.costStatus(s, it);
      return '<div class="recipe">' +
        '<div class="item-sigil">' + A.itemSigil(it) + '</div>' +
        '<div class="grow" style="min-width:0"><div class="recipe-name">' + U.esc(it.name) + '</div>' +
        '<div class="recipe-cost">' + st.rows.map(function (r) {
          return '<span class="' + (r.ok ? '' : 'lack') + '">' + r.have + '/' + r.need + ' ' + U.esc(r.name) + '</span>';
        }).join(' · ') + '</div></div>' +
        '<button class="btn sm" data-action="craft" data-id="' + U.esc(it.instanceId) + '" ' + (st.ok ? '' : 'disabled') + '>Craft</button>' +
        '</div>';
    }).join('');

    host.outerHTML = '<section class="panel" id="resourcesPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> VI. Resources &amp; Fabrication</div>' +
      '<span class="meta-label" style="margin:0">' + w + ' / ' + cap + ' KG</span></div>' +
      '<div class="panel-body">' +
      '<div class="res-grid">' + cells + '</div>' +
      '<div style="margin-top:10px">' + h().bar((w / cap) * 100, w / cap > 0.9 ? 'danger' : w / cap > 0.7 ? 'warn' : 'gold') + '</div>' +
      '<div class="help-line" style="margin-top:6px">Carrying capacity scales with armor and rig equipment. Resources are consumed by surveys, camping, healing and fabrication.</div>' +
      '<div class="section-label" style="margin-top:16px">FABRICATION SCHEMATICS</div>' +
      '<div class="stack" style="gap:6px">' + (recipes || '<div class="empty">No schematics available.</div>') + '</div>' +
      '</div></section>';
  }

  /* ==================================================================
     COMPANIONS
     ================================================================== */

  function renderCompanions() {
    var s = state();
    var host = document.getElementById('companionsPanel');
    if (!host) return;
    var roster = WF.companions.roster(s);

    var cards = roster.map(function (c) {
      var mod = c.module;
      return '<div class="comp-card ' + (c.active ? 'active ' : '') + (c.owned ? '' : 'locked') + '" data-action="activate-companion" data-id="' + c.id + '" role="button" tabindex="0">' +
        '<div class="comp-head">' +
        '<div class="item-sigil">' + (mod ? A.itemSigil(mod) : '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" stroke="#33424e" fill="none"/></svg>') + '</div>' +
        '<div class="grow"><div class="comp-name">' + U.esc(c.name) + '</div><div class="comp-role">' + U.esc(c.role) + ' · LV ' + c.level + '</div></div>' +
        (c.active ? '<span class="tag teal">ACTIVE</span>' : '') +
        '</div>' +
        '<div class="comp-back">' + U.esc(c.personality) + ' ' + U.esc(c.backstory.slice(0, 96)) + '…</div>' +
        '<div class="comp-ability">▸ ' + U.esc(c.ability.name) + ' — ' + U.esc(c.ability.text) + '</div>' +
        '<div class="comp-bonus">' +
        Object.keys(c.bonuses).map(function (k) {
          return '<span class="tag ' + (c.compatible ? 'good' : '') + '">' + U.humanize(k) + ' +' + c.bonuses[k] + '</span>';
        }).join('') +
        '<span class="tag ' + (c.compatible ? 'good' : 'bad') + '">' + (c.compatible ? 'COMPATIBLE' : 'OFF-WORLD') + '</span>' +
        '</div></div>';
    }).join('');

    host.outerHTML = '<section class="panel" id="companionsPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> VII. Companion AI Modules</div>' +
      '<span class="meta-label" style="margin:0">ONE ACTIVE</span></div>' +
      '<div class="panel-body"><div class="comp-grid">' + cards + '</div>' +
      '<div class="help-line" style="margin-top:10px">Click a module to bring it online or take it offline. Off-world companions operate at reduced sync. Bonuses feed directly into combat and survival.</div>' +
      '</div></section>';
  }

  /* ==================================================================
     EXPEDITION LOG
     ================================================================== */

  function renderLog() {
    var s = state();
    var host = document.getElementById('logPanel');
    if (!host) return;
    var history = WF.history.list(s);
    var stats = WF.history.stats(s);

    var current = (s.log || []).slice().reverse().slice(0, 16).map(function (e) {
      var cls = e.type === 'combat' ? (e.outcome === 'victory' ? 'win' : 'loss') : '';
      return '<div class="log-entry ' + cls + '">' +
        '<div class="log-head"><span class="log-no">' + (e.type || 'SYS').toUpperCase() + '</span>' +
        '<span class="log-title" style="font-size:14px">' + U.esc(e.short || '') + '</span></div>' +
        '<div class="log-body">' + U.esc(e.text) + '</div>' +
        '</div>';
    }).join('') || '<div class="empty">No entries for this expedition yet.</div>';

    var archives = history.slice(0, 8).map(function (r) {
      var cls = r.outcome === 'lost' ? 'loss' : r.outcome === 'complete' ? 'win' : '';
      return '<details class="log-entry ' + cls + '" style="padding-bottom:10px">' +
        '<summary style="cursor:pointer;list-style:none;outline:none">' +
        '<div class="log-head"><span class="log-no">EXP ' + U.pad(r.number, 3) + '</span>' +
        '<span class="log-title">' + U.esc(r.name) + '</span>' +
        '<span class="log-world">' + U.esc(r.worldName) + ' · ' + U.esc(r.sector) + '</span>' +
        '<span class="tag ' + (r.outcome === 'complete' ? 'good' : r.outcome === 'lost' ? 'bad' : 'gold') + '" style="margin-left:auto">' + r.outcome.toUpperCase() + '</span></div>' +
        '</summary>' +
        '<div class="row" style="margin-top:6px"><button class="btn sm" data-action="reconstruct" data-seed="' + r.seed + '" data-num="' + r.number + '">Reconstruct from seed</button>' +
        '<span class="help-line">seed ' + r.seedLabel + ' — deterministic rebuild</span></div>' +
        '<div class="log-metrics">' +
        '<span>SURVIVAL <b>' + r.survival + '%</b></span>' +
        '<span>DAMAGE <b>' + r.damage + '</b></span>' +
        '<span>COMBATS <b>' + r.combats + '</b></span>' +
        '<span>INTEGRITY <b>' + r.integrity + '%</b></span>' +
        '<span>SEED <b>' + r.seedLabel + '</b></span>' +
        '</div>' +
        '<div class="log-narrative">' + U.esc(r.narrative).replace(/\n/g, '<br>') + '</div>' +
        (r.conclusion ? '<div class="log-narrative" style="border-left-color:rgba(63,240,208,.3);background:rgba(63,240,208,.02)">' + U.esc(r.conclusion).replace(/\n/g, '<br>') + '</div>' : '') +
        (r.discoveries.length ? '<div class="tag-list" style="margin-top:8px">' + r.discoveries.slice(0, 6).map(function (d) {
          return '<span class="tag">' + U.esc(d) + '</span>';
        }).join('') + '</div>' : '') +
        '</details>';
    }).join('') || '<div class="empty">No archived expeditions yet. Finalise or reroll to record one.</div>';

    host.outerHTML = '<section class="panel" id="logPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> VIII. Expedition Log &amp; Archive Records</div>' +
      '<span class="meta-label" style="margin:0">' + stats.runs + ' ARCHIVED · AVG ' + stats.avgSurvival + '%</span></div>' +
      '<div class="panel-body">' +
      '<div class="row" style="gap:16px;flex-wrap:wrap;margin-bottom:12px">' +
      '<span class="tag teal">CURRENT RUN · ' + (s.log || []).length + ' EVENTS</span>' +
      '<span class="tag good">' + stats.complete + ' COMPLETE</span>' +
      '<span class="tag bad">' + stats.lost + ' LOST</span>' +
      '<span class="tag">TOTAL DAMAGE ' + stats.damage + '</span>' +
      '</div>' +
      '<div class="two-col" style="gap:18px">' +
      '<div><div class="section-label" style="margin-top:0">CURRENT EXPEDITION · LIVE</div>' + current + '</div>' +
      '<div><div class="section-label" style="margin-top:0">ARCHIVED EXPEDITIONS · PERSISTENT</div>' + archives + '</div>' +
      '</div></div></section>';
  }

  ui.renderTelemetry = renderTelemetry;
  ui.renderTuner = renderTuner;
  ui.renderOps = renderOps;
  ui.renderResources = renderResources;
  ui.renderCompanions = renderCompanions;
  ui.renderLog = renderLog;
  ui.survivalModelRows = survivalModelRows;
})(window.WF = window.WF || {});
