/* =====================================================================
   engine/combat-engine.js — deterministic encounter resolution
   Seeded per encounter so results are reproducible from expedition seeds,
   while encounter composition is randomised.
   Exposes: WF.combat
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  /* ---------- encounter generation ---------- */

  function generateEncounter(state, seedOffset) {
    var exp = state.expedition;
    var seed = (exp.seed ^ 0x85EBCA6B) + Math.floor((seedOffset == null ? Date.now() : seedOffset) % 100000) * 2654435761;
    var rng = new U.RNG(seed >>> 0);
    var base = rng.pick(exp.enemyPool) || rng.pick(D.WORLD_BY_ID[exp.worldId].enemies);
    var elite = rng.chance(0.18 + exp.difficulty.score / 500);

    var scale = 1 + (exp.number - 1) * 0.06 + (exp.difficulty.score - 50) / 260;
    var enemy = {
      seed: seed >>> 0,
      name: (elite ? 'Elite ' : '') + base.name,
      baseName: base.name,
      class: base.class,
      tier: base.tier + (elite ? 1 : 0),
      elite: elite,
      health: Math.round(base.health * scale * (elite ? 1.28 : 1)),
      maxHealth: Math.round(base.health * scale * (elite ? 1.28 : 1)),
      attack: Math.round(base.attack * scale * (elite ? 1.15 : 1)),
      penetration: Math.round(base.penetration * (elite ? 1.1 : 1)),
      adaptation: Math.round(base.adaptation),
      ability: base.ability,
      loot: base.loot.slice(),
      sprite: base.name
    };
    return enemy;
  }

  /* ---------- deterministic round maths ---------- */

  function playerStrike(profile, weapon, rng) {
    var critChance = 7 + (weapon ? (weapon.bonuses.critChance || 0) : 0);
    if (profile.critChance) critChance += Math.max(0, profile.critChance - 7);
    var crit = rng.float(0, 100) < critChance;
    var baseDamage = 11 + profile.combatPower * 0.88;
    var spread = rng.float(0.9, 1.12);
    var dmg = baseDamage * spread * (crit ? 1.7 : 1);
    return { damage: Math.max(1, Math.round(dmg)), crit: crit };
  }

  function enemyStrike(enemy, profile, rng) {
    var pen = enemy.penetration / 100;
    var effectiveArmor = profile.armor * (1 - pen * 0.6);
    var mitigation = effectiveArmor / (effectiveArmor + 115);
    var variance = rng.float(0.85, 1.14);
    var raw = enemy.attack * variance;
    var dmg = raw * (1 - mitigation);
    var dr = Math.min(0.55, (profile.damageReduction || 0) / 100);
    dmg = dmg * (1 - dr);
    return { damage: Math.max(1, Math.round(dmg)) };
  }

  function environmentalDamage(exp, profile, rng) {
    var h = exp.primaryHazard;
    var resistMap = {
      radiationRes: profile.radiationRes,
      spatialRes: profile.spatialRes,
      temporalRes: profile.temporalRes,
      armor: profile.armor * 0.6,
      energy: profile.energy * 0.25,
      combatPower: profile.combatPower * 0.3
    };
    var resist = resistMap[h.resistance] != null ? resistMap[h.resistance] : 12;
    var exposure = h.severity * 0.11;
    var mitigation = resist / (resist + 55);
    var dmg = exposure * (1 - mitigation) * rng.float(0.8, 1.2);
    return Math.max(0, Math.round(dmg));
  }

  /**
   * Resolve a full encounter deterministically.
   * @param {object} state app state
   * @param {object} enemy from generateEncounter
   * @param {object} opts { useStim, healFirst }
   * @returns {object} result with round log and applied deltas
   */
  function resolve(state, enemy, opts) {
    opts = opts || {};
    var profile = WF.inventory.characterProfile(state).attributes;
    var weapon = WF.inventory.equipped(state, 'weapon');
    var companion = WF.companions.active(state);
    var exp = state.expedition;
    var rng = new U.RNG(enemy.seed ^ 0x1B56C4E9);

    var maxHp = profile.health;
    var condition = state.condition == null ? 100 : state.condition;
    var hp = Math.max(1, Math.round(maxHp * (condition / 100)));
    var enemyHp = enemy.health;
    var rounds = [];
    var damageSustained = 0;
    var envDamage = 0;
    var round = 0;
    var maxRounds = 12;

    // opening bonuses
    var initiative = profile.navSkill > enemy.adaptation ? 'player' : 'enemy';
    rounds.push({ kind: 'sys', text: 'ENCOUNTER: ' + enemy.name + ' [' + enemy.class + '] — initiative ' + initiative.toUpperCase() + '.' });

    if (opts.useStim && (state.resources.medicalSupplies || 0) > 0) {
      WF.inventory.consumeResource(state, 'medicalSupplies', 1);
      hp = Math.min(maxHp, hp + Math.round(maxHp * 0.18));
      rounds.push({ kind: 'good', text: 'Stim injected. Field integrity stabilised before engagement.' });
    }

    var guardReduction = companion && companion.id === 'gravekeeper' ? 4 * companion.effectiveMultiplier : 0;

    while (enemyHp > 0 && hp > 0 && round < maxRounds) {
      round++;

      // player action
      var strike = playerStrike(profile, weapon, rng);
      var armorScale = 1 - Math.min(0.5, enemy.penetration / 300);
      var dealt = Math.round(strike.damage * armorScale);
      enemyHp -= dealt;
      rounds.push({
        kind: strike.crit ? 'crit' : 'hit',
        text: 'R' + round + ' — ' + (weapon ? weapon.name : 'unarmed') + ' strikes for ' + dealt +
          (strike.crit ? ' (CRITICAL)' : '') + '. Enemy integrity ' + Math.max(0, enemyHp) + '.'
      });

      // enemy action
      if (enemyHp > 0) {
        if (companion && companion.id === 'gravekeeper' && round === 1) {
          rounds.push({ kind: 'good', text: 'GRAVEKEEPER intercepts — incoming damage reduced by ' + Math.round(guardReduction) + '.' });
        }
        var inc = enemyStrike(enemy, profile, rng);
        var mitigated = Math.max(1, Math.round(inc.damage - guardReduction));
        hp -= mitigated;
        damageSustained += mitigated;
        rounds.push({ kind: 'hit', text: 'R' + round + ' — ' + enemy.name + ' hits for ' + mitigated + '. Cartographer integrity ' + Math.max(0, hp) + '.' });
      }

      // environmental tick every second round
      if (round % 2 === 0 && hp > 0) {
        var env = environmentalDamage(exp, profile, rng);
        if (env > 0) {
          hp -= env;
          damageSustained += env;
          envDamage += env;
          rounds.push({ kind: 'sys', text: 'R' + round + ' — ' + exp.primaryHazard.name + ' exposure: ' + env + ' damage.' });
        }
      }

      // companion support tick
      if (companion && companion.id === 'thorn' && round === 3 && hp > 0) {
        var heal = Math.round(8 * companion.effectiveMultiplier);
        hp = Math.min(maxHp, hp + heal);
        rounds.push({ kind: 'good', text: 'THORN administers field nutrients. +' + heal + ' integrity.' });
      }
    }

    var outcome;
    if (enemyHp <= 0) outcome = 'victory';
    else if (hp <= 0) outcome = 'defeat';
    else outcome = 'retreat';

    var loot = [];
    if (outcome === 'victory') {
      var lootRng = new U.RNG(enemy.seed ^ 0xA5A5A5);
      var n = lootRng.int(1, 2);
      for (var i = 0; i < n; i++) {
        var rid = lootRng.pick(enemy.loot);
        var qty = lootRng.int(1, 4);
        WF.inventory.addResource(state, rid, qty);
        loot.push({ id: rid, name: D.RESOURCE_BY_ID[rid].name, qty: qty });
      }
    }

    var hpDelta = hp - maxHp;
    var survivalDelta = outcome === 'victory' ? 4 + Math.round(profile.combatPower * 0.03)
      : outcome === 'retreat' ? -8 : -22;

    return {
      enemy: enemy,
      outcome: outcome,
      rounds: rounds,
      roundCount: round,
      damageSustained: damageSustained,
      environmentalDamage: envDamage,
      hpRemaining: Math.max(0, hp),
      healthDelta: hpDelta,
      loot: loot,
      survivalDelta: survivalDelta,
      summary: outcome === 'victory'
        ? enemy.name + ' destroyed in ' + round + ' rounds. ' + damageSustained + ' damage sustained.'
        : outcome === 'retreat'
          ? 'Retreated from ' + enemy.name + ' after ' + round + ' rounds. ' + damageSustained + ' damage sustained.'
          : 'Defeated by ' + enemy.name + '. Expedition integrity critical.'
    };
  }

  WF.combat = {
    generateEncounter: generateEncounter,
    resolve: resolve,
    playerStrike: playerStrike,
    enemyStrike: enemyStrike,
    environmentalDamage: environmentalDamage
  };
})(window.WF = window.WF || {});
