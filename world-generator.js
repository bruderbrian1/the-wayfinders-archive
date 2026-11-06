/* =====================================================================
   engine/world-generator.js — expedition construction
   Deterministic, seed-driven. Every call yields a full world state.
   Exposes: WF.world
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  /* Hazard pairs that must never co-occur: they cancel or contradict. */
  var EXCLUSIONS = [
    ['Glass Heatwave', 'Flood Surge'],
    ['Flood Surge', 'Ashfall'],
    ['Vacuum Reversal', 'Tidal Surge'],
    ['Meteor Storm', 'Dense Canopy'],
    ['Spore Bloom', 'Absolute Zero Drift'],
    ['Blood Moon', 'Eternal Noon']
  ];

  function incompatible(a, b) {
    if (!a || !b) return true;
    if (a.name === b.name) return true;
    for (var i = 0; i < EXCLUSIONS.length; i++) {
      var p = EXCLUSIONS[i];
      if ((p[0] === a.name && p[1] === b.name) || (p[1] === a.name && p[0] === b.name)) return true;
    }
    return false;
  }

  function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] != null ? vars[k] : m;
    });
  }

  function generateName(rng, world) {
    var parts = world.nameParts;
    var pattern = rng.pick(D.EXPEDITION_PATTERNS);
    var word = rng.pick(D.WORLD_WORDS[world.id]);
    return fill(pattern, {
      adj: rng.pick(D.EXPEDITION_ADJ),
      noun: rng.pick(D.EXPEDITION_NOUN),
      worldWord: word,
      place: rng.pick(parts.place),
      world: world.name
    }).replace(/\s+/g, ' ').trim();
  }

  function generateSector(rng, world) {
    var letter = rng.pick(D.SECTOR_LETTERS);
    var num = U.pad(rng.int(1, 99), 2);
    var sub = U.roman(rng.int(1, 24));
    return {
      label: 'SECTOR ' + letter + '-' + num + ' / ' + sub,
      coords: {
        x: U.round(rng.float(-180, 180), 2),
        y: U.round(rng.float(-90, 90), 2),
        z: U.round(rng.float(0, 12), 2)
      },
      depth: U.round(rng.float(0.4, 9.6), 2)
    };
  }

  function pickHazards(rng, world, difficultyBias) {
    var pool = world.hazards.slice();
    var first = rng.pick(pool);
    var second = null;
    var guard = 0;
    while (guard++ < 30) {
      var c = rng.pick(pool);
      if (!incompatible(first, c)) { second = c; break; }
    }
    if (!second) second = pool.filter(function (h) { return h.name !== first.name; })[0] || first;

    // severity is the world's signature value, adjusted by the sector's temperament
    function sev(h) {
      return U.clamp(Math.round(h.severity + rng.int(-8, 9) + difficultyBias), 30, 99);
    }
    return {
      primary: { name: first.name, severity: sev(first), resistance: first.resistance, desc: first.desc },
      secondary: { name: second.name, severity: sev(second), resistance: second.resistance, desc: second.desc }
    };
  }

  function bandFor(score) {
    for (var i = 0; i < D.DIFFICULTY_BANDS.length; i++) {
      var b = D.DIFFICULTY_BANDS[i];
      if (score < b.max) return b;
    }
    return D.DIFFICULTY_BANDS[D.DIFFICULTY_BANDS.length - 1];
  }

  /**
   * Generate a complete expedition.
   * @param {object} opts { seed, number, worldId (optional force) }
   */
  function generate(opts) {
    opts = opts || {};
    var seed = opts.seed != null ? opts.seed : (Math.random() * 0xFFFFFFFF) >>> 0;
    var rng = new U.RNG(seed);

    var pool = D.availableWorlds ? D.availableWorlds(opts.unlockedWorldIds) : D.WORLDS;
    // always consume the world roll so forcing a world does not shift the seed stream
    var rolled = rng.pick(pool);
    var world = opts.worldId ? D.WORLD_BY_ID[opts.worldId] : rolled;
    if (!world) world = rolled || rng.pick(pool);

    var difficultyBias = rng.int(-6, 8);
    var hazards = pickHazards(rng, world, difficultyBias);

    var perkPool = rng.shuffle(world.perks);
    var penPool = rng.shuffle(world.penalties);
    var perks = perkPool.slice(0, rng.int(1, 2));
    var penalties = penPool.slice(0, rng.int(1, 2));

    var objectives = rng.sample(world.objectives, 3);
    var sector = generateSector(rng, world);

    var conditions = rng.sample(world.conditions, 3);
    var faction = rng.pick(world.factions);

    var resourceIds = rng.sample(world.resources, Math.min(4, world.resources.length));
    var resources = resourceIds.map(function (id) {
      var r = D.RESOURCE_BY_ID[id];
      return {
        id: id,
        name: r.name,
        yieldMin: rng.int(1, 4),
        yieldMax: rng.int(6, 15),
        availability: rng.int(35, 95)
      };
    });

    var enemyPool = rng.sample(world.enemies, Math.min(4, world.enemies.length));

    var severityAvg = hazards.primary.severity * 0.62 + hazards.secondary.severity * 0.38;
    var difficultyScore = U.clamp(severityAvg * 0.78 + rng.int(-5, 5), 28, 96);
    var band = bandFor(difficultyScore);

    var perkSurvival = perks.reduce(function (s, p) { return s + p.survival; }, 0);
    var penSurvival = penalties.reduce(function (s, p) { return s + p.survival; }, 0);

    var baseSurvival = U.clamp(
      98 - difficultyScore * 0.74 + perkSurvival + penSurvival + rng.int(-2, 2),
      16, 88
    );

    var vars = {
      sector: sector.label, condition: conditions[0],
      hazard: hazards.primary.name, hazard2: hazards.secondary.name,
      world: world.name, faction: faction, num: U.pad(opts.number || 1, 3),
      deg: rng.int(6, 42), survival: U.round(baseSurvival, 0)
    };

    var exp = {
      id: 'exp_' + U.pad(opts.number || 1, 3) + '_' + seed.toString(36),
      number: opts.number || 1,
      seed: seed,
      seedLabel: '0x' + ('00000000' + seed.toString(16).toUpperCase()).slice(-8),
      name: generateName(rng, world),
      worldId: world.id,
      worldName: world.name,
      classification: world.classification,
      tagline: world.tagline,
      worldDescription: world.description,
      glyph: world.glyph,
      palette: world.palette,
      sector: sector.label,
      placeName: rng.pick(world.nameParts.place),
      coords: sector.coords,
      depth: sector.depth,
      conditions: conditions,
      primaryHazard: hazards.primary,
      secondaryHazard: hazards.secondary,
      faction: faction,
      resources: resources,
      perks: perks,
      penalties: penalties,
      objectives: objectives,
      difficulty: {
        score: Math.round(difficultyScore),
        band: band.key,
        label: band.label
      },
      survivalBase: Math.round(baseSurvival),
      anomalyLevel: Math.round(U.clamp(difficultyScore * 0.6 + rng.int(-8, 8), 10, 99)),
      temporalStability: Math.round(U.clamp(100 - hazards.primary.severity * 0.55 + rng.int(-6, 10), 20, 97)),
      integrity: U.clamp(Math.round(88 + rng.int(-8, 6)), 55, 100),
      enemyPool: enemyPool,
      narrative: fill(rng.pick(D.LORE.intro), vars),
      createdAt: Date.now()
    };

    return exp;
  }

  /* ---------- procedural relic discovery ---------- */
  var RELIC_PREFIX = ['Weeping', 'Folded', 'Star-Bitten', 'Salt-Glass', 'Nine-Loop', 'Ash-Sealed', 'Tidal', 'Recursive', 'Bone-Lit', 'Vacuum-Spun', 'Gilded', 'Static'];
  var RELIC_NOUN = ['Sextant', 'Reliquary', 'Anchor', 'Splinter', 'Cantor', 'Loom', 'Dial', 'Casket', 'Resonator', 'Ledger', 'Lens', 'Sigil'];
  var RELIC_CLASSES = ['Temporal Instrument', 'Anomalous Relic', 'Pre-Collapse Device', 'Cursed Object', 'Bio-Tech Relic', 'Navigation Artifact'];

  /**
   * Build a procedurally discovered relic for the current expedition.
   * The item is fully renderable and equippable.
   */
  function generateRelic(exp, roll) {
    var rng = new U.RNG((exp.seed ^ 0x9E3779B9) + Math.floor((roll || 0) * 7919));
    var rarity = rng.weighted([
      ['common', 20], ['uncommon', 32], ['rare', 27], ['epic', 16], ['legendary', 5]
    ]);
    var mult = D.RARITY[rarity].mult;
    var world = D.WORLD_BY_ID[exp.worldId];
    var resKey = exp.primaryHazard.resistance;

    var bonuses = { navSkill: Math.round(rng.int(3, 7) * mult) };
    if (resKey && resKey !== 'combatPower' && resKey !== 'armor' && resKey !== 'energy') {
      bonuses[resKey] = Math.round(rng.int(4, 9) * mult);
    } else {
      bonuses.spatialRes = Math.round(rng.int(3, 8) * mult);
    }
    if (rng.chance(0.6)) bonuses.combatPower = Math.round(rng.int(3, 8) * mult);
    if (rng.chance(0.4)) bonuses.energy = -Math.round(rng.int(2, 6));

    var name = 'The ' + rng.pick(RELIC_PREFIX) + ' ' + rng.pick(RELIC_NOUN);
    var abilityNames = ['RESONANT PING', 'STABILISE', 'ECHO STEP', 'DEAD RECKONING', 'SALT WARD', 'NULL SHELTER'];

    return {
      id: 'px-' + exp.seed.toString(36) + '-' + Math.floor((roll || 0) * 7919),
      name: name,
      category: 'relic',
      rarity: rarity,
      level: Math.max(1, exp.number + rng.int(1, 8)),
      classification: rng.pick(RELIC_CLASSES),
      lore: 'Pulled from a debris pocket in ' + exp.sector + '. The object predates the local collapse by an unknown margin and responds to ' + exp.primaryHazard.name.toLowerCase() + ' with a sound like a held breath.',
      discovery: exp.sector + ', ' + exp.worldName,
      bonuses: bonuses,
      ability: {
        name: rng.pick(abilityNames),
        text: 'Grants ' + U.signed(bonuses.navSkill) + ' navigation and reduces the severity of ' + exp.primaryHazard.name + ' by a further margin.'
      },
      compat: [exp.worldId, world.id],
      extraSpecs: [['Provenance', 'Unverified'], ['Residue', exp.primaryHazard.name], ['Age', rng.int(400, 4000) + ' years']],
      weight: U.round(rng.float(0.3, 2.4), 1),
      value: Math.round(180 * mult + rng.int(0, 200)),
      procedural: true,
      quantity: 1
    };
  }

  /* ---------- procedural supplies / materials ---------- */
  function generateSupply(exp) {
    var rng = new U.RNG(exp.seed ^ 0x51ED270B);
    var kinds = [
      { id: 'exp-kit', name: 'Expedition Patch Kit', desc: 'Restores 18 health and 10 stamina.', category: 'supply' },
      { id: 'exp-cells', name: 'Salvaged Cell Pack', desc: 'Restores 22 energy.', category: 'supply' },
      { id: 'exp-filter', name: 'Improvised Filter', desc: 'Removes one environmental penalty.', category: 'supply' },
      { id: 'exp-scrap', name: 'Bundled Scrap', desc: 'Crafting feedstock recovered on-site.', category: 'material' }
    ];
    var k = rng.pick(kinds);
    var rarity = rng.weighted([['common', 50], ['uncommon', 34], ['rare', 16]]);
    return {
      id: 'gen-' + exp.seed.toString(36) + '-' + k.id,
      name: k.name + ' / ' + exp.sector.split(' ')[1],
      category: k.category,
      rarity: rarity,
      level: Math.max(1, exp.number),
      classification: k.category === 'supply' ? 'Field Consumable' : 'Field Material',
      lore: 'Assembled from what the sector was willing to give up. ' + k.desc,
      discovery: exp.sector + ', ' + exp.worldName,
      bonuses: {},
      ability: { name: 'FIELD USE', text: k.desc },
      compat: [exp.worldId],
      extraSpecs: [['Origin', 'Procedural'], ['Batch', exp.seedLabel]],
      weight: 0.4, value: 60, procedural: true, quantity: 1, stackable: true
    };
  }

  WF.world = {
    generate: generate,
    generateRelic: generateRelic,
    generateSupply: generateSupply,
    incompatible: incompatible,
    fill: fill
  };
})(window.WF = window.WF || {});
