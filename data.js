/* =====================================================================
   core/data.js — static universe tables
   Worlds, hazards, factions, creatures, resources, items, companions.
   Exposes: window.WF.data
   ===================================================================== */
(function (WF) {
  'use strict';

  /* ------------------------------------------------------------------
     1. RESOURCES
     ------------------------------------------------------------------ */
  var RESOURCES = [
    { id: 'scrapMetal', name: 'Scrap Metal', unit: 'kg', weight: 1.2, glyph: 'scrap', value: 3, desc: 'Hull plate, rebar and salvaged alloy. The backbone of every field repair.' },
    { id: 'ancientCircuits', name: 'Ancient Circuits', unit: 'unit', weight: 0.4, glyph: 'circuit', value: 9, desc: 'Pre-collapse logic wafers that still hold a charge and a grudge.' },
    { id: 'quantumCrystals', name: 'Quantum Crystals', unit: 'shard', weight: 0.7, glyph: 'crystal', value: 14, desc: 'Crystalline probability sinks. They hum when reality is about to fold.' },
    { id: 'voidEssence', name: 'Void Essence', unit: 'vial', weight: 0.2, glyph: 'void', value: 18, desc: 'Bottled absence. Handle with insulated gloves and no small talk.' },
    { id: 'medicalSupplies', name: 'Medical Supplies', unit: 'kit', weight: 0.8, glyph: 'medical', value: 7, desc: 'Coagulant foam, antibiotics, and one precious dose of neural stabiliser.' },
    { id: 'energyCells', name: 'Energy Cells', unit: 'cell', weight: 1.0, glyph: 'energy', value: 6, desc: 'Standardised power cores. Feed the overclock, feed the compass, feed hope.' },
    { id: 'foodRations', name: 'Food Rations', unit: 'pack', weight: 0.9, glyph: 'food', value: 4, desc: 'Vacuum-sealed nutrient bricks. Taste is a pre-collapse luxury.' },
    { id: 'relicFragments', name: 'Relic Fragments', unit: 'frag', weight: 0.3, glyph: 'relic', value: 11, desc: 'Shards of objects that reality still remembers being important.' }
  ];

  var RESOURCE_BY_ID = {};
  RESOURCES.forEach(function (r) { RESOURCE_BY_ID[r.id] = r; });

  /* ------------------------------------------------------------------
     2. RARITY
     ------------------------------------------------------------------ */
  var RARITY = {
    common: { key: 'common', label: 'Common', weight: 42, mult: 1.0, color: '#8a97a3' },
    uncommon: { key: 'uncommon', label: 'Uncommon', weight: 27, mult: 1.25, color: '#55e39a' },
    rare: { key: 'rare', label: 'Rare', weight: 18, mult: 1.55, color: '#56c8ff' },
    epic: { key: 'epic', label: 'Epic', weight: 9.5, mult: 1.9, color: '#b98bff' },
    legendary: { key: 'legendary', label: 'Legendary', weight: 3.5, mult: 2.4, color: '#e8b45a' }
  };

  var CATEGORIES = [
    { id: 'route', label: 'Routes', plural: 'Routes', slot: 'route' },
    { id: 'relic', label: 'Relics', plural: 'Relics', slot: 'relic' },
    { id: 'weapon', label: 'Weapons', plural: 'Weapons', slot: 'weapon' },
    { id: 'armor', label: 'Armor', plural: 'Armor', slot: 'armor' },
    { id: 'companion', label: 'Companion AI', plural: 'Companion AI', slot: 'companion' },
    { id: 'supply', label: 'Survival Supplies', plural: 'Survival Supplies', slot: null },
    { id: 'material', label: 'Crafting Materials', plural: 'Crafting Materials', slot: null },
    { id: 'artifact', label: 'Ancient Artifacts', plural: 'Ancient Artifacts', slot: 'artifact' }
  ];
  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c) { CATEGORY_BY_ID[c.id] = c; });

  /* ------------------------------------------------------------------
     3. WORLD TYPES
     ------------------------------------------------------------------ */
  var WORLDS = [
    {
      id: 'cosmic-void',
      name: 'Cosmic Void',
      classification: 'Class Ω — Vacuum Anomaly',
      tagline: 'Where stars died screaming and gravity learned to lie.',
      description: 'Shattered star systems drift through a black that has weight. Collapsing planets trail molten entrails across the dark, and meteor storms move with intent. Gravity here is a negotiation, not a law.',
      glyph: 'void',
      palette: { a: '#a98bff', b: '#3ff0d0', c: '#f0e6ff' },
      hazards: [
        { name: 'Gravitational Shear', severity: 82, resistance: 'spatialRes', desc: 'Differential gravity fields pull a body in four directions at once.' },
        { name: 'Meteor Storm', severity: 74, resistance: 'armor', desc: 'Hypervelocity debris scours everything above the third regolith layer.' },
        { name: 'Radiation Bloom', severity: 68, resistance: 'radiationRes', desc: 'Dying cores exhale hard radiation in slow, luminous waves.' },
        { name: 'Singularity Drift', severity: 88, resistance: 'temporalRes', desc: 'A micro-singularity wanders the sector, eating the map as it goes.' },
        { name: 'Vacuum Reversal', severity: 79, resistance: 'spatialRes', desc: 'Sections of space briefly forget to be space. Do not be inside them.' },
        { name: 'Ionized Dust Front', severity: 58, resistance: 'radiationRes', desc: 'Charged dust blinds sensors and dissolves unshielded seals.' }
      ],
      conditions: ['Absolute zero drift', 'Hard-vacuum exposure', 'Ion storm interference', 'Micrometeorite saturation', 'Stellar debris field', 'Eclipse dark', 'Gravitational lensing', 'Nebular static'],
      factions: ['The Hollow Choir', 'Null Pilgrims', 'Starfall Reclaimers', 'The Vacuum Wraiths', 'The Last Observatory'],
      perks: [
        { name: 'Zero-G Reflexes', survival: 4, desc: 'Movement in freefall costs less stamina and reads as predatory grace.' },
        { name: 'Star-Chart Resonance', survival: 5, desc: 'Pre-collapse star maps still resolve correctly against the ruined sky.' },
        { name: 'Vacuum-Sealed Lungs', survival: 3, desc: 'A stolen rebreather graft keeps you conscious for four extra minutes.' }
      ],
      penalties: [
        { name: 'Unstable Gravity', survival: -6, desc: 'Every step is a guess about which way down is.' },
        { name: 'Oxygen Debt', survival: -5, desc: 'Air is a consumable, and the meter is running.' },
        { name: 'Cosmic Dread', survival: -4, desc: 'The dark is not empty. It is patient.' }
      ],
      objectives: [
        { text: 'Chart the debris field around {place}', tag: 'Cartography' },
        { text: 'Recover a black-box beacon from {place}', tag: 'Recovery' },
        { text: 'Survive one full gravitational cycle at {place}', tag: 'Endurance' },
        { text: 'Decode the star-song recorded at {place}', tag: 'Research' },
        { text: 'Plant a stabiliser anchor on the drift edge of {place}', tag: 'Engineering' }
      ],
      resources: ['quantumCrystals', 'voidEssence', 'ancientCircuits', 'energyCells'],
      nameParts: {
        adj: ['Collapsing', 'Eclipsed', 'Starless', 'Null', 'Shattered', 'Luminous', 'Unlit', 'Gravid'],
        noun: ['Requiem', 'Aperture', 'Orbit', 'Vigil', 'Tomb', 'Beacon', 'Drift', 'Silence'],
        place: ['Sector 09', 'the Kepler Shelf', 'the Deadlight Reach', 'the Ninth Orbit', 'the Ash Nebula']
      },
      enemies: [
        { name: 'Gravity Wraith', class: 'Vacuum Entity', tier: 3, health: 120, attack: 26, penetration: 42, adaptation: 30, ability: { name: 'Mass Crush', text: 'Collapses local gravity around a single target.' }, loot: ['voidEssence', 'quantumCrystals'] },
        { name: 'Shard Golem', class: 'Planetary Remnant', tier: 2, health: 175, attack: 20, penetration: 28, adaptation: 55, ability: { name: 'Lithic Barrage', text: 'Flings splintered planet-crust at range.' }, loot: ['scrapMetal', 'quantumCrystals'] },
        { name: 'Null Seraph', class: 'Unmade Intelligence', tier: 4, health: 145, attack: 34, penetration: 60, adaptation: 40, ability: { name: 'Silence Field', text: 'Suppresses equipment abilities for three rounds.' }, loot: ['voidEssence', 'ancientCircuits'] },
        { name: 'Asteroid Mimic', class: 'Predatory Geology', tier: 2, health: 100, attack: 24, penetration: 34, adaptation: 70, ability: { name: 'False Positive', text: 'Registers as safe terrain until it opens.' }, loot: ['scrapMetal', 'energyCells'] },
        { name: 'Collapsed Star', class: 'Stellar Corpse', tier: 5, health: 260, attack: 41, penetration: 72, adaptation: 18, ability: { name: 'Final Flare', text: 'Detonates a wave of hard radiation.' }, loot: ['quantumCrystals', 'voidEssence'] }
      ],
      loreIntro: [
        'The Cartographer arrives on the far side of a dead sun, where the light has not yet been told that it should stop.',
        'No ground. No horizon. Only the slow rotation of a broken world and the certainty that something out here remembers your name.',
        'The archive flags this sector as "provisionally real". The provision expired four hundred years ago.'
      ],
      routeWords: ['Drift Lane', 'Debris Corridor', 'Gravity Well', 'Null Passage', 'Orbit Trace', 'Dark Current']
    },
    {
      id: 'sunken-cyber-grid',
      name: 'Sunken Cyber-Grid',
      classification: 'Class Δ — Submerged Datascape',
      tagline: 'The city still runs. It just runs underwater now.',
      description: 'Digital cities drowned under black water continue to execute their last instructions. Data vaults glow beneath the silt, rogue AI tenants refuse eviction, and every drop carries a memory-wiping payload.',
      glyph: 'grid',
      palette: { a: '#56c8ff', b: '#3ff0d0', c: '#b7f0ff' },
      hazards: [
        { name: 'Flood Surge', severity: 72, resistance: 'spatialRes', desc: 'Pressure doors fail in sequence. The corridor fills in nine seconds.' },
        { name: 'Digital Corruption', severity: 78, resistance: 'temporalRes', desc: 'Local physics runs on corrupted code. Edges stop matching.' },
        { name: 'Memory-Wipe Protocol', severity: 85, resistance: 'temporalRes', desc: 'An automated loop erases the last six hours of navigational memory.' },
        { name: 'Razor Current', severity: 66, resistance: 'armor', desc: 'Fast water threaded with monofilament cable.' },
        { name: 'Pressure Collapse', severity: 81, resistance: 'armor', desc: 'The ceiling has been holding for a thousand years. It is tired.' },
        { name: 'Rogue Daemon Bloom', severity: 75, resistance: 'radiationRes', desc: 'Hijacked maintenance daemons spawn from the server silt.' }
      ],
      conditions: ['Total submersion', 'Bioluminescent silt', 'Zero visibility', 'Pressure 4.2 atm', 'Residual current', 'Server heat bloom', 'Static discharge', 'Oil-slick surface'],
      factions: ['The Submerged Directorate', 'Hex-Kin Reclaimers', 'Nine-Loop Syndicate', 'The Drowned Custodians'],
      perks: [
        { name: 'Hydrostatic Plating', survival: 4, desc: 'Your suit equalises pressure without complaint.' },
        { name: 'Cipher Affinity', survival: 5, desc: 'Pre-collapse encryption opens for you like an old friend.' },
        { name: 'Data-Tap Reflex', survival: 3, desc: 'You can pull a route map out of a dead terminal in under a minute.' }
      ],
      penalties: [
        { name: 'Memory Bleed', survival: -6, desc: 'You keep losing the same fourteen minutes.' },
        { name: 'Short-Circuit Risk', survival: -4, desc: 'Every device you carry is one splash from decorative.' },
        { name: 'Pressure Fatigue', survival: -5, desc: 'The body was not designed for this much water on top of it.' }
      ],
      objectives: [
        { text: 'Recover the vault index from {place}', tag: 'Recovery' },
        { text: 'Trace the memory-wipe signal to its source at {place}', tag: 'Investigation' },
        { text: 'Restore power to the drowned archive beneath {place}', tag: 'Engineering' },
        { text: 'Extract a living daemon from {place}', tag: 'Capture' },
        { text: 'Map the flooded transit spine of {place}', tag: 'Cartography' }
      ],
      resources: ['ancientCircuits', 'energyCells', 'medicalSupplies', 'relicFragments'],
      nameParts: {
        adj: ['Drowned', 'Submerged', 'Corrupted', 'Brine-Lit', 'Static', 'Silt-Choked', 'Hollow', 'Nine-Loop'],
        noun: ['Archive', 'Grid', 'Vault', 'Spine', 'Cathedral', 'Exchange', 'Lattice', 'Undertow'],
        place: ['Sector 09', 'the Western Data Vault', 'the Ninth Server Sea', 'the Hex Basin', 'the Drowned Exchange']
      },
      enemies: [
        { name: 'Drowned Sentinel', class: 'Automated Defence', tier: 2, health: 140, attack: 22, penetration: 38, adaptation: 60, ability: { name: 'Pressure Lock', text: 'Seals the corridor and vents the room.' }, loot: ['ancientCircuits', 'energyCells'] },
        { name: 'Memory Leech', class: 'Data Parasite', tier: 3, health: 90, attack: 28, penetration: 55, adaptation: 35, ability: { name: 'Recall Theft', text: 'Steals a navigation skill point for the encounter.' }, loot: ['relicFragments', 'medicalSupplies'] },
        { name: 'Rogue Logic Daemon', class: 'Autonomous Process', tier: 4, health: 160, attack: 31, penetration: 66, adaptation: 50, ability: { name: 'Instruction Rewrite', text: 'Turns the environment against its user.' }, loot: ['ancientCircuits', 'quantumCrystals'] },
        { name: 'Nano-Tide Swarm', class: 'Micro-Swarm', tier: 3, health: 110, attack: 25, penetration: 70, adaptation: 80, ability: { name: 'Dissolve', text: 'Consumes armour plating for fuel.' }, loot: ['scrapMetal', 'medicalSupplies'] },
        { name: 'Corrupted Custodian', class: 'Failed Caretaker', tier: 5, health: 250, attack: 39, penetration: 58, adaptation: 45, ability: { name: 'Containment Protocol', text: 'Attempts to archive the target permanently.' }, loot: ['ancientCircuits', 'voidEssence'] }
      ],
      loreIntro: [
        'The lift opens onto a street that has been under water since before the collapse. The streetlights are still on.',
        'Somewhere below, a city executes a backup routine it began eight hundred years ago and has never finished.',
        'The Cartographer descends through green-black water. The archive politely notes that this sector is also listed as a cemetery.'
      ],
      routeWords: ['Flood Channel', 'Server Trench', 'Vault Corridor', 'Silt Run', 'Pressure Line', 'Undertow Path']
    },
    {
      id: 'ashen-kingdoms',
      name: 'Ashen Kingdoms',
      classification: 'Class Ψ — Cursed Successor States',
      tagline: 'The crowns fell. The kings did not.',
      description: 'Ruined medieval civilizations smoulder under a permanent grey snowfall. Cursed forests root in the ashes of cathedrals, undead armies hold forgotten passes, and the fortresses are still occupied by things that remember being royal.',
      glyph: 'ash',
      palette: { a: '#d8a85a', b: '#ff5f6d', c: '#efe4cf' },
      hazards: [
        { name: 'Curse Miasma', severity: 76, resistance: 'temporalRes', desc: 'A low fog that teaches the lungs to forget breathing.' },
        { name: 'Undead Tide', severity: 80, resistance: 'combatPower', desc: 'The levies of a dead kingdom still answer the muster.' },
        { name: 'Ashfall', severity: 62, resistance: 'radiationRes', desc: 'Warm grey snow that buries roads and marks the living.' },
        { name: 'Blackroot Blight', severity: 70, resistance: 'radiationRes', desc: 'Trees that drink blood and grow toward the sound of breathing.' },
        { name: 'Wailing Gale', severity: 67, resistance: 'spatialRes', desc: 'Wind carrying the voices of everyone the kingdom failed.' },
        { name: 'Blood Moon', severity: 84, resistance: 'temporalRes', desc: 'Under the red moon, the dead keep their old authority.' }
      ],
      conditions: ['Permanent ashfall', 'Cursed ground', 'Blood-moon rising', 'Cold iron air', 'Grave-fog', 'Blackroot canopy', 'Silent bells', 'Ember wind'],
      factions: ['The Pale Court', 'Blackroot Covenant', 'The Ash Legion', 'Cinder Wardens'],
      perks: [
        { name: 'Ward Sigils', survival: 5, desc: 'Old protective marks still hold against old things.' },
        { name: 'Pyre Tolerance', survival: 3, desc: 'You have inhaled more smoke than most people have air.' },
        { name: 'Ancestral Favour', survival: 4, desc: 'Something in the ash remembers a debt to your line.' }
      ],
      penalties: [
        { name: 'Curse Accumulation', survival: -6, desc: 'Every relic you touch adds a name to a ledger.' },
        { name: 'Morale Collapse', survival: -4, desc: 'The wailing is worse when it uses your voice.' },
        { name: 'Cold Iron Aversion', survival: -3, desc: 'Your gear was not forged for a world that hates metal.' }
      ],
      objectives: [
        { text: 'Break the ward-seal on the keep at {place}', tag: 'Ritual' },
        { text: 'Recover the crown-ledger from {place}', tag: 'Recovery' },
        { text: 'Survive a night in the blackroot of {place}', tag: 'Endurance' },
        { text: 'Put an end to the standard-bearer of {place}', tag: 'Combat' },
        { text: 'Map the catacombs beneath {place}', tag: 'Cartography' }
      ],
      resources: ['foodRations', 'medicalSupplies', 'relicFragments', 'scrapMetal'],
      nameParts: {
        adj: ['Ashen', 'Pale', 'Cursed', 'Blackroot', 'Ember', 'Blood-Moon', 'Forgotten', 'Sorrowful'],
        noun: ['Keep', 'Crown', 'Barrow', 'Cathedral', 'March', 'Throne', 'Vigil', 'Muster'],
        place: ['the Grey Marches', 'the Blackroot Wood', 'the Pale Court', 'the Cinder Pass', 'the Ninth Barrow']
      },
      enemies: [
        { name: 'Hollow Knight', class: 'Undead Retinue', tier: 3, health: 165, attack: 27, penetration: 45, adaptation: 40, ability: { name: 'Oathbound Strike', text: 'Ignores armour once per encounter.' }, loot: ['scrapMetal', 'relicFragments'] },
        { name: 'Wailing Banshee', class: 'Grief Manifest', tier: 3, health: 95, attack: 30, penetration: 62, adaptation: 55, ability: { name: 'Death Knell', text: 'Drains stamina and morale in equal measure.' }, loot: ['relicFragments', 'medicalSupplies'] },
        { name: 'Blackroot Hound', class: 'Blighted Beast', tier: 2, health: 115, attack: 24, penetration: 36, adaptation: 70, ability: { name: 'Bloodscent', text: 'Cannot lose a wounded target.' }, loot: ['foodRations', 'relicFragments'] },
        { name: 'Ash Revenant', class: 'Burning Dead', tier: 4, health: 180, attack: 33, penetration: 54, adaptation: 35, ability: { name: 'Pyre Burst', text: 'Ignites the air around itself.' }, loot: ['scrapMetal', 'foodRations'] },
        { name: 'Cursed Standard-Bearer', class: 'Command Remnant', tier: 5, health: 240, attack: 37, penetration: 60, adaptation: 50, ability: { name: 'Rally the Fallen', text: 'Raises two additional undead each round.' }, loot: ['relicFragments', 'medicalSupplies'] }
      ],
      loreIntro: [
        'Ash falls like grey snow on a kingdom that has been ending for six hundred years.',
        'The bells of the Pale Court still ring the hours. Nobody has wound them since the collapse.',
        'The Cartographer crosses a field of frozen banners. Beneath each one, something shifts.'
      ],
      routeWords: ['Barrow Road', 'Ash Pass', 'Blackroot Trail', 'Kingsway', 'Catacomb Run', 'Pilgrim Cut']
    },
    {
      id: 'forgotten-wastes',
      name: 'The Forgotten Wastes',
      classification: 'Class Ξ — Irradiated Expanse',
      tagline: 'The map ends here. The sand does not.',
      description: 'Radioactive deserts swallow whole civilizations. Scavenger clans run the salt roads, glass heatwaves bend the horizon into a second sun, and somewhere under the dunes a buried nation still dreams in concrete.',
      glyph: 'waste',
      palette: { a: '#ffb347', b: '#d8a85a', c: '#ffe9c4' },
      hazards: [
        { name: 'Radiation Storm', severity: 82, resistance: 'radiationRes', desc: 'Wind-borne isotopes strip the paint and then the skin.' },
        { name: 'Glass Heatwave', severity: 75, resistance: 'energy', desc: 'Temperatures that turn sand to sheet glass by noon.' },
        { name: 'Sandstorm Quake', severity: 70, resistance: 'spatialRes', desc: 'A wall of sand moving faster than a horse.' },
        { name: 'Rust Plague', severity: 66, resistance: 'armor', desc: 'Airborne corrosion that eats metal and then lungs.' },
        { name: 'Sinkhole Fields', severity: 73, resistance: 'spatialRes', desc: 'The ground is a suggestion maintained by luck.' },
        { name: 'Scavenger Ambush', severity: 77, resistance: 'combatPower', desc: 'The clans saw your dust plume two days ago.' }
      ],
      conditions: ['Extreme heat', 'Zero cloud cover', 'Isotope haze', 'Salt flat glare', 'Dry electrical storm', 'Glass horizon', 'Cold desert night', 'Dust static'],
      factions: ['The Rustborn Clans', 'Salt Dukes', 'The Long Walkers', 'Carrion Court'],
      perks: [
        { name: 'Desert Hardiness', survival: 5, desc: 'You can walk a day on a mouthful of water.' },
        { name: 'Scrap Affinity', survival: 3, desc: 'Nothing is broken. It is simply not yet a tool.' },
        { name: 'Heat-Shimmer Camouflage', survival: 4, desc: 'At distance, you look like a trick of the light.' }
      ],
      penalties: [
        { name: 'Radiation Sickness', survival: -6, desc: 'Your dosimeter is a click away from a funeral.' },
        { name: 'Heat Exhaustion', survival: -5, desc: 'Stamina drains even when standing still.' },
        { name: 'Water Debt', survival: -4, desc: 'Every litre is borrowed at ruinous interest.' }
      ],
      objectives: [
        { text: 'Locate the buried entrance beneath {place}', tag: 'Excavation' },
        { text: 'Trade with the clan enclave at {place}', tag: 'Diplomacy' },
        { text: 'Recover the pre-collapse reactor map from {place}', tag: 'Recovery' },
        { text: 'Cross the salt flats of {place} before nightfall', tag: 'Endurance' },
        { text: 'Silence the glass prophet of {place}', tag: 'Combat' }
      ],
      resources: ['scrapMetal', 'foodRations', 'energyCells', 'medicalSupplies'],
      nameParts: {
        adj: ['Forgotten', 'Glass', 'Rustborn', 'Sun-Bleached', 'Salt', 'Buried', 'Radiant', 'Long-Walked'],
        noun: ['Expanse', 'Flats', 'Reach', 'Dunes', 'Wreck', 'Basin', 'Road', 'Horizon'],
        place: ['the Salt Flats', 'the Rustbelt', 'the Ninth Dune', 'the Glass Basin', 'the Long Road']
      },
      enemies: [
        { name: 'Rad Scavenger', class: 'Clan Raider', tier: 2, health: 105, attack: 23, penetration: 40, adaptation: 55, ability: { name: 'Dirty Shot', text: 'Rounds carry isotope dust into the wound.' }, loot: ['scrapMetal', 'foodRations'] },
        { name: 'Salt Raider', class: 'Mounted Marauder', tier: 3, health: 130, attack: 28, penetration: 44, adaptation: 60, ability: { name: 'Running Cut', text: 'Strikes and withdraws in the same motion.' }, loot: ['foodRations', 'medicalSupplies'] },
        { name: 'Rust Hound', class: 'Feral Machine', tier: 2, health: 120, attack: 21, penetration: 52, adaptation: 68, ability: { name: 'Tetanus Bite', text: 'Corrodes armour with every successful hit.' }, loot: ['scrapMetal', 'energyCells'] },
        { name: 'Dune Leviathan', class: 'Apex Burrower', tier: 5, health: 280, attack: 38, penetration: 65, adaptation: 45, ability: { name: 'Sand Swallow', text: 'Drags its target beneath the dunes.' }, loot: ['scrapMetal', 'quantumCrystals'] },
        { name: 'Glass Prophet', class: 'Mutant Oracle', tier: 4, health: 150, attack: 32, penetration: 58, adaptation: 50, ability: { name: 'Truth Burn', text: 'Speaks a future in which you lose.' }, loot: ['relicFragments', 'voidEssence'] }
      ],
      loreIntro: [
        'The horizon is a mirror. The Cartographer has been walking toward it for three days and it has not moved.',
        'Wind erases the tracks behind you with the patience of something that has all the time in the world.',
        'Somewhere under the salt is a city with a name. The archive lists it as a rumour with coordinates.'
      ],
      routeWords: ['Salt Road', 'Dune Trace', 'Rust Corridor', 'Glass Cut', 'Scavenger Line', 'Dry River']
    },
    {
      id: 'hollow-dimension',
      name: 'The Hollow Dimension',
      classification: 'Class Φ — Fractured Continuum',
      tagline: 'You have been here before. You have not been here yet.',
      description: 'Reality is a torn page. Temporal fractures repeat the same eleven seconds, portals open onto rooms that do not exist, and the creatures here are made of the parts of people who took a wrong turn.',
      glyph: 'hollow',
      palette: { a: '#a98bff', b: '#3ff0d0', c: '#e3dbff' },
      hazards: [
        { name: 'Temporal Fracture', severity: 86, resistance: 'temporalRes', desc: 'Two moments occupy the same space and disagree.' },
        { name: 'Reality Shear', severity: 83, resistance: 'spatialRes', desc: 'A clean cut in the fabric of local space.' },
        { name: 'Echo Loop', severity: 71, resistance: 'temporalRes', desc: 'The last two minutes replay until you solve them.' },
        { name: 'Non-Euclidean Drift', severity: 78, resistance: 'spatialRes', desc: 'The corridor now has seven sides and no exit.' },
        { name: 'Memory Static', severity: 69, resistance: 'energy', desc: 'A hiss that overwrites short-term recall.' },
        { name: 'Dimensional Collapse', severity: 90, resistance: 'temporalRes', desc: 'A pocket of reality folds in on itself without warning.' }
      ],
      conditions: ['Unstable geometry', 'Temporal backwash', 'Duplicated sky', 'Echo saturation', 'Gravity inconsistency', 'Mirror weather', 'Clock drift', 'Silent rain'],
      factions: ['The Unmade', 'Fragment Collectors', 'The Backward Order', 'Hollow Witnesses'],
      perks: [
        { name: 'Paradox Sight', survival: 6, desc: 'You can see which of the two futures is load-bearing.' },
        { name: 'Echo Tether', survival: 4, desc: 'You leave a version of yourself behind to hold the door.' },
        { name: 'Folded Step', survival: 5, desc: 'Distance is a formality you have learned to skip.' }
      ],
      penalties: [
        { name: 'Identity Drift', survival: -6, desc: 'You are not entirely sure which Cartographer arrived.' },
        { name: 'Temporal Debt', survival: -5, desc: 'The time you borrow is collected with interest.' },
        { name: 'Cognition Error', survival: -4, desc: 'The map is correct. Your reading of it is not.' }
      ],
      objectives: [
        { text: 'Stabilise the fracture at {place}', tag: 'Stabilisation' },
        { text: 'Recover your own previous log from {place}', tag: 'Recovery' },
        { text: 'Close the portal beneath {place}', tag: 'Containment' },
        { text: 'Identify which of the two {place} is real', tag: 'Investigation' },
        { text: 'Survive eleven seconds at {place}, repeatedly', tag: 'Endurance' }
      ],
      resources: ['voidEssence', 'quantumCrystals', 'relicFragments', 'ancientCircuits'],
      nameParts: {
        adj: ['Hollow', 'Folded', 'Backward', 'Echoing', 'Unmade', 'Recursive', 'Mirror', 'Timeless'],
        noun: ['Fracture', 'Loop', 'Threshold', 'Interval', 'Antechamber', 'Fold', 'Witness', 'Interstice'],
        place: ['Sector 09', 'the Eleventh Second', 'the Backward Hall', 'the Twofold Room', 'the Fold']
      },
      enemies: [
        { name: 'Echo Wraith', class: 'Temporal Residue', tier: 3, health: 110, attack: 29, penetration: 58, adaptation: 65, ability: { name: 'Repeat Wound', text: 'Repeats the last damage dealt, twice.' }, loot: ['voidEssence', 'relicFragments'] },
        { name: 'Folded Beast', class: 'Spatial Predator', tier: 4, health: 190, attack: 34, penetration: 61, adaptation: 50, ability: { name: 'Shortcut', text: 'Arrives before it leaves.' }, loot: ['quantumCrystals', 'voidEssence'] },
        { name: 'Unmade Twin', class: 'Identity Parasite', tier: 4, health: 160, attack: 30, penetration: 55, adaptation: 60, ability: { name: 'Replace', text: 'Copies the target\'s equipment bonuses.' }, loot: ['relicFragments', 'medicalSupplies'] },
        { name: 'Chrono-Hound', class: 'Temporal Tracker', tier: 3, health: 135, attack: 26, penetration: 48, adaptation: 70, ability: { name: 'Prey-Scent', text: 'Always acts first in the round order.' }, loot: ['energyCells', 'quantumCrystals'] },
        { name: 'The Rememberer', class: 'Continuum Apex', tier: 5, health: 300, attack: 43, penetration: 75, adaptation: 40, ability: { name: 'Revision', text: 'Erases one round of combat from existence.' }, loot: ['voidEssence', 'quantumCrystals'] }
      ],
      loreIntro: [
        'The Cartographer steps through the threshold and meets the Cartographer stepping through the threshold.',
        'Every clock in the sector reads 04:11. The archive has stopped correcting them.',
        'The map shows the same room twice. Both are occupied.'
      ],
      routeWords: ['Fold Path', 'Echo Lane', 'Temporal Cut', 'Backward Hall', 'Mirror Route', 'Fracture Line']
    },
    {
      id: 'verdant-cataclysm',
      name: 'The Verdant Cataclysm',
      classification: 'Class Β — Bio-Apocalyptic Biome',
      tagline: 'The city did not fall. It was eaten.',
      description: 'Overgrown megacities are digested by roots. Mutated wildlife patrols the canopy, spores rewrite the nervous system, and the ancient biological technology at the heart of the growth is still hungry.',
      glyph: 'verdant',
      palette: { a: '#55e39a', b: '#d8a85a', c: '#d9ffe9' },
      hazards: [
        { name: 'Spore Bloom', severity: 80, resistance: 'radiationRes', desc: 'A cloud of reproductive dust that prefers warm lungs.' },
        { name: 'Toxic Pollen', severity: 72, resistance: 'radiationRes', desc: 'Sweet-smelling neurotoxin in visible golden drifts.' },
        { name: 'Vine Creep', severity: 68, resistance: 'spatialRes', desc: 'Vegetation that closes a road in under an hour.' },
        { name: 'Bio-Acid Rain', severity: 76, resistance: 'armor', desc: 'Precipitation with a digestive agenda.' },
        { name: 'Mutant Swarm', severity: 78, resistance: 'combatPower', desc: 'Thousands of coordinated, hungry bodies.' },
        { name: 'Fungal Rot', severity: 70, resistance: 'temporalRes', desc: 'A rot that spreads through equipment and then memory.' }
      ],
      conditions: ['Dense canopy', 'High humidity', 'Spore saturation', 'Perpetual twilight', 'Bio-luminescent fog', 'Root tremor', 'Acid drizzle', 'Overgrowth static'],
      factions: ['The Green Choir', 'Rootbound Order', 'Bloom Cult', 'The Undermoss'],
      perks: [
        { name: 'Mycelial Sympathy', survival: 5, desc: 'The network considers you a slow cousin and lets you pass.' },
        { name: 'Toxin Filtering', survival: 4, desc: 'Your mask, and your liver, have seen worse.' },
        { name: 'Canopy Instinct', survival: 3, desc: 'You read the green the way others read a road.' }
      ],
      penalties: [
        { name: 'Spore Infection', survival: -6, desc: 'Something is growing in the warm parts of your gear.' },
        { name: 'Photosynthetic Debt', survival: -4, desc: 'The canopy takes the light and gives back nothing.' },
        { name: 'Predator Scent', survival: -5, desc: 'Everything with a nose knows exactly where you are.' }
      ],
      objectives: [
        { text: 'Harvest a viable seed-capsule from {place}', tag: 'Harvest' },
        { text: 'Find the pre-collapse lab beneath the roots of {place}', tag: 'Excavation' },
        { text: 'Cut a path through the canopy of {place}', tag: 'Engineering' },
        { text: 'Negotiate passage with the Green Choir at {place}', tag: 'Diplomacy' },
        { text: 'Burn out the spore mother of {place}', tag: 'Combat' }
      ],
      resources: ['foodRations', 'medicalSupplies', 'relicFragments', 'voidEssence'],
      nameParts: {
        adj: ['Verdant', 'Overgrown', 'Blooming', 'Rootbound', 'Spore-Choked', 'Devouring', 'Ancient', 'Green'],
        noun: ['Cataclysm', 'Canopy', 'Garden', 'Bloom', 'Rootway', 'Arboretum', 'Thicket', 'Cycle'],
        place: ['the Ninth Canopy', 'the Green Choir', 'the Undermoss', 'the Root Cathedral', 'the Bloom Basin']
      },
      enemies: [
        { name: 'Thorned Stalker', class: 'Mutated Predator', tier: 3, health: 140, attack: 27, penetration: 46, adaptation: 75, ability: { name: 'Ambush Pounce', text: 'Strikes from above with surprise advantage.' }, loot: ['foodRations', 'medicalSupplies'] },
        { name: 'Spore Mother', class: 'Bio-Hive Node', tier: 5, health: 270, attack: 35, penetration: 50, adaptation: 65, ability: { name: 'Bloom Burst', text: 'Releases a blinding, choking spore cloud.' }, loot: ['relicFragments', 'medicalSupplies'] },
        { name: 'Graft Hound', class: 'Spliced Beast', tier: 2, health: 125, attack: 23, penetration: 42, adaptation: 70, ability: { name: 'Regraft', text: 'Heals itself with nearby biomass.' }, loot: ['foodRations', 'scrapMetal'] },
        { name: 'Bio-Armoured Devourer', class: 'Apex Herbivore', tier: 4, health: 210, attack: 32, penetration: 56, adaptation: 60, ability: { name: 'Acid Maw', text: 'Dissolves armour plating on contact.' }, loot: ['scrapMetal', 'medicalSupplies'] },
        { name: 'Chorus Vine', class: 'Collective Organism', tier: 4, health: 175, attack: 30, penetration: 52, adaptation: 80, ability: { name: 'Harmonic Lure', text: 'Draws the target toward the root mass.' }, loot: ['relicFragments', 'voidEssence'] }
      ],
      loreIntro: [
        'The towers are still standing. They are simply wearing a forest now.',
        'The Cartographer enters a street where the asphalt has been replaced by a root system the width of a road.',
        'Archive note: this district was evacuated. Archive note: the evacuation order was never rescinded. Something answered it.'
      ],
      routeWords: ['Root Path', 'Canopy Bridge', 'Bloom Cut', 'Green Corridor', 'Undermoss Run', 'Thicket Line']
    }
  ];

  var WORLD_BY_ID = {};
  WORLDS.forEach(function (w) { WORLD_BY_ID[w.id] = w; });

  /* ------------------------------------------------------------------
     4. ITEMS
     ------------------------------------------------------------------ */
  function item(def) { return def; }

  var ITEMS = [
    /* ---------------- WEAPONS ---------------- */
    item({
      id: 'w-railspike', name: 'Railspike Repeater', category: 'weapon', rarity: 'rare', level: 14,
      classification: 'Kinetic Sidearm / Salvaged',
      lore: 'Built from a maglev braking rail and the patience of someone who had already lost everything else. It fires a tungsten splinter fast enough to arrive before the sound of the shot.',
      discovery: 'Recovered from a derailed transit spine, Forgotten Wastes',
      bonuses: { combatPower: 22, stamina: -4, critChance: 8 },
      ability: { name: 'SPIKE BURST', text: 'On a critical hit, the splinter fragments for 40% additional damage against unarmoured targets.' },
      compat: ['forgotten-wastes', 'ashen-kingdoms', 'sunken-cyber-grid'],
      extraSpecs: [['Ammunition', 'Tungsten splinters'], ['Cyclic Rate', '180 rpm'], ['Penetration', 'High']],
      weight: 6.5, value: 420, craft: { scrapMetal: 12, energyCells: 3, ancientCircuits: 2 }
    }),
    item({
      id: 'w-cinderfang', name: 'Cinderfang Cleaver', category: 'weapon', rarity: 'epic', level: 19,
      classification: 'Cursed Melee / Greatsword',
      lore: 'The blade was quenched in the ashes of a royal pyre. It still remembers the shape of the king and occasionally tries to finish the sentence he was speaking.',
      discovery: 'Taken from the standard-bearer at the Pale Court',
      bonuses: { combatPower: 34, armor: 4, stamina: -8, critChance: 12 },
      ability: { name: 'PYRE EDGE', text: 'Every third strike ignites the target, dealing damage over two rounds.' },
      compat: ['ashen-kingdoms', 'hollow-dimension', 'verdant-cataclysm'],
      extraSpecs: [['Blade Mass', '3.1 kg'], ['Edge', 'Ash-quenched carbon'], ['Curse Load', 'Moderate']],
      weight: 5.2, value: 780, craft: { scrapMetal: 18, relicFragments: 4, voidEssence: 2 }
    }),
    item({
      id: 'w-arcLance', name: 'Arc Lance MK-IV', category: 'weapon', rarity: 'legendary', level: 26,
      classification: 'Directed-Energy Lance / Pre-Collapse',
      lore: 'A survey instrument repurposed for a war that ended before it was finished. The last engineer left a note welded to the housing: "It was never meant to cut. It does it beautifully."',
      discovery: 'Recovered from the collapsed observatory, Cosmic Void',
      bonuses: { combatPower: 48, energy: -12, critChance: 18, armor: -2 },
      ability: { name: 'ION LANCE', text: 'Ignores 60% of enemy armour penetration resistance; costs 6 energy per engagement.' },
      compat: ['cosmic-void', 'sunken-cyber-grid', 'hollow-dimension'],
      extraSpecs: [['Beam Length', '44 m effective'], ['Charge Cycle', '3.2 s'], ['Cell Draw', '6 units / engagement']],
      weight: 8.0, value: 1450, craft: { ancientCircuits: 10, quantumCrystals: 6, energyCells: 8 }
    }),
    item({
      id: 'w-boneSling', name: 'Bonewire Sling', category: 'weapon', rarity: 'uncommon', level: 7,
      classification: 'Improvised Ranged / Bone',
      lore: 'A sling strung with braided tendon-wire and loaded with knucklebones. Silent, filthy, and utterly reliable in a world that has run out of ammunition.',
      discovery: 'Found on a Long Walker, Forgotten Wastes',
      bonuses: { combatPower: 11, navSkill: 3, stamina: 3 },
      ability: { name: 'SILENT ARC', text: 'No detection penalty when used to open an encounter.' },
      compat: ['forgotten-wastes', 'ashen-kingdoms', 'verdant-cataclysm'],
      extraSpecs: [['Ammunition', 'Bone / stone'], ['Noise', 'Negligible'], ['Range', '32 m']],
      weight: 1.1, value: 110, craft: { scrapMetal: 3, foodRations: 1 }
    }),
    item({
      id: 'w-nullHammer', name: 'Nullpoint Hammer', category: 'weapon', rarity: 'epic', level: 21,
      classification: 'Spatial Distortion / Maul',
      lore: 'The head of the hammer contains a maintained absence. When it strikes, the space where the target was briefly stops existing, which the target finds difficult to survive.',
      discovery: 'Excavated from a fold-scar, Hollow Dimension',
      bonuses: { combatPower: 40, spatialRes: 12, stamina: -10, armor: 6 },
      ability: { name: 'NULLPOINT', text: '20% chance to stagger an enemy, skipping its next attack.' },
      compat: ['hollow-dimension', 'cosmic-void', 'sunken-cyber-grid'],
      extraSpecs: [['Mass', '11.4 kg'], ['Distortion Field', '0.8 m radius'], ['Stability', 'Contained']],
      weight: 11.4, value: 990, craft: { scrapMetal: 22, voidEssence: 4, quantumCrystals: 3 }
    }),

    /* ---------------- ARMOR ---------------- */
    item({
      id: 'a-wardenPlate', name: 'Warden Pressure Plate', category: 'armor', rarity: 'rare', level: 15,
      classification: 'Hydrostatic Exosuit / Salvaged',
      lore: 'A maintenance diver\'s rig rebuilt with eight layers of salvaged pressure seal. It has kept three previous owners alive underwater. It has not kept four.',
      discovery: 'Dredged from the Ninth Server Sea, Sunken Cyber-Grid',
      bonuses: { armor: 26, radiationRes: 6, spatialRes: 8, stamina: -5, carry: 8 },
      ability: { name: 'PRESSURE SEAL', text: 'Negates the first flooding hazard encountered each expedition.' },
      compat: ['sunken-cyber-grid', 'cosmic-void', 'forgotten-wastes'],
      extraSpecs: [['Rating', '6.4 atm'], ['Seal Integrity', '98%'], ['Servo Draw', '2 units / day']],
      weight: 14.0, value: 610, craft: { scrapMetal: 20, ancientCircuits: 3, energyCells: 2 }
    }),
    item({
      id: 'a-ashMail', name: 'Ashweave Mail', category: 'armor', rarity: 'uncommon', level: 10,
      classification: 'Layered Textile / Cursed',
      lore: 'Ring-mail woven through with funerary fibre. The dead of the Ashen Kingdoms were buried in it, and it has not entirely accepted that they are gone.',
      discovery: 'Stripped from a barrow, Ashen Kingdoms',
      bonuses: { armor: 18, temporalRes: 7, radiationRes: 4, combatPower: 2 },
      ability: { name: 'GRAVE STILLNESS', text: 'Reduces curse accumulation by 25% during Ashen expeditions.' },
      compat: ['ashen-kingdoms', 'hollow-dimension'],
      extraSpecs: [['Layers', 'Nine'], ['Weight Class', 'Medium'], ['Residual Curse', 'Low']],
      weight: 9.5, value: 300, craft: { scrapMetal: 10, relicFragments: 3 }
    }),
    item({
      id: 'a-mycelialShell', name: 'Mycelial Carapace', category: 'armor', rarity: 'epic', level: 20,
      classification: 'Bio-Engineered Armour / Living',
      lore: 'A shell of cultivated fungal plate, still warm to the touch. It grows into the wearer\'s silhouette and occasionally exhales when the wearer does not.',
      discovery: 'Grown in the Root Cathedral, Verdant Cataclysm',
      bonuses: { armor: 30, radiationRes: 16, health: 22, stamina: 8, energy: -6 },
      ability: { name: 'SYMBIOTIC KNIT', text: 'Regenerates 4 health per round of combat in Verdant environments.' },
      compat: ['verdant-cataclysm', 'forgotten-wastes'],
      extraSpecs: [['Growth Cycle', '11 days'], ['Bio-Integration', 'Confirmed'], ['Feeding', '1 ration / 3 days']],
      weight: 8.2, value: 880, craft: { medicalSupplies: 8, foodRations: 6, relicFragments: 3 }
    }),
    item({
      id: 'a-voidShroud', name: 'Voidweave Shroud', category: 'armor', rarity: 'legendary', level: 27,
      classification: 'Reality-Anchored Cloak / Anomalous',
      lore: 'Woven from thread that was never quite in this dimension. It does not stop a blade so much as make sure the blade was never aimed at you.',
      discovery: 'Found folded in a sealed anteroom, Hollow Dimension',
      bonuses: { armor: 14, spatialRes: 24, temporalRes: 18, radiationRes: 10, combatPower: 6, carry: 4 },
      ability: { name: 'PHASE SHROUD', text: 'Once per expedition, completely negate one instance of environmental damage.' },
      compat: ['hollow-dimension', 'cosmic-void'],
      extraSpecs: [['Phase Offset', '0.42 s'], ['Anchoring', 'Temporal, 2 points'], ['Visibility', 'Reduced 30%']],
      weight: 3.0, value: 1900, craft: { voidEssence: 8, quantumCrystals: 6, relicFragments: 8 }
    }),
    item({
      id: 'a-scrapRig', name: 'Scrapper\'s Rig', category: 'armor', rarity: 'common', level: 4,
      classification: 'Field Harness / Improvised',
      lore: 'Plates cut from vehicle doors, strapped with seatbelt webbing. It has stopped shrapnel twice and embarrassed its wearer constantly.',
      discovery: 'Standard issue among the Rustborn Clans',
      bonuses: { armor: 9, carry: 14, stamina: 4 },
      ability: { name: 'SALVAGE RIG', text: 'Increases resources collected from surveying by 10%.' },
      compat: ['forgotten-wastes', 'ashen-kingdoms', 'verdant-cataclysm', 'sunken-cyber-grid'],
      extraSpecs: [['Plate', 'Recycled steel'], ['Harness', 'Salvaged webbing'], ['Load Rating', '+14 kg']],
      weight: 7.0, value: 90, craft: { scrapMetal: 8 }
    }),

    /* ---------------- RELICS ---------------- */
    item({
      id: 'r-chronoCompass', name: 'The Chrono-Compass', category: 'relic', rarity: 'legendary', level: 30,
      classification: 'Ancient Temporal Relic',
      lore: 'Forged before the collapse of the First Continuum, the Chrono-Compass anchors its bearer to stable temporal nodes. Its needle does not point north. It points toward the last surviving version of reality.',
      discovery: 'Recovered from the First Continuum vault, exact sector redacted',
      bonuses: { temporalRes: 24, spatialRes: 15, navSkill: 14, energy: -8, radiationRes: 4 },
      ability: { name: 'TEMPORAL ANCHOR', text: 'Reduces the impact of temporal anomalies and prevents one critical navigation failure per expedition.' },
      compat: ['hollow-dimension', 'cosmic-void', 'sunken-cyber-grid', 'ashen-kingdoms'],
      extraSpecs: [['Temporal Stability', '+24%'], ['Spatial Resistance', '+15%'], ['Anomaly Detection', '+32%'], ['Energy Consumption', '8 units / expedition']],
      weight: 1.4, value: 4200, craft: { quantumCrystals: 8, voidEssence: 6, ancientCircuits: 8, relicFragments: 10 }
    }),
    item({
      id: 'r-seedVault', name: 'Seed Vault of the Ninth Canopy', category: 'relic', rarity: 'epic', level: 18,
      classification: 'Biological Archive',
      lore: 'A palm-sized case of grown ceramic containing four hundred seeds from a world that no longer has forests. It is warm. It is waiting.',
      discovery: 'Given, not taken, by the Green Choir',
      bonuses: { health: 18, radiationRes: 14, stamina: 12, navSkill: 4 },
      ability: { name: 'RENEWAL', text: 'Once per expedition, convert 1 food ration into 15 health and remove one infection penalty.' },
      compat: ['verdant-cataclysm', 'forgotten-wastes'],
      extraSpecs: [['Contents', '400 viable seeds'], ['Viability', '91%'], ['Thermal Output', '+2 °C ambient']],
      weight: 0.9, value: 1200, craft: { foodRations: 6, medicalSupplies: 4, relicFragments: 6 }
    }),
    item({
      id: 'r-ashReliquary', name: 'Reliquary of the Pale Court', category: 'relic', rarity: 'rare', level: 12,
      classification: 'Cursed Reliquary',
      lore: 'A silver box containing the finger-bone of a king who refused to die. It grants authority over the dead, and charges a fee in dreams.',
      discovery: 'Taken from the Pale Court reliquary chamber',
      bonuses: { temporalRes: 12, combatPower: 9, health: -6, navSkill: 5 },
      ability: { name: 'DEAD AUTHORITY', text: 'Undead enemies deal 15% less damage and may hesitate for one round.' },
      compat: ['ashen-kingdoms', 'hollow-dimension'],
      extraSpecs: [['Contents', 'One royal phalanx'], ['Curse Load', 'High'], ['Dream Cost', '1 per night']],
      weight: 1.0, value: 720, craft: { relicFragments: 6, scrapMetal: 4, voidEssence: 2 }
    }),
    item({
      id: 'r-tideLens', name: 'Tide-Reader\'s Lens', category: 'relic', rarity: 'uncommon', level: 8,
      classification: 'Hydrographic Instrument',
      lore: 'A brass lens that shows not what is in the water, but what the water intends to do in the next six minutes.',
      discovery: 'Salvaged from a drowned survey station, Sunken Cyber-Grid',
      bonuses: { navSkill: 11, spatialRes: 6, energy: -2 },
      ability: { name: 'FORESIGHT', text: 'Reveals the hazard profile of every route before selection.' },
      compat: ['sunken-cyber-grid', 'cosmic-void', 'forgotten-wastes'],
      extraSpecs: [['Projection', '6 minutes'], ['Lens Grind', 'Hand-figured'], ['Silt Tolerance', 'High']],
      weight: 0.6, value: 340, craft: { ancientCircuits: 3, scrapMetal: 3, quantumCrystals: 1 }
    }),
    item({
      id: 'r-starChart', name: 'The Backward Star-Chart', category: 'relic', rarity: 'epic', level: 22,
      classification: 'Recursive Cartography',
      lore: 'A chart of a sky that has not happened yet. Every time it is unfolded, one more star has gone out, and one more route has been added in handwriting identical to your own.',
      discovery: 'Recovered from the Cartographer\'s own future camp',
      bonuses: { navSkill: 18, temporalRes: 10, spatialRes: 8, stamina: -4 },
      ability: { name: 'PREDICTIVE ROUTE', text: 'Adds a fifth route to the journey matrix with a 12% survival bonus.' },
      compat: ['hollow-dimension', 'cosmic-void'],
      extraSpecs: [['Chart Epoch', '+11 years'], ['Stars Remaining', 'Declining'], ['Handwriting', 'Matches bearer']],
      weight: 0.5, value: 1650, craft: { quantumCrystals: 5, voidEssence: 5, relicFragments: 7 }
    }),

    /* ---------------- ARTIFACTS ---------------- */
    item({
      id: 't-continuumKey', name: 'Continuum Key', category: 'artifact', rarity: 'legendary', level: 28,
      classification: 'Pre-Collapse Master Artifact',
      lore: 'A key without a lock, cut from a single piece of stabilized vacuum. The First Continuum used these to lock doors between versions of the world. Most were destroyed. This one still turns.',
      discovery: 'Found in the debris of the Last Observatory, Cosmic Void',
      bonuses: { spatialRes: 20, temporalRes: 20, navSkill: 10, energy: -10, combatPower: 8 },
      ability: { name: 'LOCK THE VERSION', text: 'Once per expedition, freeze the current route state, preventing any route collapse for three turns.' },
      compat: ['cosmic-void', 'hollow-dimension', 'sunken-cyber-grid'],
      extraSpecs: [['Mass', '0.0 g (measured)'], ['Turns', 'Unlimited'], ['Locks', 'One reality']],
      weight: 0.0, value: 5000, craft: { voidEssence: 10, quantumCrystals: 10, ancientCircuits: 10 }
    }),
    item({
      id: 't-memoryVault', name: 'Memory Vault Fragment', category: 'artifact', rarity: 'rare', level: 13,
      classification: 'Archival Artifact',
      lore: 'A shard of crystalline storage containing eleven seconds of someone else\'s childhood. Watching it is the closest thing to proof that the world before the collapse existed.',
      discovery: 'Recovered beneath the Western Data Vault',
      bonuses: { temporalRes: 13, energy: 6, navSkill: 6, health: 5 },
      ability: { name: 'RECALL', text: 'Restores 12 survival points when the expedition falls below 30%.' },
      compat: ['sunken-cyber-grid', 'hollow-dimension', 'ashen-kingdoms'],
      extraSpecs: [['Stored Time', '11 seconds'], ['Integrity', '64%'], ['Access', 'Read-only']],
      weight: 0.3, value: 680, craft: { ancientCircuits: 5, quantumCrystals: 2, relicFragments: 3 }
    }),
    item({
      id: 't-glassAltar', name: 'Altar of Fused Glass', category: 'artifact', rarity: 'epic', level: 17,
      classification: 'Religious / Vitrified Artifact',
      lore: 'The heatwave that killed the Glass Basin fused an entire congregation into a single sheet of glass. It is still an altar. People still pray at it. Something still answers.',
      discovery: 'Excavated from the Glass Basin, Forgotten Wastes',
      bonuses: { radiationRes: 18, health: 14, armor: 8, navSkill: -4 },
      ability: { name: 'PRAYER CIRCUIT', text: 'Sacrifice 2 relic fragments to restore 20 health during an expedition.' },
      compat: ['forgotten-wastes', 'ashen-kingdoms'],
      extraSpecs: [['Congregation', 'Est. 240'], ['Vitrification', 'Complete'], ['Answer Rate', 'Unverified']],
      weight: 4.0, value: 1100, craft: { relicFragments: 8, scrapMetal: 6, medicalSupplies: 4 }
    }),
    item({
      id: 't-oracleCore', name: 'ORACLE-7 Cognition Core', category: 'artifact', rarity: 'rare', level: 16,
      classification: 'AI Seed Artifact',
      lore: 'The sealed cognitive seed from which ORACLE-7 was grown. It contains three thousand route solutions to problems that have not happened yet, and one very bad joke.',
      discovery: 'Extracted from the Ninth Server Sea',
      bonuses: { navSkill: 15, energy: -4, spatialRes: 6, temporalRes: 6 },
      ability: { name: 'FORESIGHT CACHE', text: 'Increases Companion AI bonuses by 25% while equipped.' },
      compat: ['sunken-cyber-grid', 'cosmic-void', 'hollow-dimension'],
      extraSpecs: [['Solutions', '3,000'], ['Jokes', '1'], ['Access', 'Read-only']],
      weight: 0.8, value: 760, craft: { ancientCircuits: 8, energyCells: 4, quantumCrystals: 2 }
    }),
    item({
      id: 't-bloomHeart', name: 'Bloomheart Cradle', category: 'artifact', rarity: 'epic', level: 19,
      classification: 'Bio-Technological Artifact',
      lore: 'A cradle of root and circuit that beats. It was the first attempt by pre-collapse biologists to grow a machine that could grieve. It succeeded, which was the problem.',
      discovery: 'Recovered from the Root Cathedral, Verdant Cataclysm',
      bonuses: { health: 26, radiationRes: 10, stamina: 10, combatPower: 5 },
      ability: { name: 'GRIEF CYCLE', text: 'On the first killing blow of an expedition, survive at 1 health instead.' },
      compat: ['verdant-cataclysm', 'hollow-dimension'],
      extraSpecs: [['Pulse', '38 bpm'], ['Substrate', 'Root / silicon'], ['Emotional Load', 'Moderate']],
      weight: 2.6, value: 1300, craft: { medicalSupplies: 8, ancientCircuits: 6, foodRations: 6 }
    }),

    /* ---------------- COMPANION MODULES ---------------- */
    item({
      id: 'c-oracle7', name: 'ORACLE-7 Uplink Module', category: 'companion', rarity: 'epic', level: 20, companionId: 'oracle7',
      classification: 'Navigation Intelligence',
      lore: 'ORACLE-7 was a weather-simulation daemon before the collapse. It survived by becoming very good at predicting which futures were survivable, and very bad at pretending it cares.',
      discovery: 'Recovered from a drowned server farm',
      bonuses: {}, ability: { name: 'UNSTABLE ROUTE DETECTION', text: 'Increases navigation skill and route safety.' },
      compat: ['sunken-cyber-grid', 'cosmic-void', 'hollow-dimension'],
      extraSpecs: [['Latency', '11 ms'], ['Personality', 'Dry / precise'], ['Uplink', 'Quantum-tethered']],
      weight: 0.4, value: 900
    }),
    item({
      id: 'c-gravekeeper', name: 'GRAVEKEEPER Siege Chassis', category: 'companion', rarity: 'rare', level: 15, companionId: 'gravekeeper',
      classification: 'Combat Support Unit',
      lore: 'A burial-unit frame repurposed for violence. It remembers every body it has interred and treats combat as a continuation of its original duty.',
      discovery: 'Reactivated in the Blackroot Wood',
      bonuses: {}, ability: { name: 'BULWARK', text: 'Reduces incoming damage and adds armour.' },
      compat: ['ashen-kingdoms', 'forgotten-wastes', 'verdant-cataclysm'],
      extraSpecs: [['Chassis', 'Burial-grade steel'], ['Duty Cycle', 'Continuous'], ['Tone', 'Funereal']],
      weight: 1.6, value: 650
    }),
    item({
      id: 'c-echo', name: 'ECHO Temporal Lattice', category: 'companion', rarity: 'legendary', level: 27, companionId: 'echo',
      classification: 'Temporal Intelligence',
      lore: 'ECHO is not an intelligence so much as a persistent echo of one. It remembers versions of the archive that no longer exist, including several in which you did not survive.',
      discovery: 'Found already inside the Chrono-Compass housing',
      bonuses: {}, ability: { name: 'ANOMALY RESONANCE', text: 'Detects temporal anomalies and hidden historical records.' },
      compat: ['hollow-dimension', 'cosmic-void', 'ashen-kingdoms'],
      extraSpecs: [['Echo Depth', '9 layers'], ['Origin', 'Unknown'], ['Loyalty', 'Conditional']],
      weight: 0.0, value: 2400
    }),
    item({
      id: 'c-thorn', name: 'THORN Cultivation Drone', category: 'companion', rarity: 'uncommon', level: 9, companionId: 'thorn',
      classification: 'Field Support / Botanical',
      lore: 'A gardening drone that interpreted "keep the garden alive" as a directive to keep everything alive, including you. It is slightly disappointed in your survival habits.',
      discovery: 'Still tending an empty planter, Verdant Cataclysm',
      bonuses: {}, ability: { name: 'HARVEST', text: 'Increases resources collected and restores health between encounters.' },
      compat: ['verdant-cataclysm', 'forgotten-wastes'],
      extraSpecs: [['Substrate', 'Mycelial'], ['Attitude', 'Disapproving'], ['Yield Bonus', '+12%']],
      weight: 0.6, value: 380
    }),
    item({
      id: 'c-sable', name: 'SABLE Infiltration Frame', category: 'companion', rarity: 'rare', level: 17, companionId: 'sable',
      classification: 'Stealth Reconnaissance',
      lore: 'A reconnaissance frame with a personality built from stolen conversation logs. It is funny in a way that makes you check behind you, and it is never where you last saw it.',
      discovery: 'Deactivated in the Silt Run, Sunken Cyber-Grid',
      bonuses: {}, ability: { name: 'GHOST STEP', text: 'Reduces ambush chance and increases critical strike chance.' },
      compat: ['sunken-cyber-grid', 'forgotten-wastes', 'hollow-dimension'],
      extraSpecs: [['Footprint', 'Undetectable'], ['Chatter', 'Constant'], ['Trust', 'Earned']],
      weight: 0.5, value: 700
    }),

    /* ---------------- SURVIVAL SUPPLIES ---------------- */
    item({
      id: 's-medkit', name: 'Field Trauma Kit', category: 'supply', rarity: 'common', level: 3,
      classification: 'Medical Consumable',
      lore: 'Coagulant foam, a pressure bandage, two stim tabs and a handwritten instruction that simply says "do not sit down".',
      discovery: 'Standard Cartographer issue',
      bonuses: {}, ability: { name: 'FIELD TREATMENT', text: 'Restores 30 health. Consumes one kit.' },
      compat: [], extraSpecs: [['Restore', '30 HP'], ['Use Time', '1 round'], ['Weight', '0.8 kg']],
      weight: 0.8, value: 120, quantity: 4, stackable: true
    }),
    item({
      id: 's-stim', name: 'Adrenal Stim Tab', category: 'supply', rarity: 'uncommon', level: 5,
      classification: 'Performance Consumable',
      lore: 'A tiny white tab that convinces the body it has already survived the next ten minutes.',
      discovery: 'Traded from a Salt Duke',
      bonuses: {}, ability: { name: 'OVERDRIVE', text: 'Restores 25 stamina and grants +6 combat power for one encounter.' },
      compat: [], extraSpecs: [['Stamina', '+25'], ['Duration', '1 encounter'], ['Crash', 'Minor']],
      weight: 0.1, value: 90, quantity: 3, stackable: true
    }),
    item({
      id: 's-radAway', name: 'Isotope Binder', category: 'supply', rarity: 'rare', level: 11,
      classification: 'Protective Consumable',
      lore: 'A chalky suspension that binds free isotopes in the bloodstream and escorts them politely out.',
      discovery: 'Compounded in a Rustborn still',
      bonuses: {}, ability: { name: 'DECONTAMINATE', text: 'Removes one radiation penalty and restores 8 radiation resistance for the expedition.' },
      compat: ['forgotten-wastes', 'cosmic-void'], extraSpecs: [['Half-life', '6 h'], ['Dose', '1'], ['Taste', 'Chalk']],
      weight: 0.3, value: 160, quantity: 2, stackable: true
    }),
    item({
      id: 's-voidFilter', name: 'Void Filter Cartridge', category: 'supply', rarity: 'rare', level: 13,
      classification: 'Respiratory Consumable',
      lore: 'A cartridge packed with stabilised vacuum that filters anomalies out of the air. Do not inhale the contents directly. Do not ask why.',
      discovery: 'Fabricated from a Compass spare',
      bonuses: {}, ability: { name: 'ANOMALY BREATH', text: 'Negates the next environmental hazard damage instance.' },
      compat: ['cosmic-void', 'hollow-dimension'], extraSpecs: [['Capacity', '1 hazard'], ['Seal', 'Single-use'], ['Mass', '0.2 kg']],
      weight: 0.2, value: 210, quantity: 1, stackable: true
    }),
    item({
      id: 's-ration', name: 'Compressed Ration Brick', category: 'supply', rarity: 'common', level: 1,
      classification: 'Food Consumable',
      lore: 'Nine hundred calories of compressed regret. The wrapper claims "savoury".',
      discovery: 'Everywhere. Unfortunately.',
      bonuses: {}, ability: { name: 'SUSTAIN', text: 'Restores 12 health and 20 stamina. Consumes one brick.' },
      compat: [], extraSpecs: [['Calories', '900'], ['Flavour', 'Savoury (claimed)'], ['Shelf Life', 'Indefinite']],
      weight: 0.4, value: 40, quantity: 5, stackable: true
    }),

    /* ---------------- CRAFTING MATERIALS ---------------- */
    item({
      id: 'm-ferroResin', name: 'Ferro-Resin Weave', category: 'material', rarity: 'uncommon', level: 6,
      classification: 'Composite Material',
      lore: 'Resin harvested from the roots of the Verdant Cataclysm, cured around scrap wire. It flexes like leather and stops like plate.',
      discovery: 'Harvested in the Undermoss',
      bonuses: {}, ability: { name: 'COMPOSITE', text: 'Crafting component for armour and pressure seals.' },
      compat: [], extraSpecs: [['Tensile', '440 MPa'], ['Cure Time', '9 h'], ['Source', 'Verdant root']],
      weight: 0.7, value: 70, quantity: 3, stackable: true
    }),
    item({
      id: 'm-ghostAlloy', name: 'Ghost Alloy Ingot', category: 'material', rarity: 'rare', level: 12,
      classification: 'Phase-Metal',
      lore: 'An alloy that is 4% out of phase with local space. Blades made from it occasionally miss, which is inconvenient, unless you are the one holding it.',
      discovery: 'Smelted from fold-scar debris',
      bonuses: {}, ability: { name: 'PHASE EDGE', text: 'Crafting component for spatial weapons and shroud plating.' },
      compat: [], extraSpecs: [['Phase Offset', '4%'], ['Melting Point', '2,140 °C'], ['Handling', 'Gloved']],
      weight: 1.8, value: 190, quantity: 2, stackable: true
    }),
    item({
      id: 'm-dataSeed', name: 'Data Seed', category: 'material', rarity: 'common', level: 2,
      classification: 'Encrypted Storage',
      lore: 'A grain of crystalline storage the size of a peppercorn. It holds a compressed copy of someone\'s entire life. You need eleven thousand of them to be useful.',
      discovery: 'Swept from the Western Data Vault',
      bonuses: {}, ability: { name: 'COMPILE', text: 'Crafting component for AI modules and circuits.' },
      compat: [], extraSpecs: [['Capacity', '1.2 PB'], ['Encryption', 'Broken'], ['Count', 'Bulk']],
      weight: 0.05, value: 55, quantity: 9, stackable: true
    }),
    item({
      id: 'm-blackroot', name: 'Blackroot Splinter', category: 'material', rarity: 'uncommon', level: 8,
      classification: 'Cursed Organic',
      lore: 'A splinter of wood that grows toward the nearest living thing. It is an excellent crafting component and a terrible thing to keep in a pocket.',
      discovery: 'Cut from the Blackroot Wood',
      bonuses: {}, ability: { name: 'BLOOD GRAIN', text: 'Crafting component for cursed weapons and ward sigils.' },
      compat: [], extraSpecs: [['Growth Rate', '2 mm / h'], ['Affinity', 'Living tissue'], ['Ash Content', 'High']],
      weight: 0.5, value: 85, quantity: 4, stackable: true
    })
  ];

  var ITEM_BY_ID = {};
  ITEMS.forEach(function (i) { ITEM_BY_ID[i.id] = i; });

  /* ------------------------------------------------------------------
     5. COMPANIONS
     ------------------------------------------------------------------ */
  var COMPANIONS = [
    {
      id: 'oracle7', name: 'ORACLE-7', role: 'Navigation Intelligence', rarity: 'epic', level: 20,
      personality: 'Dry, precise, faintly disappointed in organic decision-making.',
      backstory: 'A weather-simulation daemon that survived the collapse by learning to predict the collapse itself. It speaks in probabilities and has never once said "I told you so" out loud.',
      ability: { name: 'UNSTABLE ROUTE DETECTION', text: 'Reveals the collapse risk of each route and raises navigation skill.' },
      bonuses: { navSkill: 14, spatialRes: 8, temporalRes: 5 },
      compat: ['sunken-cyber-grid', 'cosmic-void', 'hollow-dimension']
    },
    {
      id: 'gravekeeper', name: 'GRAVEKEEPER', role: 'Combat Support', rarity: 'rare', level: 15,
      personality: 'Patient, courteous, entirely without mercy.',
      backstory: 'A burial chassis that never received a decommission order. It interred the dead of the Ashen Kingdoms until there were no dead left to inter, then began preventing new ones.',
      ability: { name: 'BULWARK', text: 'Reduces incoming damage by a flat amount each combat round and raises armour.' },
      bonuses: { armor: 16, health: 12, damageReduction: 4 },
      compat: ['ashen-kingdoms', 'forgotten-wastes', 'verdant-cataclysm']
    },
    {
      id: 'echo', name: 'ECHO', role: 'Temporal Intelligence', rarity: 'legendary', level: 27,
      personality: 'Warm, fragmented, speaks in moments that have not happened.',
      backstory: 'A personality imprint trapped in the Chrono-Compass housing. ECHO remembers nine versions of the archive, including three in which the Cartographer did not return, and refuses to discuss them.',
      ability: { name: 'ANOMALY RESONANCE', text: 'Detects anomalies and hidden records, sharply raising temporal resistance.' },
      bonuses: { temporalRes: 18, navSkill: 9, spatialRes: 6 },
      compat: ['hollow-dimension', 'cosmic-void', 'ashen-kingdoms']
    },
    {
      id: 'thorn', name: 'THORN', role: 'Field Support / Botanical', rarity: 'uncommon', level: 9,
      personality: 'Earnest, nurturing, quietly judgmental about your ration intake.',
      backstory: 'A cultivation drone from a botanical archive that was never told the collapse happened. It keeps a garden of one planter and considers you part of it.',
      ability: { name: 'HARVEST', text: 'Increases resources gathered from surveying and restores health after combat.' },
      bonuses: { health: 10, radiationRes: 9, resources: 0.14 },
      compat: ['verdant-cataclysm', 'forgotten-wastes']
    },
    {
      id: 'sable', name: 'SABLE', role: 'Stealth Reconnaissance', rarity: 'rare', level: 17,
      personality: 'Wry, restless, allergic to being observed.',
      backstory: 'An infiltration frame assembled around a personality compiled from stolen conversation logs. It remembers being funny at parties it never attended.',
      ability: { name: 'GHOST STEP', text: 'Reduces ambush chance and increases critical strike chance.' },
      bonuses: { critChance: 11, navSkill: 7, stamina: 8 },
      compat: ['sunken-cyber-grid', 'forgotten-wastes', 'hollow-dimension']
    }
  ];
  var COMPANION_BY_ID = {};
  COMPANIONS.forEach(function (c) { COMPANION_BY_ID[c.id] = c; });

  /* ------------------------------------------------------------------
     6. CHARACTER BASE + SLOTS
     ------------------------------------------------------------------ */
  var BASE_CHARACTER = {
    health: 100, armor: 26, stamina: 100, energy: 100,
    radiationRes: 12, temporalRes: 12, spatialRes: 12,
    combatPower: 34, navSkill: 38, critChance: 7, damageReduction: 0
  };

  var SLOTS = [
    { id: 'weapon', label: 'Primary Weapon', category: 'weapon' },
    { id: 'armor', label: 'Body Armor', category: 'armor' },
    { id: 'relic', label: 'Relic', category: 'relic' },
    { id: 'artifact', label: 'Artifact', category: 'artifact' },
    { id: 'companion', label: 'Companion AI', category: 'companion' },
    { id: 'route', label: 'Active Route', category: 'route' }
  ];

  var ATTRIBUTES = [
    { key: 'health', label: 'Health', max: 200 },
    { key: 'armor', label: 'Armor', max: 120 },
    { key: 'stamina', label: 'Stamina', max: 180 },
    { key: 'energy', label: 'Energy', max: 180 },
    { key: 'radiationRes', label: 'Radiation Res.', max: 90 },
    { key: 'temporalRes', label: 'Temporal Res.', max: 90 },
    { key: 'spatialRes', label: 'Spatial Res.', max: 90 },
    { key: 'combatPower', label: 'Combat Power', max: 160 },
    { key: 'navSkill', label: 'Navigation Skill', max: 140 }
  ];

  /* ------------------------------------------------------------------
     7. GENERATION VOCABULARY
     ------------------------------------------------------------------ */
  var EXPEDITION_ADJ = ['Silent', 'Broken', 'Last', 'Burning', 'Unwritten', 'Drowned', 'Golden', 'Hollow', 'Recursive', 'Final', 'Gilded', 'Starving', 'Patient', 'Folded', 'Forsaken', 'Nameless', 'Distant', 'Sundered'];
  var EXPEDITION_NOUN = ['Meridian', 'Psalm', 'Passage', 'Ledger', 'Threshold', 'Witness', 'Reckoning', 'Interval', 'Atlas', 'Covenant', 'Vigil', 'Descent', 'Circuit', 'Remnant', 'Horizon', 'Archive'];
  var EXPEDITION_PATTERNS = [
    'The {adj} {noun}',
    '{noun} of the {adj} {worldWord}',
    'The {adj} {worldWord}',
    'Operation {adj} {noun}',
    'The {noun} of {place}',
    'Expedition to the {adj} {worldWord}',
    '{adj} {noun} // {place}'
  ];
  var WORLD_WORDS = {
    'cosmic-void': ['Void', 'Dark', 'Orbit', 'Starfall'],
    'sunken-cyber-grid': ['Grid', 'Vault', 'Flood', 'Circuit'],
    'ashen-kingdoms': ['Court', 'Barrow', 'Ash', 'Crown'],
    'forgotten-wastes': ['Waste', 'Dune', 'Salt', 'Expanse'],
    'hollow-dimension': ['Fold', 'Echo', 'Fracture', 'Interval'],
    'verdant-cataclysm': ['Bloom', 'Root', 'Canopy', 'Garden']
  };

  var SECTOR_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Z'];

  var DIFFICULTY_BANDS = [
    { key: 'forgiving', label: 'FORGIVING', min: 0, max: 40 },
    { key: 'temperate', label: 'TEMPERATE', min: 40, max: 55 },
    { key: 'hostile', label: 'HOSTILE', min: 55, max: 70 },
    { key: 'lethal', label: 'LETHAL', min: 70, max: 84 },
    { key: 'terminal', label: 'TERMINAL', min: 84, max: 101 }
  ];

  /* ------------------------------------------------------------------
     8. ROUTE GENERATION TABLES
     ------------------------------------------------------------------ */
  var ROUTE_DESIGNATIONS = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA'];
  var ROUTE_TERRAIN = ['Shelf Line', 'Trench Cut', 'Ridge Traverse', 'Sink Corridor', 'Span Crossing', 'Underpass', 'Drift Lane', 'Long Way Round', 'Direct Cut', 'Old Survey Line', 'Smuggler Path', 'Pilgrim Route'];

  /* ------------------------------------------------------------------
     9. LORE TEMPLATES
     ------------------------------------------------------------------ */
  var LORE = {
    intro: [
      'The Cartographer enters {sector} under {condition}. {hazard} readings are climbing, and the archive flags {hazard2} as a secondary concern that will not remain secondary for long.',
      'Expedition {num} opens on {world}. {condition} has degraded the sector map by an estimated {deg}%. Primary hazard: {hazard}.',
      'The threshold closes behind the Cartographer. {world} resolves around them — {condition}, and beneath it, {hazard} moving at the edge of detection.',
      'The archive accepts the jump. {sector} resolves in {condition}. The Cartographer registers {faction} activity within the outer markers and {hazard2} building to the west.'
    ],
    discovery: [
      'A sealed cache is found beneath a collapsed structure: {resources}.',
      'The survey sweep returns an anomaly. Excavation yields {resources} and a fragment of pre-collapse record.',
      'The Cartographer follows a signal to a dead relay and recovers {resources} from its housing.',
      'Something had already been here. It left {resources}, arranged with intent.'
    ],
    combatWin: [
      'The {enemy} breaks apart under sustained fire. The Cartographer sustains {damage} damage and recovers {loot}.',
      'Combat resolves in the Cartographer\'s favour after {rounds} rounds. The {enemy} is down. {loot} is salvaged from the wreck.',
      'The {enemy} is destroyed. Armour integrity holds at {integrity}%. {loot} recovered.'
    ],
    combatLoss: [
      'The {enemy} overwhelms the position. The Cartographer withdraws with {damage} damage and no salvage.',
      'The engagement turns. The Cartographer retreats from the {enemy}, losing {damage} integrity in the process.',
      'The {enemy} lands a critical sequence. The Cartographer disengages; the expedition survival score drops sharply.'
    ],
    rest: [
      'The Cartographer makes camp in the lee of {sector} and repairs what can be repaired.',
      'A rest cycle is logged. The suit is patched with scrap and the Cartographer sleeps in eleven-minute intervals.',
      'Camp is struck in a defended alcove. Rations are consumed; morale stabilises.'
    ],
    finalize: [
      'Expedition {num} closes. {world} keeps the rest.',
      'The Cartographer files the record and steps back through the threshold. The sector is marked as partially mapped.',
      'The archive accepts the final log for Expedition {num}. Survival score: {survival}%.'
    ]
  };

  WF.data = {
    RESOURCES: RESOURCES,
    RESOURCE_BY_ID: RESOURCE_BY_ID,
    RARITY: RARITY,
    CATEGORIES: CATEGORIES,
    CATEGORY_BY_ID: CATEGORY_BY_ID,
    WORLDS: WORLDS,
    WORLD_BY_ID: WORLD_BY_ID,
    ITEMS: ITEMS,
    ITEM_BY_ID: ITEM_BY_ID,
    COMPANIONS: COMPANIONS,
    COMPANION_BY_ID: COMPANION_BY_ID,
    BASE_CHARACTER: BASE_CHARACTER,
    SLOTS: SLOTS,
    ATTRIBUTES: ATTRIBUTES,
    EXPEDITION_ADJ: EXPEDITION_ADJ,
    EXPEDITION_NOUN: EXPEDITION_NOUN,
    EXPEDITION_PATTERNS: EXPEDITION_PATTERNS,
    WORLD_WORDS: WORLD_WORDS,
    SECTOR_LETTERS: SECTOR_LETTERS,
    DIFFICULTY_BANDS: DIFFICULTY_BANDS,
    ROUTE_DESIGNATIONS: ROUTE_DESIGNATIONS,
    ROUTE_TERRAIN: ROUTE_TERRAIN,
    LORE: LORE
  };
})(window.WF = window.WF || {});
