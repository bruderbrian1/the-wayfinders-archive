/* =====================================================================
   engine/companion-manager.js — recruitable AI modules
   One active companion. Bonuses only apply when the module is equipped
   and the companion is compatible with the current world.
   Exposes: WF.companions
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  function moduleFor(state, companionId) {
    for (var i = 0; i < state.archive.length; i++) {
      if (state.archive[i].companionId === companionId) return state.archive[i];
    }
    return null;
  }

  /** Full roster joined against the archive (owned) and active slot. */
  function roster(state) {
    var activeMod = WF.inventory.equipped(state, 'companion');
    return D.COMPANIONS.map(function (c) {
      var mod = moduleFor(state, c.id);
      var active = !!(activeMod && activeMod.companionId === c.id);
      var compat = state.expedition ? c.compat.indexOf(state.expedition.worldId) >= 0 : false;
      var level = WF.profile
        ? WF.profile.companionLevel(state, c.id, c.level)
        : c.level + Math.floor((state.expedition ? state.expedition.number : 0) / 3);
      var standing = WF.profile ? WF.profile.companionStanding(state, c.id) : { xp: 0, affinity: 0 };
      return {
        id: c.id,
        name: c.name,
        role: c.role,
        rarity: c.rarity,
        baseLevel: c.level,
        level: level,
        personality: c.personality,
        backstory: c.backstory,
        ability: c.ability,
        bonuses: c.bonuses,
        compat: c.compat,
        owned: !!mod,
        module: mod,
        active: active,
        compatible: compat,
        xp: standing.xp,
        affinity: standing.affinity,
        effectiveMultiplier: (compat ? 1 : 0.6) * (1 + Math.max(0, level - c.level) * 0.04)
      };
    });
  }

  function active(state) {
    var mod = WF.inventory.equipped(state, 'companion');
    if (!mod || !mod.companionId) return null;
    var list = roster(state);
    for (var i = 0; i < list.length; i++) if (list[i].id === mod.companionId) return list[i];
    return null;
  }

  function activate(state, companionId) {
    var mod = moduleFor(state, companionId);
    if (!mod) return { ok: false, message: 'Companion module not found in archive.' };
    var res = WF.inventory.equip(state, mod.instanceId);
    if (res.ok) {
      var c = D.COMPANION_BY_ID[companionId];
      res.message = c.name + ' online — ' + c.role;
    }
    return res;
  }

  function deactivate(state) {
    return WF.inventory.unequip(state, 'companion');
  }

  /** Flat bonus snapshot for display and combat. */
  function activeBonuses(state) {
    var c = active(state);
    if (!c) return { bonuses: {}, multiplier: 0, companion: null };
    return {
      bonuses: c.bonuses,
      multiplier: c.effectiveMultiplier,
      companion: c
    };
  }

  /** Keep the active slot, profile standings and archive flags consistent. */
  function reconcile(state) {
    if (!state.archive) return;
    var activeId = state.activeCompanionId;
    state.archive.forEach(function (it) {
      if (it.category !== 'companion') return;
      if (activeId && it.companionId === activeId) it.equipped = true;
      if (!activeId) it.equipped = false;
    });
    if (!activeId) {
      var eq = WF.inventory.equipped(state, 'companion');
      if (eq && eq.companionId) state.activeCompanionId = eq.companionId;
    }
    if (WF.profile) D.COMPANIONS.forEach(function (c) { WF.profile.companionStanding(state, c.id); });
  }

  WF.companions = {
    roster: roster,
    reconcile: reconcile,
    active: active,
    activate: activate,
    deactivate: deactivate,
    activeBonuses: activeBonuses,
    moduleFor: moduleFor
  };
})(window.WF = window.WF || {});
