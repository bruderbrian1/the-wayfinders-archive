/* =====================================================================
   engine/route-calculator.js — journey matrix generation
   Routes are procedurally generated per expedition and recalculated
   against the Cartographer's live equipment profile.
   Exposes: WF.routes
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var TERRAIN_PROFILE = {
    'Shelf Line': { hazard: 0.9, resources: 0.9 },
    'Trench Cut': { hazard: 1.15, resources: 1.1 },
    'Ridge Traverse': { hazard: 1.25, resources: 0.8 },
    'Sink Corridor': { hazard: 1.1, resources: 1.0 },
    'Span Crossing': { hazard: 0.85, resources: 0.7 },
    'Underpass': { hazard: 1.2, resources: 1.15 },
    'Drift Lane': { hazard: 1.0, resources: 1.0 },
    'Long Way Round': { hazard: 0.7, resources: 0.85 },
    'Direct Cut': { hazard: 1.3, resources: 0.75 },
    'Old Survey Line': { hazard: 0.8, resources: 1.2 },
    'Smuggler Path': { hazard: 1.05, resources: 1.35 },
    'Pilgrim Route': { hazard: 0.75, resources: 0.95 }
  };

  function generate(exp, character) {
    var rng = new U.RNG(exp.seed ^ 0xB5297A4D);
    var count = 4 + (rng.chance(0.22) ? 1 : 0);
    var terrainPool = rng.shuffle(D.ROUTE_TERRAIN);
    var designations = D.ROUTE_DESIGNATIONS.slice(0, count);
    var routes = [];

    for (var i = 0; i < count; i++) {
      var terrain = terrainPool[i % terrainPool.length];
      var prof = TERRAIN_PROFILE[terrain] || { hazard: 1, resources: 1 };
      routes.push({
        id: 'route-' + i,
        index: i,
        designation: designations[i],
        name: terrain + ' ' + rng.pick(D.ROUTE_DESIGNATIONS),
        terrain: terrain,
        distance: U.round(rng.float(1.4, 24.8), 1),
        base: {
          stabilityNoise: rng.int(-20, 20),
          survivalNoise: rng.int(-8, 8),
          collapseNoise: rng.int(-9, 9),
          popWeight: rng.float(0.25, 2.4),
          hazardFactor: prof.hazard * rng.float(0.88, 1.16),
          resourceFactor: prof.resources * rng.float(0.9, 1.12),
          compatNoise: rng.int(-14, 14)
        },
        detected: false
      });
    }
    return recalc(routes, character, exp);
  }

  /** Recompute every metric from current character + expedition. */
  function recalc(routes, character, exp) {
    var rng = new U.RNG((exp.seed ^ 0x27D4EB2F) >>> 0);
    character = character || D.BASE_CHARACTER;

    var resistTotal = (character.spatialRes + character.temporalRes + character.radiationRes) / 3;
    var hazardSeverity = (exp.primaryHazard.severity * 0.62 + exp.secondaryHazard.severity * 0.38);

    var totalPop = 0;

    routes.forEach(function (r) {
      var b = r.base;

      var compatibility = U.clamp(
        58 + (character.navSkill - 38) * 0.55 + (resistTotal - 12) * 0.9 + b.compatNoise,
        6, 99
      );

      var stability = U.clamp(
        62 + (character.spatialRes - 12) * 0.7 + (character.temporalRes - 12) * 0.45 + b.stabilityNoise,
        8, 99
      );

      var hazardExposure = U.clamp(
        hazardSeverity * b.hazardFactor * 0.92 - (resistTotal - 12) * 0.35,
        3, 99
      );

      var survivalRate = U.clamp(
        stability * 0.44 + compatibility * 0.32 + (100 - hazardExposure) * 0.16 +
        (character.navSkill - 38) * 0.18 + b.survivalNoise,
        4, 98
      );

      var collapseIndex = U.clamp(
        100 - stability * 0.58 - compatibility * 0.14 + hazardExposure * 0.22 + b.collapseNoise,
        2, 98
      );

      var requirement = U.clamp(
        Math.round(exp.difficulty.score * 0.52 + hazardExposure * 0.34 + b.resourceFactor * 8 - 18),
        5, 95
      );

      r.compatibility = Math.round(compatibility);
      r.stability = Math.round(stability);
      r.hazardExposure = Math.round(hazardExposure);
      r.survivalRate = Math.round(survivalRate);
      r.collapseIndex = Math.round(collapseIndex);
      r.resourceRequirement = Math.round(requirement);
      r.popWeight = b.popWeight;
      r.coords = {
        x: Math.round(collapseIndex),
        y: Math.round(survivalRate)
      };
      totalPop += b.popWeight;
    });

    // convert population weights to a 0-100 frequency distribution
    var pickSum = 0;
    routes.forEach(function (r) {
      r.pickRaw = (r.popWeight / totalPop) * 100 * (0.6 + r.compatibility / 160);
      pickSum += r.pickRaw;
    });
    routes.forEach(function (r) {
      r.pickFreq = U.round((r.pickRaw / pickSum) * 100, 1);
    });

    // drop helper weight
    routes.forEach(function (r) { delete r.popWeight; delete r.pickRaw; });

    var safest = routes.reduce(function (a, b) { return b.survivalRate > a.survivalRate ? b : a; }, routes[0]);
    var deadliest = routes.reduce(function (a, b) { return b.collapseIndex > a.collapseIndex ? b : a; }, routes[0]);
    routes.forEach(function (r) {
      r.isSafest = safest && r.id === safest.id;
      r.isDeadliest = deadliest && r.id === deadliest.id;
    });

    return routes;
  }

  function survivalModifier(route) {
    if (!route) return 0;
    return (route.survivalRate - 50) * 0.18;
  }

  function find(routes, id) {
    for (var i = 0; i < routes.length; i++) if (routes[i].id === id) return routes[i];
    return null;
  }

  WF.routes = {
    generate: generate,
    recalc: recalc,
    survivalModifier: survivalModifier,
    find: find
  };
})(window.WF = window.WF || {});
