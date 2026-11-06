/* =====================================================================
   engine/tactical-combat.js — advanced, decision-driven combat
   Extends the deterministic foundation: every battle records its seed and
   the ordered decisions taken, so it can be replayed exactly.
   The original WF.combat.resolve remains available for auto-resolve.
   Exposes: WF.tactical
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var ACTIONS = [
    { id: 'strike', label: 'Strike', hint: 'Balanced weapon attack.', cost: 0 },
    { id: 'aimed', label: 'Aimed Shot', hint: 'Lower damage, +35% crit, applies EXPOSED.', cost: 0 },
    { id: 'guard', label: 'Guard', hint: 'Reduce the next incoming hit by 45%, recover stamina.', cost: 0 },
    { id: 'overcharge', label: 'Overcharge', hint: 'Heavy damage + BURNING. Costs 8 energy.', cost: 8 },
    { id: 'item', label: 'Field Kit', hint: 'Restore 30 integrity. Consumes one trauma kit.', cost: 0 },
    { id: 'retreat', label: 'Withdraw', hint: 'Attempt to disengage. Failure costs a hit.', cost: 0 }
  ];

  var INJURIES = [
    { id: 'laceration', name: 'Laceration', severity: 1, effect: { armor: -4 }, desc: 'A deep cut that limits armour fit and movement.' },
    { id: 'sprain', name: 'Sprained Joint', severity: 1, effect: { stamina: -8 }, desc: 'Weight-bearing is now a negotiation.' },
    { id: 'concussion', name: 'Concussion', severity: 2, effect: { navSkill: -6 }, desc: 'Navigation is reliable; the map is not.' },
    { id: 'radiation_burn', name: 'Radiation Burn', severity: 2, effect: { radiationRes: -10 }, desc: 'The dosimeter has stopped being reassuring.' },
    { id: 'temporal_scar', name: 'Temporal Scar', severity: 2, effect: { temporalRes: -10 }, desc: 'Some of your injuries happened in the wrong order.' },
    { id: 'deep_trauma', name: 'Deep Trauma', severity: 3, effect: { armor: -6, stamina: -10 }, desc: 'Suit integrity and body integrity are both compromised.' }
  ];
  var INJURY_BY_ID = {};
  INJURIES.forEach(function (i) { INJURY_BY_ID[i.id] = i; });

  function behaviorFor(enemy, rng) {
    var cls = String(enemy.class || '').toLowerCase();
    if (/swarm|micro|hive/.test(cls)) return { id: 'swarm', label: 'SWARM', desc: 'Attacks twice every third round.' };
    if (/ambush|predator|tracker/.test(cls)) return { id: 'ambush', label: 'AMBUSH', desc: 'Opening strike deals +50% damage.' };
    if (/intelligence|process|autonomous|archive|parade/.test(cls)) return { id: 'adaptive', label: 'ADAPTIVE', desc: 'Ignores Guard on every second round.' };
    if (enemy.tier >= 4) return { id: 'defensive', label: 'DEFENSIVE', desc: 'Guards every third round, halving incoming damage.' };
    return { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Relentless attacks, +10% damage.' };
  }

  function statusObj() { return {}; }

  function addStatus(holder, key, turns, extra) {
    holder[key] = Object.assign({ turns: turns }, extra || {});
  }

  function tickStatuses(holder, onTick) {
    Object.keys(holder).forEach(function (k) {
      var st = holder[k];
      if (onTick) onTick(k, st);
      st.turns -= 1;
      if (st.turns <= 0) delete holder[k];
    });
  }

  function computePlayer(state) {
    var a = WF.inventory.characterProfile(state).attributes;
    var condition = state.condition == null ? 100 : state.condition;
    return {
      hp: Math.max(1, Math.round(a.health * (condition / 100))),
      maxHp: a.health,
      armor: a.armor,
      armorFactor: 1,
      combatPower: a.combatPower,
      navSkill: a.navSkill,
      critChance: a.critChance,
      damageReduction: a.damageReduction,
      energy: a.energy,
      energyMax: a.energy,
      radiationRes: a.radiationRes,
      temporalRes: a.temporalRes,
      spatialRes: a.spatialRes,
      statuses: statusObj()
    };
  }

  function create(state, opts) {
    opts = opts || {};
    var exp = state.expedition;
    var offset = opts.enemySeed != null ? opts.enemySeed : ((state.encounterSeq || 0) + 1) * 17 + (state.surveyCount || 0);
    var enemy = WF.combat.generateEncounter(state, offset);
    var rng = new U.RNG((enemy.seed ^ 0x6D2B79F5) >>> 0);
    var behavior = behaviorFor(enemy, rng);
    var player = computePlayer(state);
    if (opts.condition != null) {
      var condPct = U.clamp(opts.condition, 1, 100);
      player.hp = Math.max(1, Math.round(player.maxHp * (condPct / 100)));
    }

    var battle = {
      id: 'btl_' + enemy.seed.toString(36),
      seed: enemy.seed,
      expeditionId: exp.id,
      worldId: exp.worldId,
      round: 1,
      phase: 'player',
      over: false,
      outcome: null,
      decisions: [],
      log: [],
      damageSustained: 0,
      environmentalDamage: 0,
      loot: [],
      surviveDelta: 0,
      enemy: {
        name: enemy.name,
        baseName: enemy.baseName,
        class: enemy.class,
        tier: enemy.tier,
        hp: enemy.health,
        maxHp: enemy.health,
        attack: enemy.attack,
        penetration: enemy.penetration,
        adaptation: enemy.adaptation,
        elite: enemy.elite,
        ability: enemy.ability,
        loot: enemy.loot,
        behavior: behavior,
        statuses: statusObj(),
        guard: false,
        usedAbility: 0,
        seed: enemy.seed
      },
      player: player,
      companion: null,
      injuriesApplied: [],
      conditionAtStart: state.condition
    };

    var weapon = WF.inventory.equipped(state, 'weapon');
    if (weapon) {
      battle.weaponId = weapon.id;
      battle.weaponName = weapon.name;
    }

    var comp = WF.companions && WF.companions.active(state);
    if (comp) {
      battle.companion = { id: comp.id, name: comp.name, multiplier: comp.effectiveMultiplier };
      if (comp.id === 'gravekeeper') {
        battle.player.statuses.escort = { turns: 99, reduction: Math.round(10 * comp.effectiveMultiplier) };
        battle.log.push({ kind: 'good', text: 'GRAVEKEEPER deploys in escort formation: incoming damage reduced by ' + (10 * comp.effectiveMultiplier).toFixed(0) + '.' });
      } else if (comp.id === 'oracle7') {
        battle.player.critChance += Math.round(6 * comp.effectiveMultiplier);
        battle.log.push({ kind: 'good', text: 'ORACLE-7 resolves enemy behaviour: ' + behavior.label + ' — ' + behavior.desc });
      } else if (comp.id === 'sable') {
        battle.player.firstStrikeCrit = true;
        battle.log.push({ kind: 'good', text: 'SABLE shadows the approach: opening strike will be a critical.' });
      } else if (comp.id === 'echo') {
        battle.player.echoCharge = true;
        battle.log.push({ kind: 'good', text: 'ECHO anchors a temporal fallback: one lethal blow can be undone.' });
      } else if (comp.id === 'thorn') {
        battle.player.thornTick = true;
        battle.log.push({ kind: 'good', text: 'THORN attaches a nutrient line: field regeneration armed.' });
      }
    }

    // opening status from injuries
    (state.injuries || []).forEach(function (inj) {
      if (inj.id === 'laceration') battle.player.statuses.bleeding = { turns: 2, dmg: 3 };
    });

    battle.log.push({
      kind: 'sys',
      text: 'TACTICAL ENGAGEMENT — ' + enemy.name + ' [' + enemy.class + ' · TIER ' + enemy.tier + '] · BEHAVIOUR ' + behavior.label +
        ' · ENEMY ' + enemy.health + ' HP · YOU ' + battle.player.hp + ' / ' + battle.player.maxHp
    });

    // immutable starting snapshot — replay uses this exact state
    battle.replayBase = JSON.parse(JSON.stringify({
      id: battle.id,
      seed: battle.seed,
      expeditionId: battle.expeditionId,
      worldId: battle.worldId,
      round: 1,
      phase: 'player',
      over: false,
      outcome: null,
      decisions: [],
      log: battle.log.slice(),
      damageSustained: 0,
      environmentalDamage: 0,
      loot: [],
      surviveDelta: 0,
      enemy: battle.enemy,
      player: battle.player,
      companion: battle.companion,
      injuriesApplied: [],
      conditionAtStart: battle.conditionAtStart,
      weaponId: battle.weaponId || null,
      weaponName: battle.weaponName || null
    }));

    return battle;
  }

  function log(battle, kind, text) { battle.log.push({ kind: kind, text: text }); }

  function playerDamage(battle, action, rng) {
    var a = battle.player;
    var weapon = null;
    var mul = 1;
    var critChance = a.critChance;

    battle.weaponName = battle.weaponName || null;
    if (battle.weaponId) weapon = D.ITEM_BY_ID[battle.weaponId];

    if (action === 'aimed') { mul = 0.78; critChance += 35; }
    if (action === 'overcharge') { mul = 1.65; }
    if (action === 'strike' && battle.player.firstStrikeCrit) { critChance = 100; battle.player.firstStrikeCrit = false; }

    var crit = rng.float(0, 100) < critChance;
    var base = (11 + a.combatPower * 0.88) * mul;
    var spread = rng.float(0.9, 1.12);
    var dmg = base * spread * (crit ? 1.7 : 1);
    return { damage: Math.max(1, Math.round(dmg)), crit: crit };
  }

  function enemyDamage(battle, rng, multiplier) {
    var a = battle.player, e = battle.enemy;
    var pen = e.penetration / 100;
    var effArmor = Math.max(0, a.armor * a.armorFactor * (1 - pen * 0.6));
    var mitigation = effArmor / (effArmor + 115);
    var raw = e.attack * (multiplier || 1) * rng.float(0.85, 1.14);
    var dmg = raw * (1 - mitigation) * (1 - Math.min(0.55, (a.damageReduction || 0) / 100));
    if (a.statuses.guarded) dmg *= 0.55;
    if (a.statuses.escort) dmg -= a.statuses.escort.reduction;
    if (e.statuses.exposed) dmg *= 1.0; // exposure affects enemy, not player
    return { damage: Math.max(1, Math.round(dmg)) };
  }

  function applyInjury(state, battle, severity) {
    var rng = new U.RNG((battle.seed ^ (battle.round * 7919)) >>> 0);
    var pool = INJURIES.filter(function (i) { return i.severity <= severity; });
    var injury = rng.pick(pool);
    if (!injury) return null;
    if ((state.injuries || []).some(function (i) { return i.id === injury.id; })) {
      // escalate: apply deep trauma instead
      injury = INJURY_BY_ID.deep_trauma;
      if ((state.injuries || []).some(function (i) { return i.id === injury.id; })) return null;
    }
    var entry = Object.assign({}, injury, { acquiredAt: Date.now(), source: battle.enemy.name, treated: false });
    state.injuries = state.injuries || [];
    state.injuries.push(entry);
    battle.injuriesApplied.push(entry.id);
    log(battle, 'sys', 'INJURY SUSTAINED — ' + injury.name + '. ' + injury.desc);
    return entry;
  }

  function checkInjuryThreshold(state, battle) {
    var a = battle.player;
    var pct = a.hp / a.maxHp;
    if (pct <= 0.5 && !battle.injuriesApplied.length) applyInjury(state, battle, 1);
    else if (pct <= 0.25 && battle.injuriesApplied.length < 2) applyInjury(state, battle, 2);
  }

  function enemyTurn(state, battle, rng) {
    var e = battle.enemy;
    var a = battle.player;

    if (e.statuses.stunned) {
      log(battle, 'good', e.name + ' is staggered and loses the turn.');
      return;
    }

    // burning / bleeding damage on enemy
    if (e.statuses.burning) {
      e.hp -= e.statuses.burning.dmg;
      log(battle, 'good', e.name + ' burns for ' + e.statuses.burning.dmg + ' damage. Integrity ' + Math.max(0, e.hp) + '.');
      if (e.hp <= 0) return;
    }
    if (e.statuses.bleeding) {
      e.hp -= e.statuses.bleeding.dmg;
      log(battle, 'good', e.name + ' bleeds for ' + e.statuses.bleeding.dmg + '. Integrity ' + Math.max(0, e.hp) + '.');
      if (e.hp <= 0) return;
    }

    // defensive behaviour
    if (e.behavior.id === 'defensive' && battle.round % 3 === 0) {
      e.guard = true;
      log(battle, 'sys', e.name + ' raises a defensive posture — incoming damage will be halved this round.');
    }

    var adaptiveBypass = e.behavior.id === 'adaptive' && battle.round % 2 === 0;
    var mult = 1;
    if (e.behavior.id === 'aggressive') mult = 1.1;
    if (e.behavior.id === 'ambush' && battle.round === 1) mult = 1.5;

    // ability every third round
    if (battle.round % 3 === 0) {
      mult *= 1.35;
      e.usedAbility += 1;
      log(battle, 'sys', e.name + ' triggers ' + e.ability.name + ' — ' + e.ability.text);
      if (/radiation|flare|bloom|spore/i.test(e.ability.name)) addStatus(a.statuses, 'irradiated', 2, { dmg: 3 });
      if (/crush|seal|lock|hold/i.test(e.ability.name)) addStatus(a.statuses, 'stunned', 1);
    }

    var strikes = e.behavior.id === 'swarm' && battle.round % 3 === 0 ? 2 : 1;
    for (var s = 0; s < strikes; s++) {
      if (a.statuses.stunned) {
        log(battle, 'sys', 'The Cartographer is stunned and cannot respond.');
        delete a.statuses.stunned;
      }
      var inc = enemyDamage(battle, rng, mult);
      if (adaptiveBypass && a.statuses.guarded) {
        inc.damage = Math.round(inc.damage / 0.55);
        a.statuses.guarded = null;
        log(battle, 'sys', e.name + ' reads the guard and bypasses it.');
      }
      a.hp -= inc.damage;
      battle.damageSustained += inc.damage;
      log(battle, 'hit', e.name + ' strikes for ' + inc.damage + '. Cartographer integrity ' + Math.max(0, a.hp) + '.');
      if (a.hp <= 0) break;
    }

    if (a.statuses.guarded) delete a.statuses.guarded;
    if (a.statuses.irradiated) {
      a.hp -= a.statuses.irradiated.dmg;
      battle.damageSustained += a.statuses.irradiated.dmg;
      log(battle, 'sys', 'Radiation exposure deals ' + a.statuses.irradiated.dmg + ' damage.');
    }
    checkInjuryThreshold(state, battle);
  }

  function environmentTick(state, battle, rng) {
    var exp = state.expedition;
    var a = battle.player;
    var resistMap = {
      radiationRes: a.radiationRes, spatialRes: a.spatialRes, temporalRes: a.temporalRes,
      armor: a.armor * 0.6, energy: a.energy * 0.25, combatPower: a.combatPower * 0.3
    };
    var resist = resistMap[exp.primaryHazard.resistance] || 12;
    var dmg = Math.max(0, Math.round(exp.primaryHazard.severity * 0.11 * (1 - resist / (resist + 55)) * rng.float(0.8, 1.2)));
    if (dmg > 0) {
      a.hp -= dmg;
      battle.damageSustained += dmg;
      battle.environmentalDamage += dmg;
      log(battle, 'sys', exp.primaryHazard.name + ' exposure: ' + dmg + ' damage.');
    }
  }

  /**
   * Take one tactical action. Mutates battle; returns battle.
   */
  function act(state, battle, actionId) {
    if (!battle || battle.over) return battle;
    var action = ACTIONS.filter(function (a) { return a.id === actionId; })[0];
    if (!action) return battle;

    if (actionId === 'overcharge' && battle.player.energy < action.cost) {
      log(battle, 'sys', 'Insufficient energy for Overcharge (' + battle.player.energy + ' remaining).');
      return battle;
    }

    var rng = new U.RNG((battle.seed ^ (battle.round * 2654435761) ^ (battle.decisions.length * 40503)) >>> 0);
    battle.decisions.push(actionId);
    log(battle, 'sys', 'R' + battle.round + ' — ACTION: ' + action.label);

    // player action resolution
    if (actionId === 'guard') {
      addStatus(battle.player.statuses, 'guarded', 1);
      battle.player.energy = Math.min(battle.player.energyMax, battle.player.energy + 6);
      log(battle, 'good', 'The Cartographer braces. Incoming damage reduced by 45% and 6 energy recovered.');
    } else if (actionId === 'item') {
      var kit = WF.inventory.get(state, 's-medkit');
      if (kit && kit.qty > 0) {
        kit.qty -= 1;
        var heal = Math.round(battle.player.maxHp * 0.3);
        battle.player.hp = Math.min(battle.player.maxHp, battle.player.hp + heal);
        log(battle, 'good', 'Trauma kit applied: +' + heal + ' integrity. ' + kit.qty + ' kits remaining.');
      } else {
        log(battle, 'sys', 'No trauma kits remain. The action is wasted.');
      }
    } else if (actionId === 'retreat') {
      var chance = 55 + battle.player.navSkill * 0.25 - (battle.enemy.tier - 1) * 8;
      if (rng.float(0, 100) < chance) {
        battle.over = true;
        battle.outcome = 'retreat';
        battle.surviveDelta = -8;
        log(battle, 'good', 'Disengagement successful. The Cartographer withdraws from the engagement.');
        return finish(state, battle);
      }
      log(battle, 'sys', 'Disengagement failed — the ' + battle.enemy.name + ' closes the distance.');
    } else {
      // offensive actions
      var strike = playerDamage(battle, actionId, rng);
      var armorScale = battle.enemy.guard ? 0.5 : 1;
      if (battle.enemy.statuses.exposed) armorScale *= 1.25;
      var dealt = Math.round(strike.damage * (1 - Math.min(0.5, battle.enemy.penetration / 300)) * armorScale);

      if (actionId === 'overcharge') {
        battle.player.energy -= action.cost;
      }
      if (actionId === 'aimed' || (strike.crit && actionId !== 'overcharge')) {
        addStatus(battle.enemy.statuses, 'exposed', 2);
      }
      if (actionId === 'overcharge') addStatus(battle.enemy.statuses, 'burning', 2, { dmg: 6 });
      if (battle.weaponId === 'r-chronoCompass' || battle.player.stunChance) { /* no-op */ }
      if (battle.weaponId === 'w-nullHammer' && rng.chance(0.2)) {
        addStatus(battle.enemy.statuses, 'stunned', 1);
      }

      battle.enemy.hp -= dealt;
      log(battle, strike.crit ? 'crit' : 'hit',
        (battle.weaponName || 'Weapon') + ' strikes for ' + dealt + (strike.crit ? ' (CRITICAL)' : '') +
        ' damage. Enemy integrity ' + Math.max(0, battle.enemy.hp) + '.');
    }

    if (battle.enemy.hp <= 0) {
      battle.over = true;
      battle.outcome = 'victory';
      battle.surviveDelta = 4 + Math.round(battle.player.combatPower * 0.03);
      return finish(state, battle);
    }

    // enemy turn
    battle.phase = 'enemy';
    enemyTurn(state, battle, rng);

    if (battle.player.hp <= 0) {
      if (battle.player.echoCharge) {
        battle.player.echoCharge = false;
        battle.player.hp = Math.max(1, Math.round(battle.player.maxHp * 0.2));
        log(battle, 'good', 'ECHO rewinds the fatal moment. The Cartographer returns at ' + battle.player.hp + ' integrity.');
      } else {
        battle.over = true;
        battle.outcome = 'defeat';
        battle.surviveDelta = -22;
        return finish(state, battle);
      }
    }

    if (battle.player.thornTick && battle.round === 3) {
      var th = Math.round(battle.player.maxHp * 0.08);
      battle.player.hp = Math.min(battle.player.maxHp, battle.player.hp + th);
      log(battle, 'good', 'THORN administers field nutrients: +' + th + ' integrity.');
    }

    if (battle.round % 2 === 0) environmentTick(state, battle, rng);

    // status tickdown
    tickStatuses(battle.player.statuses, null);
    tickStatuses(battle.enemy.statuses, null);

    battle.round += 1;
    if (battle.round > 14) {
      battle.over = true;
      battle.outcome = 'retreat';
      battle.surviveDelta = -10;
      log(battle, 'sys', 'The engagement exceeds sustainable duration. The Cartographer disengages.');
      return finish(state, battle);
    }
    battle.phase = 'player';
    return battle;
  }

  function finish(state, battle) {
    battle.phase = 'over';
    if (battle.outcome === 'victory') {
      var lootRng = new U.RNG((battle.seed ^ 0xA5A5A5) >>> 0);
      var n = lootRng.int(1, 2);
      for (var i = 0; i < n; i++) {
        var rid = lootRng.pick(battle.enemy.loot);
        var qty = lootRng.int(1, 4);
        WF.inventory.addResource(state, rid, qty);
        battle.loot.push({ id: rid, name: D.RESOURCE_BY_ID[rid].name, qty: qty });
      }
      log(battle, 'good', 'ENCOUNTER RESOLVED — ' + battle.enemy.name + ' destroyed after ' + battle.round +
        ' rounds. ' + battle.damageSustained + ' damage sustained. ' +
        (battle.loot.length ? 'Salvage: ' + battle.loot.map(function (l) { return l.qty + '× ' + l.name; }).join(', ') + '.' : 'No salvage recovered.'));
    } else if (battle.outcome === 'defeat') {
      log(battle, 'hit', 'ENCOUNTER LOST — the Cartographer is down. Field integrity critical.');
    } else {
      log(battle, 'sys', 'ENCOUNTER ABANDONED — withdrawal recorded.');
    }
    battle.finalCondition = Math.max(0, Math.round((battle.player.hp / battle.player.maxHp) * 100));
    return battle;
  }

  /**
   * Replay a recorded battle from its seed and decision list.
   * Used by tests and by the archive's "replay engagement" action.
   */
  function replay(state, seed, decisions, opts) {
    opts = opts || {};
    // run against a sandbox so a replay never mutates resources, injuries or loot
    var sandbox = JSON.parse(JSON.stringify(state));
    if (opts.condition != null) sandbox.condition = opts.condition;
    var battle;
    if (opts.base) {
      battle = JSON.parse(JSON.stringify(opts.base));
    } else {
      battle = create(sandbox, { enemySeed: seed, condition: sandbox.condition });
    }
    (decisions || []).forEach(function (d) {
      if (!battle.over) act(sandbox, battle, d);
    });
    return battle;
  }

  function summary(battle) {
    if (!battle) return null;
    return {
      id: battle.id,
      seed: battle.seed,
      enemy: {
        name: battle.enemy.name, class: battle.enemy.class, tier: battle.enemy.tier,
        maxHealth: battle.enemy.maxHp, attack: battle.enemy.attack,
        penetration: battle.enemy.penetration, adaptation: battle.enemy.adaptation,
        ability: battle.enemy.ability, behavior: battle.enemy.behavior
      },
      rounds: battle.round,
      decisions: battle.decisions.slice(),
      outcome: battle.outcome,
      damageSustained: battle.damageSustained,
      environmentalDamage: battle.environmentalDamage,
      condition: battle.finalCondition,
      loot: battle.loot,
      survivalDelta: battle.surviveDelta,
      log: battle.log.slice()
    };
  }

  function injuriesFor(state) {
    return (state.injuries || []).map(function (inj) {
      var def = INJURY_BY_ID[inj.id] || inj;
      return Object.assign({}, def, { acquiredAt: inj.acquiredAt, source: inj.source });
    });
  }

  function treatInjury(state) {
    if (!state.injuries || !state.injuries.length) return { ok: false, message: 'No injuries require treatment.' };
    var inj = state.injuries.shift();
    return { ok: true, message: 'Treated: ' + inj.name + '. Recovery initiated.', injury: inj };
  }

  WF.tactical = {
    ACTIONS: ACTIONS,
    INJURIES: INJURIES,
    create: create,
    act: act,
    finish: finish,
    replay: replay,
    summary: summary,
    injuriesFor: injuriesFor,
    treatInjury: treatInjury,
    behaviorFor: behaviorFor
  };
})(window.WF = window.WF || {});
