/* =====================================================================
   engine/inventory-manager.js — archive, equipment, resources, crafting
   All equipment effects funnel through characterProfile(), which is the
   single source of truth for attribute values.
   Exposes: WF.inventory
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var START_RESOURCES = {
    scrapMetal: 14, ancientCircuits: 7, quantumCrystals: 3,
    voidEssence: 2, medicalSupplies: 4, energyCells: 5,
    foodRations: 8, relicFragments: 4
  };

  var SLOT_OF = {};
  D.SLOTS.forEach(function (s) { SLOT_OF[s.id] = s.category; });

  /* ---------------- bootstrap ---------------- */

  function buildStartingArchive() {
    return D.ITEMS.map(function (def) {
      var inst = clone(def);
      inst.instanceId = def.id;
      inst.qty = def.quantity != null ? def.quantity : 1;
      inst.equipped = false;
      return inst;
    });
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function ensure(state) {
    if (!state.archive || !state.archive.length) state.archive = buildStartingArchive();
    if (!state.resources) state.resources = clone(START_RESOURCES);
    // guarantee every authored item is in the archive (forward-compat)
    D.ITEMS.forEach(function (def) {
      if (!get(state, def.id)) {
        var inst = clone(def);
        inst.instanceId = def.id;
        inst.qty = def.quantity != null ? def.quantity : 1;
        inst.equipped = false;
        state.archive.push(inst);
      }
    });
    return state;
  }

  function get(state, id) {
    for (var i = 0; i < state.archive.length; i++) {
      if (state.archive[i].instanceId === id || state.archive[i].id === id) return state.archive[i];
    }
    return null;
  }

  /* ---------------- derived item data ---------------- */

  function companionOf(item) {
    if (!item || !item.companionId) return null;
    return D.COMPANION_BY_ID[item.companionId] || null;
  }

  function effectiveBonuses(item) {
    if (!item) return {};
    var c = companionOf(item);
    if (c) return c.bonuses || {};
    return item.bonuses || {};
  }

  var WEIGHTS = {
    health: 0.30, armor: 0.72, stamina: 0.18, energy: 0.16,
    radiationRes: 0.46, temporalRes: 0.55, spatialRes: 0.55,
    combatPower: 0.86, navSkill: 0.95, critChance: 0.7,
    damageReduction: 1.4, carry: 0.25
  };

  /** 0–100 performance index derived from actual stat bonuses + rarity. */
  function performance(item) {
    if (!item) return 0;
    if (item.category === 'route') return item.survivalRate || 0;
    var b = effectiveBonuses(item);
    var raw = 0;
    Object.keys(b).forEach(function (k) {
      var w = WEIGHTS[k] != null ? WEIGHTS[k] : 0.2;
      raw += Math.abs(b[k]) * w;
    });
    if (item.category === 'supply' || item.category === 'material') {
      raw += (D.RARITY[item.rarity] ? D.RARITY[item.rarity].mult : 1) * 6;
    }
    var mult = (D.RARITY[item.rarity] || { mult: 1 }).mult;
    return U.clamp(Math.round((raw * (0.9 + mult * 0.35)) / 1.15), 1, 100);
  }

  function compatScore(item, exp) {
    if (!item || !exp) return 50;
    if (!item.compat || !item.compat.length) return 55;
    if (item.compat.indexOf(exp.worldId) >= 0) return 96;
    return 38;
  }

  function statRows(item) {
    var b = effectiveBonuses(item);
    return Object.keys(b).map(function (k) {
      var attr = null;
      D.ATTRIBUTES.forEach(function (a) { if (a.key === k) attr = a; });
      return {
        key: k,
        label: attr ? attr.label : U.humanize(k),
        value: b[k],
        text: U.signed(b[k])
      };
    });
  }

  /* ---------------- equipment ---------------- */

  function slotFor(item) {
    if (!item) return null;
    if (item.category === 'route') return 'route';
    var cat = D.CATEGORY_BY_ID[item.category];
    return cat ? cat.slot : null;
  }

  function equipped(state, slot) {
    for (var i = 0; i < state.archive.length; i++) {
      var it = state.archive[i];
      if (it.equipped && slotFor(it) === slot) return it;
    }
    return null;
  }

  /**
   * Equip an instance. Routes are special: equipping sets the active route
   * which drives survival calculations and the matrix highlight.
   * @returns {{ok:boolean, message:string, previous?:object}}
   */
  function equip(state, id) {
    var item = get(state, id);
    if (!item) return { ok: false, message: 'Item not found in archive.' };
    var slot = slotFor(item);
    if (!slot) return { ok: false, message: 'This item cannot be equipped.' };

    var prev = equipped(state, slot);
    if (prev && prev.instanceId === item.instanceId) {
      return unequip(state, slot);
    }
    if (prev) prev.equipped = false;
    item.equipped = true;

    if (slot === 'route') {
      state.activeRouteId = item.instanceId;
      item.qty = 1;
    }
    if (slot === 'companion') {
      state.activeCompanionId = item.companionId || null;
    }
    return {
      ok: true,
      message: (prev ? 'Swapped ' + prev.name + ' → ' : 'Equipped ') + item.name,
      previous: prev
    };
  }

  function unequip(state, slot) {
    var item = equipped(state, slot);
    if (!item) return { ok: false, message: 'No item equipped in that slot.' };
    item.equipped = false;
    if (slot === 'companion') state.activeCompanionId = null;
    if (slot === 'route') state.activeRouteId = null;
    return { ok: true, message: 'Unequipped ' + item.name, previous: item };
  }

  /* ---------------- character profile ---------------- */

  /**
   * Compute the Cartographer's live attribute profile.
   * @returns {{attributes:object, sources:Array, bonuses:object}}
   */
  function characterProfile(state) {
    var base = D.BASE_CHARACTER;
    var attrs = {
      health: base.health, armor: base.armor, stamina: base.stamina, energy: base.energy,
      radiationRes: base.radiationRes, temporalRes: base.temporalRes, spatialRes: base.spatialRes,
      combatPower: base.combatPower, navSkill: base.navSkill,
      critChance: base.critChance, damageReduction: base.damageReduction
    };
    var sources = [];
    var slots = ['weapon', 'armor', 'relic', 'artifact', 'companion'];

    slots.forEach(function (slot) {
      var item = equipped(state, slot);
      if (!item) return;
      var b = effectiveBonuses(item);
      var applied = {};
      Object.keys(b).forEach(function (k) {
        if (attrs[k] == null) attrs[k] = 0;
        attrs[k] += b[k];
        applied[k] = b[k];
      });
      sources.push({ slot: slot, name: item.name, bonuses: applied, item: item });
    });

    // expedition penalties touch the Cartographer directly
    if (state.expedition) {
      var pen = state.expedition.penalties || [];
      pen.forEach(function (p) {
        var key = /gravity|pressure|collapse|structural|shear/i.test(p.name) ? 'spatialRes'
          : /memory|curse|temporal|identity/i.test(p.name) ? 'temporalRes'
            : /radiation|spore|toxin/i.test(p.name) ? 'radiationRes'
              : /morale|oxygen|heat|water|photosynthetic/i.test(p.name) ? 'stamina' : 'energy';
        attrs[key] += Math.round(p.survival * 0.8);
      });
    }

    // persistent injuries
    (state.injuries || []).forEach(function (inj) {
      var eff = inj.effect || {};
      Object.keys(eff).forEach(function (k) {
        if (attrs[k] == null) attrs[k] = 0;
        attrs[k] += eff[k];
      });
    });

    // clamps
    attrs.health = Math.round(U.clamp(attrs.health, 10, 400));
    attrs.armor = Math.round(U.clamp(attrs.armor, 0, 200));
    attrs.stamina = Math.round(U.clamp(attrs.stamina, 10, 300));
    attrs.energy = Math.round(U.clamp(attrs.energy, 0, 300));
    attrs.radiationRes = Math.round(U.clamp(attrs.radiationRes, 0, 100));
    attrs.temporalRes = Math.round(U.clamp(attrs.temporalRes, 0, 100));
    attrs.spatialRes = Math.round(U.clamp(attrs.spatialRes, 0, 100));
    attrs.combatPower = Math.round(U.clamp(attrs.combatPower, 1, 260));
    attrs.navSkill = Math.round(U.clamp(attrs.navSkill, 1, 220));
    attrs.critChance = Math.round(U.clamp(attrs.critChance, 0, 75));
    attrs.damageReduction = Math.round(U.clamp(attrs.damageReduction, 0, 60));

    return { attributes: attrs, sources: sources };
  }

  /* ---------------- survival model (shared) ---------------- */

  /**
   * Base survival for the current expedition given equipment.
   * Deliberately transparent: every term is surfaced to the UI.
   */
  function survivalBreakdown(state) {
    var exp = state.expedition;
    if (!exp) return null;
    var profile = characterProfile(state);
    var a = profile.attributes;

    var base = exp.survivalBase;

    var navBonus = (a.navSkill - 38) * 0.18;
    var resistBonus = ((a.radiationRes + a.temporalRes + a.spatialRes) - 36) * 0.10;
    var combatBonus = (a.combatPower - 34) * 0.09;
    var armorBonus = (a.armor - 26) * 0.06;
    var healthBonus = (a.health - 100) * 0.05;

    var perkBonus = (exp.perks || []).reduce(function (s, p) { return s + p.survival; }, 0);
    var penaltyTotal = (exp.penalties || []).reduce(function (s, p) { return s + p.survival; }, 0);

    var companionBonus = 0;
    var comp = equipped(state, 'companion');
    if (comp) {
      var c = companionOf(comp);
      if (c) {
        var levelScale = 1 + Math.max(0, (c.level || c.baseLevel || 1) - (c.baseLevel || 1)) * 0.04;
        companionBonus = ((c.bonuses.navSkill || 0) * 0.16 +
          (c.bonuses.temporalRes || 0) * 0.10 +
          (c.bonuses.spatialRes || 0) * 0.10 +
          (c.bonuses.armor || 0) * 0.06 +
          (c.bonuses.health || 0) * 0.04 +
          (c.bonuses.damageReduction || 0) * 0.4) * levelScale;
        if (c.compat.indexOf(exp.worldId) < 0) companionBonus *= 0.5;
      }
    }

    var route = state.activeRouteId ? WF.routes.find(state.routes || [], state.activeRouteId) : null;
    var routeBonus = WF.routes.survivalModifier(route);

    var eventAdjust = state.eventAdjust || 0;
    var conditionBonus = ((state.condition == null ? 100 : state.condition) - 100) * 0.12;

    var raw = base + navBonus + resistBonus + combatBonus + armorBonus + healthBonus +
      perkBonus + penaltyTotal + companionBonus + routeBonus + eventAdjust + conditionBonus;

    var survival = U.clamp(raw, 0, 100);

    return {
      base: base,
      navBonus: navBonus,
      resistBonus: resistBonus,
      combatBonus: combatBonus,
      armorBonus: armorBonus,
      healthBonus: healthBonus,
      perkBonus: perkBonus,
      penaltyTotal: penaltyTotal,
      companionBonus: companionBonus,
      routeBonus: routeBonus,
      eventAdjust: eventAdjust,
      conditionBonus: conditionBonus,
      raw: raw,
      survival: survival,
      route: route
    };
  }

  /* ---------------- resources ---------------- */

  function resourceTotal(state) {
    var total = 0;
    Object.keys(state.resources).forEach(function (k) {
      var def = D.RESOURCE_BY_ID[k];
      total += (state.resources[k] || 0) * (def ? def.weight : 0);
    });
    return total;
  }

  function weight(state) {
    // Only carried things count: consumed resources + actively equipped gear.
    // The archive itself is a database, not a backpack.
    var w = resourceTotal(state);
    state.archive.forEach(function (it) {
      if (!it.equipped || it.category === 'route') return;
      w += (it.weight || 0);
    });
    return U.round(w, 1);
  }

  function capacity(state) {
    var profile = characterProfile(state);
    var carry = 0;
    state.archive.forEach(function (it) {
      if (it.equipped) carry += (effectiveBonuses(it).carry || 0);
    });
    return Math.round(60 + carry + profile.attributes.armor * 0.15);
  }

  function addResource(state, id, amount) {
    if (!state.resources[id]) state.resources[id] = 0;
    state.resources[id] += amount;
    return state.resources[id];
  }

  function consumeResource(state, id, amount) {
    if ((state.resources[id] || 0) < amount) return false;
    state.resources[id] -= amount;
    return true;
  }

  function addItem(state, def, qty) {
    var existing = get(state, def.id);
    if (existing && (def.stackable || existing.stackable)) {
      existing.qty += (qty || 1);
      return existing;
    }
    if (existing) { existing.qty += (qty || 1); return existing; }
    var inst = clone(def);
    inst.instanceId = def.id;
    inst.qty = qty || 1;
    inst.equipped = false;
    state.archive.push(inst);
    return inst;
  }

  /* ---------------- crafting ---------------- */

  function craftable(state) {
    return state.archive.filter(function (it) { return it.craft && it.category !== 'route'; });
  }

  function costStatus(state, item) {
    var rows = [];
    var ok = true;
    Object.keys(item.craft || {}).forEach(function (rid) {
      var need = item.craft[rid];
      var have = state.resources[rid] || 0;
      if (have < need) ok = false;
      rows.push({ id: rid, name: D.RESOURCE_BY_ID[rid].name, need: need, have: have, ok: have >= need });
    });
    return { ok: ok, rows: rows };
  }

  function craft(state, itemId) {
    var item = get(state, itemId);
    if (!item || !item.craft) return { ok: false, message: 'No schematic available.' };
    var status = costStatus(state, item);
    if (!status.ok) return { ok: false, message: 'Insufficient crafting materials.' };
    status.rows.forEach(function (r) { consumeResource(state, r.id, r.need); });
    addItem(state, item, 1);
    return { ok: true, message: 'Fabricated ' + item.name + '.' };
  }

  /* ---------------- search / filter / sort ---------------- */

  function query(state, opts) {
    opts = opts || {};
    var cat = opts.category || 'all';
    var search = (opts.search || '').trim().toLowerCase();
    var sort = opts.sort || 'rarity';
    var rarityRank = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

    var list = state.archive.filter(function (it) {
      if (it.category === 'route' && it.expeditionId && it.expeditionId !== state.expedition.id) return false;
      if (cat !== 'all' && it.category !== cat) return false;
      if (search) {
        var hay = (it.name + ' ' + (it.classification || '') + ' ' + (it.rarity || '') + ' ' +
          (it.ability ? it.ability.name : '')).toLowerCase();
        if (hay.indexOf(search) < 0) return false;
      }
      return true;
    });

    var rarityOf = function (it) { return (D.RARITY[it.rarity] || { mult: 1 }).mult; };

    list.sort(function (a, b) {
      if (sort === 'rarity') {
        var d = rarityRank[b.rarity] - rarityRank[a.rarity];
        return d !== 0 ? d : performance(b) - performance(a);
      }
      if (sort === 'performance') return performance(b) - performance(a);
      if (sort === 'level') return (b.level || 0) - (a.level || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'quantity') return (b.qty || 0) - (a.qty || 0);
      return 0;
    });
    return list;
  }

  function counts(state) {
    var c = { all: 0 };
    D.CATEGORIES.forEach(function (cat) { c[cat.id] = 0; });
    state.archive.forEach(function (it) {
      if (it.category === 'route' && it.expeditionId && it.expeditionId !== state.expedition.id) return;
      c.all++;
      if (c[it.category] != null) c[it.category]++;
    });
    return c;
  }

  /* ---------------- comparison ---------------- */

  function compare(a, b) {
    if (!a || !b) return null;
    var ba = effectiveBonuses(a), bb = effectiveBonuses(b);
    var keys = {};
    Object.keys(ba).forEach(function (k) { keys[k] = true; });
    Object.keys(bb).forEach(function (k) { keys[k] = true; });
    var rows = Object.keys(keys).map(function (k) {
      var va = ba[k] || 0, vb = bb[k] || 0;
      return { key: k, label: U.humanize(k), a: va, b: vb, delta: vb - va };
    });
    rows.sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); });
    return {
      performanceDelta: performance(b) - performance(a),
      rows: rows
    };
  }

  WF.inventory = {
    START_RESOURCES: START_RESOURCES,
    ensure: ensure,
    get: get,
    clone: clone,
    buildStartingArchive: buildStartingArchive,
    companionOf: companionOf,
    effectiveBonuses: effectiveBonuses,
    performance: performance,
    compatScore: compatScore,
    statRows: statRows,
    slotFor: slotFor,
    equipped: equipped,
    equip: equip,
    unequip: unequip,
    characterProfile: characterProfile,
    survivalBreakdown: survivalBreakdown,
    weight: weight,
    capacity: capacity,
    addResource: addResource,
    consumeResource: consumeResource,
    addItem: addItem,
    craftable: craftable,
    costStatus: costStatus,
    craft: craft,
    query: query,
    counts: counts,
    compare: compare
  };
})(window.WF = window.WF || {});
