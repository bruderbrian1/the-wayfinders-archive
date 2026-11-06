/* =====================================================================
   engine/lore-generator.js — procedural narrative text
   Data-driven templates, deterministic per expedition + event index.
   Exposes: WF.lore
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;
  var rngCache = {};

  function rngFor(exp, salt) {
    var key = exp.id + ':' + salt;
    if (!rngCache[key]) rngCache[key] = new U.RNG((exp.seed ^ U.hashString(key)) >>> 0);
    return rngCache[key];
  }

  function fill(t, vars) {
    return WF.world.fill(t, vars);
  }

  function baseVars(exp) {
    return {
      num: U.pad(exp.number, 3),
      world: exp.worldName,
      sector: exp.sector,
      condition: exp.conditions[0],
      condition2: exp.conditions[1],
      hazard: exp.primaryHazard.name,
      hazard2: exp.secondaryHazard.name,
      faction: exp.faction,
      survival: Math.round(exp.survivalBase),
      deg: 100 - exp.temporalStability
    };
  }

  function intro(exp) {
    return exp.narrative;
  }

  function discovery(exp, collected, roll) {
    var rng = rngFor(exp, 'disc' + (roll || 0));
    var names = collected.map(function (r) { return r.qty + '× ' + r.name; }).join(', ');
    return fill(rng.pick(D.LORE.discovery), Object.assign(baseVars(exp), { resources: names }));
  }

  function combatWin(exp, enemy, damage, loot, rounds, integrity) {
    var rng = rngFor(exp, 'cw' + enemy.seed);
    var lootText = loot.length ? loot.map(function (l) { return l.qty + '× ' + l.name; }).join(', ') : 'no salvage';
    return fill(rng.pick(D.LORE.combatWin), Object.assign(baseVars(exp), {
      enemy: enemy.name, damage: damage, rounds: rounds, loot: lootText, integrity: integrity
    }));
  }

  function combatLoss(exp, enemy, damage) {
    var rng = rngFor(exp, 'cl' + enemy.seed);
    return fill(rng.pick(D.LORE.combatLoss), Object.assign(baseVars(exp), {
      enemy: enemy.name, damage: damage
    }));
  }

  function rest(exp, roll) {
    var rng = rngFor(exp, 'rest' + (roll || 0));
    return fill(rng.pick(D.LORE.rest), baseVars(exp));
  }

  function finalize(exp, survival) {
    var rng = rngFor(exp, 'fin');
    return fill(rng.pick(D.LORE.finalize), Object.assign(baseVars(exp), { survival: Math.round(survival) }));
  }

  /**
   * Full archival narrative built from *actual recorded events*.
   */
  function recordNarrative(exp, record) {
    var rng = rngFor(exp, 'record');
    var lines = [];
    lines.push('Expedition ' + U.pad(record.number, 3) + ' — ' + exp.worldName + '.');
    lines.push(intro(exp));

    var hazards = exp.primaryHazard.name;
    if (record.enemies && record.enemies.length) {
      lines.push('Hostile contact logged: ' + record.enemies.join(', ') + '. ' +
        (record.damage > 0 ? 'The Cartographer sustained ' + record.damage + ' damage across the engagements.' : 'No damage was sustained.'));
    } else {
      lines.push('No hostile contact was recorded. The sector was mapped without engagement.');
    }

    if (record.discoveries && record.discoveries.length) {
      lines.push('Recovered: ' + record.discoveries.slice(0, 4).join('; ') + '.');
    }

    if (record.equipment && record.equipment.length) {
      lines.push('Active loadout: ' + record.equipment.join(', ') + '.');
    }

    lines.push('Structural integrity: ' + Math.round(record.integrity) + '%. ' +
      'Memory corruption: ' + Math.round(record.corruption) + '%. ' +
      'Survival probability: ' + Math.round(record.survival) + '%');

    if (record.outcome === 'lost') {
      lines.push('The archive records this expedition as UNRECOVERED. The Cartographer did not file a closing entry; the log was reconstructed from telemetry.');
    } else if (record.outcome === 'partial') {
      lines.push('The archive records this expedition as PARTIALLY MAPPED. ' + hazards + ' forced an early withdrawal.');
    } else {
      lines.push('The archive records this expedition as COMPLETE. The sector remains unstable, but it is now on the map.');
    }
    return lines.join('\n');
  }

  function itemDiscoveryLine(item, exp) {
    if (!exp) return item.discovery || 'Provenance unknown.';
    var rng = rngFor(exp, 'item' + item.id);
    var templates = [
      'Recovered during Expedition {num} in {sector}, {world}.',
      'Logged from the {world} sector {sector} during Expedition {num}.',
      'Pulled from the debris field at {sector} — Expedition {num}.'
    ];
    return fill(rng.pick(templates), baseVars(exp));
  }

  function sectorReport(exp) {
    return exp.sector + ' · ' + exp.coords.x + ' / ' + exp.coords.y + ' / ' + exp.coords.z +
      ' · depth ' + exp.depth + ' km';
  }

  WF.lore = {
    intro: intro,
    discovery: discovery,
    combatWin: combatWin,
    combatLoss: combatLoss,
    rest: rest,
    finalize: finalize,
    recordNarrative: recordNarrative,
    itemDiscoveryLine: itemDiscoveryLine,
    sectorReport: sectorReport
  };
})(window.WF = window.WF || {});
