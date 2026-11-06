/* =====================================================================
   engine/expedition-engine.js — orchestration
   Owns expedition lifecycle: generate, survey, scan, rest, travel,
   combat application, finalise and reroll. Single state mutation point.
   Exposes: WF.engine
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var MAX_LOG = 80;

  /* ---------------- route items in the archive ---------------- */

  function routeRarity(route) {
    if (route.survivalRate >= 78) return 'legendary';
    if (route.survivalRate >= 64) return 'epic';
    if (route.survivalRate >= 48) return 'rare';
    if (route.survivalRate >= 32) return 'uncommon';
    return 'common';
  }

  function buildRouteItem(route, exp) {
    return {
      instanceId: route.id,
      id: route.id,
      name: 'Route ' + route.designation + ' — ' + route.name,
      category: 'route',
      rarity: routeRarity(route),
      level: exp.number,
      classification: 'Journey Matrix Route / ' + route.terrain,
      expeditionId: exp.id,
      lore: 'A generated transit solution through ' + exp.sector + '. Projected survival ' + route.survivalRate +
        '%, collapse index ' + route.collapseIndex + '%. ' + (route.isSafest ? 'Currently the safest charted path.' : route.isDeadliest ? 'Currently the most dangerous charted path.' : 'A middling option in an unforgiving sector.'),
      discovery: exp.sector + ', ' + exp.worldName,
      bonuses: {},
      ability: {
        name: 'ROUTE TRANSIT',
        text: 'Selecting this route applies ' + U.signedPct(WF.routes.survivalModifier(route)) + ' to expedition survival.'
      },
      compat: [exp.worldId],
      extraSpecs: [
        ['Distance', route.distance + ' km'],
        ['Hazard Exposure', route.hazardExposure + '%'],
        ['Resource Requirement', route.resourceRequirement + '%']
      ],
      weight: 0, value: 0, qty: 1, equipped: false,
      designation: route.designation,
      routeName: route.name,
      survivalRate: route.survivalRate,
      performance: route.survivalRate
    };
  }

  function syncRouteItems(state) {
    if (!state.expedition || !state.routes) return;
    // remove stale expedition route items
    state.archive = state.archive.filter(function (it) {
      return it.category !== 'route' || it.expeditionId === state.expedition.id;
    });
    state.routes.forEach(function (route) {
      var item = WF.inventory.get(state, route.id);
      if (item && item.category === 'route') {
        item.rarity = routeRarity(route);
        item.survivalRate = route.survivalRate;
        item.performance = route.survivalRate;
        item.lore = 'A generated transit solution through ' + state.expedition.sector + '. Projected survival ' +
          route.survivalRate + '%, collapse index ' + route.collapseIndex + '%. ' +
          (route.isSafest ? 'Currently the safest charted path.' : route.isDeadliest ? 'Currently the most dangerous charted path.' : 'A middling option in an unforgiving sector.');
      } else {
        state.archive.push(buildRouteItem(route, state.expedition));
      }
    });
  }

  function activeRoute(state) {
    return WF.routes.find(state.routes || [], state.activeRouteId);
  }

  /* ---------------- events ---------------- */

  function log(state, event) {
    event.at = Date.now();
    state.log.push(event);
    if (state.log.length > MAX_LOG) state.log.shift();
    return event;
  }

  function bumpAction(state) {
    state.actionSeq = (state.actionSeq || 0) + 1;
    return state.actionSeq;
  }

  function actionRng(state, salt) {
    var seed = (state.expedition.seed ^ U.hashString(salt)) + bumpAction(state) * 2654435761;
    return new U.RNG(seed >>> 0);
  }

  /* ---------------- expedition lifecycle ---------------- */

  function nextNumber(state) {
    return (state.expeditionNumber || 0) + 1;
  }

  function prepareState(state, exp) {
    state.expedition = exp;
    state.expeditionNumber = exp.number;
    state.routes = WF.routes.generate(exp, WF.inventory.characterProfile(state).attributes);
    state.selection = { itemId: null, compare: [] };
    state.surveyCount = 0;
    state.encounterSeq = 0;
    state.log = [];
    state.eventAdjust = 0;
    state.lastCombat = null;
    state.pendingEncounter = null;
    state.condition = U.clamp((state.condition == null ? 100 : state.condition) + 22, 25, 100);

    syncRouteItems(state);

    // default route = safest available
    var safest = state.routes.filter(function (r) { return r.isSafest; })[0] || state.routes[0];
    if (safest) {
      state.activeRouteId = safest.id;
      var item = WF.inventory.get(state, safest.id);
      if (item) item.equipped = true;
    }

    if (WF.profile) {
      WF.profile.recordWorld(state, exp);
      WF.profile.recordSector(state, exp);
      WF.profile.checkAchievements(state);
    }
    if (WF.quests) {
      state.quests = WF.quests.generate(state);
      log(state, {
        type: 'mission',
        text: 'MISSION BOARD GENERATED — ' + state.quests.length + ' assignments active for ' + exp.sector + '.',
        short: state.quests.length + ' MISSIONS'
      });
    }

    log(state, {
      type: 'system',
      text: 'EXPEDITION ' + U.pad(exp.number, 3) + ' — ' + exp.name + ' // ' + exp.worldName + ' // ' + exp.sector,
      short: exp.name
    });
    return state;
  }

  /**
   * Generate a brand new expedition and archive the current one.
   * @param {object} state
   * @param {object} opts { seed, worldId }
   */
  function reroll(state, opts) {
    opts = opts || {};
    var archived = null;
    if (state.expedition && WF.quests) WF.quests.finalize(state, { abandon: true });
    if (state.expedition && state.log && state.log.length) {
      archived = WF.history.archive(state, state.condition <= 0 ? 'lost' : undefined);
    }
    if (archived && WF.profile) {
      WF.profile.recordExpedition(state, archived);
    }
    var seed = opts.seed != null ? opts.seed : ((Math.random() * 0xFFFFFFFF) >>> 0);
    var number = nextNumber(state);
    var unlocked = state.profile && state.profile.unlockedWorlds ? state.profile.unlockedWorlds.slice() : [];
    var exp = WF.world.generate({ seed: seed, number: number, worldId: opts.worldId, unlockedWorldIds: unlocked });
    prepareState(state, exp);
    return { expedition: exp, archived: archived };
  }

  /**
   * Reconstruct a past expedition from its recorded seed.
   * Deterministic: same seed + number => identical world state.
   */
  function reconstruct(state, seed, number, worldId) {
    var archived = null;
    if (!worldId && state.history) {
      var match = state.history.filter(function (r) { return r.seed === Number(seed) && r.number === Number(number); })[0];
      if (match) worldId = match.worldId;
    }
    if (state.expedition && state.log && state.log.length) {
      archived = WF.history.archive(state, state.condition <= 0 ? 'lost' : undefined);
    }
    var unlocked = state.profile && state.profile.unlockedWorlds ? state.profile.unlockedWorlds.slice() : [];
    // reconstruction may target any world that exists, including still-locked content
    D.WORLDS.forEach(function (w) { if (w.locked && unlocked.indexOf(w.id) < 0) unlocked.push(w.id); });
    var exp = WF.world.generate({ seed: Number(seed), number: number || nextNumber(state), worldId: worldId, unlockedWorldIds: unlocked });
    prepareState(state, exp);
    log(state, { type: 'system', text: 'SEED RECONSTRUCTION — sector rebuilt from seed ' + exp.seedLabel + '. Historical expedition ' + U.pad(exp.number, 3) + ' restored for inspection.' });
    return { expedition: exp, archived: archived };
  }

  /** Archive the current run and open the next one. */
  function finalize(state) {
    var missions = WF.quests ? WF.quests.finalize(state) : { completed: [], failed: [], total: 0 };
    var record;
    if (state.condition <= 0) record = WF.history.archive(state, 'lost');
    else record = WF.history.archive(state, undefined);

    var survival = record ? record.survival : 0;
    var xp = Math.round(30 + survival * 0.8 + (missions.completeCount || 0) * 10);
    if (state.condition <= 0) xp = Math.round(xp * 0.35);
    var xpResult = WF.profile ? WF.profile.addXp(state, xp, 'expedition-close') : null;
    if (WF.profile && record) WF.profile.recordExpedition(state, record);
    if (WF.profile) WF.profile.checkAchievements(state);
    return { record: record, missions: missions, xp: xpResult, next: rerollAfterArchive(state) };
  }

  function rerollAfterArchive(state) {
    var seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    var exp = WF.world.generate({ seed: seed, number: nextNumber(state) });
    prepareState(state, exp);
    state.condition = U.clamp(state.condition + 35, 45, 100);
    return exp;
  }

  /* ---------------- field actions ---------------- */

  function survey(state) {
    var exp = state.expedition;
    var rng = actionRng(state, 'survey');
    var route = activeRoute(state);
    var companion = WF.companions.active(state);

    state.surveyCount = (state.surveyCount || 0) + 1;

    // cost
    if (!WF.inventory.consumeResource(state, 'energyCells', 1)) {
      return { ok: false, message: 'No energy cells remaining. Rest or fabricate more.' };
    }
    if (!WF.inventory.consumeResource(state, 'foodRations', 1)) {
      WF.inventory.addResource(state, 'energyCells', 1);
      return { ok: false, message: 'No food rations. The Cartographer cannot work hungry.' };
    }

    var gains = [];
    var pool = exp.resources;
    var picks = rng.int(1, 2);
    var resourceFactor = route ? route.resourceRequirement / 55 : 1;
    if (companion && companion.id === 'thorn') resourceFactor *= 1 + 0.14 * companion.effectiveMultiplier;
    var armor = WF.inventory.equipped(state, 'armor');
    if (armor && armor.id === 'a-scrapRig') resourceFactor *= 1.1;

    for (var i = 0; i < picks; i++) {
      var entry = rng.weighted(pool.map(function (p) { return [p, p.availability]; }));
      if (!entry) continue;
      var qty = Math.max(1, Math.round(rng.int(entry.yieldMin, entry.yieldMax) * resourceFactor));
      WF.inventory.addResource(state, entry.id, qty);
      gains.push({ id: entry.id, name: entry.name, qty: qty });
    }

    var text = WF.lore.discovery(exp, gains, state.surveyCount);
    log(state, { type: 'discovery', text: text, short: gains.map(function (g) { return g.qty + '× ' + g.name; }).join(', '), resources: gains });
    log(state, { type: 'survey', text: 'Survey sweep ' + state.surveyCount + ' completed. 1 energy cell and 1 ration consumed.', resources: gains });

    // environmental wear
    var envDmg = Math.max(0, Math.round(exp.primaryHazard.severity / 100 * rng.int(1, 3)));
    if (envDmg > 0) state.condition = U.clamp(state.condition - envDmg, 0, 100);

    var gainTotal = gains.reduce(function (n, g) { return n + g.qty; }, 0);
    var missionResult = { completed: [] };
    if (WF.profile) {
      WF.profile.recordResourceGain(state, gainTotal);
      WF.profile.addXp(state, 6 + gains.length * 2, 'survey');
      WF.profile.checkAchievements(state);
      touchCompanion(state, 6);
    }
    if (WF.quests) {
      gains.forEach(function (g) {
        WF.quests.progress(state, { type: 'resource', resourceId: g.id, qty: g.qty });
      });
      missionResult = WF.quests.progress(state, { type: 'survey' });
    }

    var encounter = null;
    if (rng.chance(0.42)) encounter = WF.combat.generateEncounter(state, state.surveyCount * 31);

    return { ok: true, gains: gains, text: text, encounter: encounter, envDamage: envDmg,
      missions: missionResult.completed || [], xp: 6 + gains.length * 2 };
  }

  function scan(state) {
    var exp = state.expedition;
    var rng = actionRng(state, 'scan');
    var roll = state.scanCount = (state.scanCount || 0) + 1;

    if (rng.chance(0.55)) {
      var def = WF.world.generateRelic(exp, roll + rng.int(1, 50));
      WF.inventory.addItem(state, def, 1);
      log(state, {
        type: 'discovery',
        text: 'Deep scan resolves a buried object: ' + def.name + ' (' + D.RARITY[def.rarity].label + ' ' + def.classification + ').',
        short: def.name + ' recovered'
      });
      if (WF.profile) {
        WF.profile.recordRelic(state, def);
        WF.profile.addXp(state, 16, 'relic-recovery');
        WF.profile.checkAchievements(state);
        touchCompanion(state, 8);
      }
      var scanMissions = WF.quests ? WF.quests.progress(state, { type: 'scan', itemId: def.id }).completed : [];
      return { ok: true, item: def, message: 'Relic recovered: ' + def.name, missions: scanMissions };
    }

    var def2 = WF.world.generateSupply(exp);
    WF.inventory.addItem(state, def2, 1);
    log(state, {
      type: 'discovery',
      text: 'Scan returns a field cache: ' + def2.name + '.',
      short: def2.name + ' recovered'
    });
    if (WF.profile) {
      WF.profile.addXp(state, 8, 'cache-recovery');
      touchCompanion(state, 4);
    }
    var cacheMissions = WF.quests ? WF.quests.progress(state, { type: 'scan', itemId: def2.id }).completed : [];
    return { ok: true, item: def2, message: 'Cache recovered: ' + def2.name, missions: cacheMissions };
  }

  function rest(state) {
    var rng = actionRng(state, 'rest');
    var hasFood = WF.inventory.consumeResource(state, 'foodRations', 1);
    var hasMed = WF.inventory.consumeResource(state, 'medicalSupplies', 1);

    var heal = (hasFood ? 10 : 3) + (hasMed ? 8 : 0);
    var staminaNote = hasFood ? 'rations consumed' : 'no rations — cold camp';
    state.condition = U.clamp(state.condition + heal, 0, 100);

    var treated = null;
    if (hasMed && state.injuries && state.injuries.length && WF.tactical) {
      treated = WF.tactical.treatInjury(state);
    }
    var text = WF.lore.rest(state.expedition, state.restCount = (state.restCount || 0) + 1);
    log(state, { type: 'rest', text: text + ' Repair cycle: +' + heal + ' integrity (' + staminaNote + ').' + (treated && treated.ok ? ' ' + treated.message : ''), heal: heal });
    if (WF.profile) WF.profile.addXp(state, 3, 'camp');
    return { ok: true, heal: heal, text: text + ' (+' + heal + ' integrity)' + (treated && treated.ok ? ' · ' + treated.message : ''), treated: treated };
  }

  function useConsumable(state, itemId) {
    var item = WF.inventory.get(state, itemId);
    if (!item) return { ok: false, message: 'Item not found.' };
    if (item.category !== 'supply') return { ok: false, message: 'Not a consumable.' };
    if ((item.qty || 0) <= 0) return { ok: false, message: 'Out of stock.' };

    var heal = 0, stamina = 0;
    if (item.id === 's-medkit') heal = 30;
    else if (item.id === 's-ration') { heal = 12; stamina = 20; }
    else if (item.id === 's-stim') { stamina = 25; state.eventAdjust = (state.eventAdjust || 0) + 2; }
    else if (item.id === 's-radAway') { state.eventAdjust = (state.eventAdjust || 0) + 6; }
    else if (item.id === 's-voidFilter') { state.hazardShield = (state.hazardShield || 0) + 1; }
    else heal = 10;

    item.qty -= 1;
    if (heal) state.condition = U.clamp(state.condition + heal, 0, 100);
    if (stamina) state.eventAdjust = (state.eventAdjust || 0) + 1;

    log(state, {
      type: 'system',
      text: 'Used ' + item.name + '. ' + (heal ? '+' + heal + ' integrity. ' : '') + (stamina ? '+' + stamina + ' stamina. ' : '') + 'Stock remaining: ' + item.qty + '.'
    });
    return { ok: true, message: item.name + ' used. +' + heal + ' integrity.', heal: heal };
  }

  function canUse(item) {
    if (!item) return false;
    return item.category === 'supply' && (item.qty || 0) > 0;
  }

  /* ---------------- combat application ---------------- */

  function engage(state, opts) {
    opts = opts || {};
    state.encounterSeq = (state.encounterSeq || 0) + 1;
    var enemy = WF.combat.generateEncounter(state, state.encounterSeq * 17 + state.surveyCount);
    var profile = WF.inventory.characterProfile(state).attributes;
    var result = WF.combat.resolve(state, enemy, opts);

    var dmgPct = (result.damageSustained / Math.max(1, profile.health)) * 100;
    state.condition = U.clamp((result.hpRemaining / Math.max(1, profile.health)) * 100, 0, 100);
    state.eventAdjust = U.clamp((state.eventAdjust || 0) + result.survivalDelta, -45, 30);

    var text = result.outcome === 'victory'
      ? WF.lore.combatWin(state.expedition, enemy, result.damageSustained, result.loot, result.roundCount, Math.round(state.condition))
      : WF.lore.combatLoss(state.expedition, enemy, result.damageSustained);

    log(state, {
      type: 'combat',
      text: text,
      enemy: enemy.name,
      outcome: result.outcome,
      damage: result.damageSustained,
      rounds: result.roundCount,
      loot: result.loot
    });

    if (WF.profile) {
      WF.profile.recordCombat(state, result);
      WF.profile.addXp(state, result.outcome === 'victory' ? 26 : 6, 'combat');
      WF.profile.checkAchievements(state);
      touchCompanion(state, 10);
    }
    if (WF.quests) WF.quests.progress(state, { type: 'combat', outcome: result.outcome });
    if (state.condition <= 0 && WF.quests && WF.quests.failAllActive) {
      WF.quests.failAllActive(state, 'The Cartographer was incapacitated in combat.');
    }

    result.condition = Math.round(state.condition);
    state.lastCombat = {
      enemy: { name: enemy.name, class: enemy.class, tier: enemy.tier, health: enemy.maxHealth, attack: enemy.attack, penetration: enemy.penetration, adaptation: enemy.adaptation, ability: enemy.ability },
      rounds: result.rounds,
      outcome: result.outcome,
      damageSustained: result.damageSustained,
      environmentalDamage: result.environmentalDamage,
      loot: result.loot,
      survivalDelta: result.survivalDelta,
      summary: result.summary,
      condition: result.condition
    };
    return result;
  }

  /* ---------------- advanced tactical engagements ---------------- */

  function touchCompanion(state, amount) {
    if (!WF.profile) return;
    var c = WF.companions && WF.companions.active(state);
    if (!c) return;
    WF.profile.companionXp(state, c.id, amount);
    if (WF.companions.reconcile) WF.companions.reconcile(state);
  }

  function startTactical(state) {
    if (!WF.tactical) return null;
    if (state.tactical) return state.tactical;
    state.encounterSeq = (state.encounterSeq || 0) + 1;
    var battle = WF.tactical.create(state);
    state.tactical = battle;
    log(state, {
      type: 'combat',
      text: 'TACTICAL ENGAGEMENT OPENED — ' + battle.enemy.name + ' [' + battle.enemy.behavior.label + ']. Decision log recording.',
      short: 'TACTICAL: ' + battle.enemy.name
    });
    return battle;
  }

  function tacticalAct(state, actionId) {
    if (!state.tactical || !WF.tactical) return null;
    var battle = state.tactical;
    WF.tactical.act(state, battle, actionId);
    if (battle.over) applyTacticalResult(state, battle);
    return battle;
  }

  function applyTacticalResult(state, battle) {
    var profile = WF.inventory.characterProfile(state).attributes;
    state.condition = U.clamp((battle.player.hp / battle.player.maxHp) * 100, 0, 100);
    state.eventAdjust = U.clamp((state.eventAdjust || 0) + battle.surviveDelta, -45, 30);

    var text = battle.outcome === 'victory'
      ? WF.lore.combatWin(state.expedition, battle.enemy, battle.damageSustained, battle.loot, battle.round, Math.round(state.condition))
      : WF.lore.combatLoss(state.expedition, battle.enemy, battle.damageSustained);

    log(state, {
      type: 'combat',
      text: text + ' Decisions recorded: ' + battle.decisions.join(' → ') + '.',
      enemy: battle.enemy.name,
      outcome: battle.outcome,
      damage: battle.damageSustained,
      rounds: battle.round,
      loot: battle.loot
    });

    if (WF.profile) {
      WF.profile.recordCombat(state, { outcome: battle.outcome, damageSustained: battle.damageSustained });
      WF.profile.addXp(state, battle.outcome === 'victory' ? 34 : 8, 'tactical-combat');
      WF.profile.checkAchievements(state);
      touchCompanion(state, battle.outcome === 'victory' ? 16 : 6);
    }
    if (WF.quests) WF.quests.progress(state, { type: 'combat', outcome: battle.outcome });
    if (state.condition <= 0 && WF.quests && WF.quests.failAllActive) {
      WF.quests.failAllActive(state, 'The Cartographer was incapacitated in tactical combat.');
    }

    state.lastCombat = {
      enemy: {
        name: battle.enemy.name, class: battle.enemy.class, tier: battle.enemy.tier,
        health: battle.enemy.maxHp, attack: battle.enemy.attack,
        penetration: battle.enemy.penetration, adaptation: battle.enemy.adaptation,
        ability: battle.enemy.ability, behavior: battle.enemy.behavior
      },
      rounds: battle.log,
      outcome: battle.outcome,
      damageSustained: battle.damageSustained,
      environmentalDamage: battle.environmentalDamage,
      loot: battle.loot,
      survivalDelta: battle.surviveDelta,
      summary: battle.outcome === 'victory'
        ? battle.enemy.name + ' destroyed in ' + battle.round + ' rounds. ' + battle.damageSustained + ' damage sustained.'
        : battle.outcome === 'defeat'
          ? 'Defeated by ' + battle.enemy.name + '. Field integrity critical.'
          : 'Withdrew from ' + battle.enemy.name + ' after ' + battle.round + ' rounds.',
      condition: Math.round(state.condition),
      seed: battle.seed,
      conditionAtStart: battle.conditionAtStart,
      decisions: battle.decisions.slice(),
      tacticalBase: battle.replayBase ? JSON.parse(JSON.stringify(battle.replayBase)) : null,
      tactical: true
    };
    battle.applied = true;
    return battle;
  }

  function closeTactical(state) {
    state.tactical = null;
  }

  function replayLast(state) {
    if (!state.lastCombat || !state.lastCombat.decisions) return null;
    var battle = WF.tactical.replay(state, state.lastCombat.seed, state.lastCombat.decisions, {
      condition: state.lastCombat.conditionAtStart,
      base: state.lastCombat.tacticalBase || null
    });
    state.lastCombat.replay = {
      outcome: battle.outcome,
      damage: battle.damageSustained,
      rounds: battle.round,
      log: battle.log
    };
    return state.lastCombat.replay;
  }

  /* ---------------- tuner ---------------- */

  function tunerResult(state) {
    var breakdown = WF.inventory.survivalBreakdown(state);
    if (!breakdown) return null;
    var supplies = state.tuner.supplies;
    var overclock = state.tuner.overclock;

    var supplyMod = (50 - supplies) * 0.18;
    var overclockMod = (50 - overclock) * 0.12;
    var variance = supplyMod + overclockMod;
    var estimated = U.clamp(breakdown.survival + variance, 0, 100);

    return {
      base: breakdown.survival,
      supplyMod: supplyMod,
      overclockMod: overclockMod,
      variance: variance,
      estimated: estimated,
      delta: estimated - breakdown.survival,
      risk: U.riskClass(estimated),
      breakdown: breakdown
    };
  }

  WF.engine = {
    reroll: reroll,
    reconstruct: reconstruct,
    finalize: finalize,
    prepareState: prepareState,
    survey: survey,
    scan: scan,
    rest: rest,
    useConsumable: useConsumable,
    canUse: canUse,
    engage: engage,
    startTactical: startTactical,
    tacticalAct: tacticalAct,
    closeTactical: closeTactical,
    replayLast: replayLast,
    touchCompanion: touchCompanion,
    tunerResult: tunerResult,
    activeRoute: activeRoute,
    syncRouteItems: syncRouteItems,
    log: log,
    routeRarity: routeRarity
  };
})(window.WF = window.WF || {});
