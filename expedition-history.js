/* =====================================================================
   engine/expedition-history.js — persistent expedition records
   Exposes: WF.history
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var MAX_HISTORY = 60;

  function aggregateEvents(log) {
    var out = {
      resources: {},
      discoveries: [],
      enemies: [],
      damage: 0,
      combats: 0,
      victories: 0,
      restCount: 0,
      surveys: 0
    };
    (log || []).forEach(function (e) {
      if (e.type === 'discovery') {
        (e.resources || []).forEach(function (r) {
          out.resources[r.id] = (out.resources[r.id] || 0) + r.qty;
        });
        out.discoveries.push(e.short || e.text);
      }
      if (e.type === 'combat') {
        out.combats++;
        if (e.outcome === 'victory') out.victories++;
        if (e.enemy) out.enemies.push(e.enemy);
        out.damage += e.damage || 0;
      }
      if (e.type === 'rest') out.restCount++;
      if (e.type === 'survey') out.surveys++;
    });
    return out;
  }

  function equipmentList(state) {
    var names = [];
    ['weapon', 'armor', 'relic', 'artifact', 'companion'].forEach(function (slot) {
      var it = WF.inventory.equipped(state, slot);
      if (it) names.push(it.name);
    });
    if (state.activeRouteId) {
      var route = WF.routes.find(state.routes || [], state.activeRouteId);
      if (route) names.push('Route ' + route.designation);
    }
    return names;
  }

  function buildRecord(state, forcedOutcome) {
    var exp = state.expedition;
    if (!exp) return null;
    var agg = aggregateEvents(state.log);
    var breakdown = WF.inventory.survivalBreakdown(state);
    var survival = breakdown ? breakdown.survival : exp.survivalBase;
    var profile = WF.inventory.characterProfile(state).attributes;

    var outcome = forcedOutcome;
    if (!outcome) {
      if (state.condition <= 0) outcome = 'lost';
      else if (survival >= 55) outcome = 'complete';
      else outcome = 'partial';
    }

    var eq = equipmentList(state);
    var record = {
      id: exp.id + '_rec',
      number: exp.number,
      name: exp.name,
      worldId: exp.worldId,
      primaryWorldId: exp.worldId,
      worldName: exp.worldName,
      classification: exp.classification,
      sector: exp.sector,
      seed: exp.seed,
      seedLabel: exp.seedLabel,
      difficulty: exp.difficulty,
      outcome: outcome,
      survival: Math.round(survival),
      baseSurvival: exp.survivalBase,
      integrity: Math.round(U.clamp(state.condition, 0, 100)),
      corruption: Math.round(U.clamp(100 - exp.temporalStability + agg.damage * 0.15, 0, 100)),
      damage: Math.round(agg.damage),
      combats: agg.combats,
      victories: agg.victories,
      equipment: eq,
      enemies: agg.enemies,
      discoveries: agg.discoveries,
      resources: agg.resources,
      route: (function () {
        var r = WF.routes.find(state.routes || [], state.activeRouteId);
        return r ? { designation: r.designation, name: r.name, survivalRate: r.survivalRate } : null;
      })(),
      companion: (function () {
        var c = WF.companions.active(state);
        return c ? c.name : null;
      })(),
      log: (state.log || []).slice(-60),
      date: Date.now(),
      missions: (function () {
        var active = (state.quests || []).filter(function (q) { return q.expeditionId === exp.id; });
        var archived = (state.questHistory || []).filter(function (q) { return q.expeditionId === exp.id; });
        var all = active.concat(archived);
        return all.map(function (q) {
          return { id: q.id, kind: q.kind, label: q.label, title: q.title, status: q.status,
            stages: q.stages, rewards: q.rewards, failReason: q.failReason || null };
        });
      })(),
      hazards: [exp.primaryHazard.name, exp.secondaryHazard.name],
      perks: exp.perks.map(function (p) { return p.name; }),
      penalties: exp.penalties.map(function (p) { return p.name; })
    };
    record.narrative = WF.lore.recordNarrative(exp, record);
    if (WF.ai && WF.ai.fallback) {
      record.conclusion = WF.ai.fallback(state, 'conclusion');
    }
    record.equipment = eq;
    record.maxHealth = profile.health;
    return record;
  }

  function archive(state, forcedOutcome) {
    var rec = buildRecord(state, forcedOutcome);
    if (!rec) return null;
    if (!state.history) state.history = [];
    // do not duplicate a record with identical expedition number + date-second
    state.history.unshift(rec);
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    return rec;
  }

  function list(state) { return state.history || []; }

  function stats(state) {
    var h = list(state);
    if (!h.length) return { runs: 0, avgSurvival: 0, complete: 0, lost: 0, damage: 0 };
    var sum = 0, complete = 0, lost = 0, dmg = 0;
    h.forEach(function (r) {
      sum += r.survival;
      if (r.outcome === 'complete') complete++;
      if (r.outcome === 'lost') lost++;
      dmg += r.damage || 0;
    });
    return {
      runs: h.length,
      avgSurvival: Math.round(sum / h.length),
      complete: complete,
      lost: lost,
      damage: dmg
    };
  }

  WF.history = {
    buildRecord: buildRecord,
    archive: archive,
    list: list,
    stats: stats,
    aggregateEvents: aggregateEvents,
    equipmentList: equipmentList,
    MAX_HISTORY: MAX_HISTORY
  };
})(window.WF = window.WF || {});
