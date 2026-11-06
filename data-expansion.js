/* =====================================================================
   core/data-expansion.js — Phase 2 content pack
   Adds the unlockable First Continuum, world codex histories,
   achievements and mission vocabulary. Does not modify existing tables.
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data;

  /* ------------------------------------------------------------------
     UNLOCKABLE WORLD — The First Continuum
     ------------------------------------------------------------------ */
  var continuum = {
    id: 'first-continuum',
    name: 'The First Continuum',
    classification: 'Class Α — Pre-Collapse Continuum',
    tagline: 'The world before the collapse, still running its last second.',
    description: 'A preserved slice of the First Continuum, sealed against the collapse that ended everything else. Its streets are intact, its clocks are stopped, and its wardens have spent an age deciding whether you are contamination.',
    glyph: 'continuum',
    locked: true,
    unlockLevel: 8,
    palette: { a: '#e8b45a', b: '#3ff0d0', c: '#fff6e0' },
    hazards: [
      { name: 'Causal Echo', severity: 88, resistance: 'temporalRes', desc: 'Cause and effect arrive in the wrong order. Wounds appear before the blow.' },
      { name: 'Reality Lock', severity: 84, resistance: 'spatialRes', desc: 'A sealed version of space that refuses entry and exit.' },
      { name: 'Paradox Storm', severity: 90, resistance: 'temporalRes', desc: 'Contradictory futures discharge as heat and light.' },
      { name: 'Memory Flood', severity: 76, resistance: 'energy', desc: 'The Continuum remembers so hard that you begin to.' },
      { name: 'Time Shear', severity: 82, resistance: 'spatialRes', desc: 'A clean plane where one second passes on each side at different rates.' },
      { name: 'Unwritten Ground', severity: 78, resistance: 'radiationRes', desc: 'Terrain that was never committed to the archive and resents being walked.' }
    ],
    conditions: ['Causality unstable', 'Sealed sky', 'Clock silence', 'Golden particulate haze', 'Retrograde weather', 'Archived daylight', 'Zero decay', 'Continuum pressure'],
    factions: ['The First Survey', 'Continuum Wardens', 'The Unwritten', 'Witnesses of Before'],
    perks: [
      { name: 'Continuum Clearance', survival: 6, desc: 'The First Survey still honours your credentials, four centuries late.' },
      { name: 'Causal Anchor', survival: 5, desc: 'You can tell which consequence belongs to which cause.' },
      { name: 'Pre-Collapse Familiarity', survival: 4, desc: 'Doors, lifts and forms all work exactly as designed.' }
    ],
    penalties: [
      { name: 'Paradox Debt', survival: -7, desc: 'The Continuum keeps a ledger of every contradiction you introduce.' },
      { name: 'Warden Suspicion', survival: -5, desc: 'You register as an anomaly with a face.' },
      { name: 'Retroactive Damage', survival: -4, desc: 'Some injuries have been waiting for you since before you arrived.' }
    ],
    objectives: [
      { text: 'Enter the sealed archive beneath {place}', tag: 'Recovery' },
      { text: 'Identify the last recorded cause at {place}', tag: 'Investigation' },
      { text: 'Survive one causal loop at {place}', tag: 'Endurance' },
      { text: 'Convince the Wardens at {place} you are not contamination', tag: 'Diplomacy' },
      { text: 'Prevent the collapse from repeating at {place}', tag: 'Containment' }
    ],
    resources: ['quantumCrystals', 'relicFragments', 'ancientCircuits', 'voidEssence'],
    nameParts: {
      adj: ['First', 'Unbroken', 'Sealed', 'Golden', 'Retrograde', 'Unwritten', 'Witnessed', 'Causal'],
      noun: ['Continuum', 'Archive', 'Interval', 'First Street', 'Witness', 'Ledger', 'Second', 'Preserve'],
      place: ['the First Archive', 'the Sealed Quarter', 'the Last Second', 'the Witness Hall', 'Continuum Square']
    },
    enemies: [
      { name: 'Continuum Warden', class: 'Preservation Construct', tier: 4, health: 190, attack: 30, penetration: 52, adaptation: 60, ability: { name: 'Containment Seal', text: 'Locks the target in a single second.' }, loot: ['relicFragments', 'quantumCrystals'] },
      { name: 'Causal Auditor', class: 'Archive Intelligence', tier: 3, health: 140, attack: 27, penetration: 58, adaptation: 65, ability: { name: 'Ledger Adjustment', text: 'Retroactively adds damage that was already taken.' }, loot: ['ancientCircuits', 'relicFragments'] },
      { name: 'Unwritten', class: 'Erased Entity', tier: 4, health: 165, attack: 33, penetration: 64, adaptation: 55, ability: { name: 'Draft Removal', text: 'Attempts to remove the target from the record.' }, loot: ['voidEssence', 'quantumCrystals'] },
      { name: 'First-Survey Automaton', class: 'Pre-Collapse Machine', tier: 3, health: 150, attack: 25, penetration: 46, adaptation: 70, ability: { name: 'Protocol Stack', text: 'Executes an obsolete but effective combat doctrine.' }, loot: ['ancientCircuits', 'energyCells'] },
      { name: 'The Last Second', class: 'Temporal Apex', tier: 5, health: 320, attack: 44, penetration: 78, adaptation: 45, ability: { name: 'Hold', text: 'Freezes the encounter for one round and strikes twice.' }, loot: ['quantumCrystals', 'relicFragments'] }
    ],
    loreIntro: [
      'The Cartographer steps into a street that has not been touched by the collapse. The clocks read 04:11 and have always read 04:11.',
      'Everything here is intact: the windows, the lamps, the moment. The First Continuum survived by refusing to continue.',
      'A warden approaches. It has been approaching for four hundred years and arrives exactly on time.'
    ],
    routeWords: ['First Street', 'Causal Cut', 'Witness Walk', 'Sealed Line', 'Retrograde Path', 'Last Second']
  };
  if (!D.WORLD_BY_ID[continuum.id]) {
    D.WORLDS.push(continuum);
    D.WORLD_BY_ID[continuum.id] = continuum;
    D.WORLD_WORDS[continuum.id] = ['Continuum', 'Archive', 'Witness', 'Second'];
  }

  /* ------------------------------------------------------------------
     WORLD CODEX — encyclopedia entries
     ------------------------------------------------------------------ */
  var CODEX = {
    'cosmic-void': {
      era: 'Post-stellar',
      history: 'When the anchor stars failed, the systems that depended on them did not fall so much as unspool. The surviving orbitals became drift-arks, then wrecks, then rumours. What remains is a graveyard of gravity where the last observatories still transmit into nothing.',
      society: 'The Null Pilgrims walk between wrecks on tethered lines, trading air and orbital charts. The Hollow Choir sings to maintain the gravity wells; nobody is certain whether the wells require it.',
      ruins: 'Collapsed observatories, frozen orbitals, black-box beacons, and the deadlight shelves where star-metal can still be cut.',
      rumor: 'A compass that points to the last surviving version of reality is said to have been forged here before the Continuum broke.'
    },
    'sunken-cyber-grid': {
      era: 'Machine age',
      history: 'The grid was built as a single continuous city, then flooded when its cooling lattice failed. The municipality never received a stop order, so it kept running: transit, permits, court records, all underwater and entirely sincere.',
      society: 'The Submerged Directorate issues permits from a drowned office tower. The Hex-Kin salvage what the Directorate cannot reach, and the Nine-Loop Syndicate sells the difference between the two.',
      ruins: 'Data vaults, server seas, pressure transit spines, and residential stacks where the lights still cycle day and night.',
      rumor: 'Somewhere below the Western Data Vault is a backup of the city as it was before the water, and it is still accepting applications.'
    },
    'ashen-kingdoms': {
      era: 'Feudal collapse',
      history: 'The kingdoms burned each other down and then refused to leave. The ash never settled because the fires never fully went out. Succession is still disputed, largely by the dead.',
      society: 'The Pale Court maintains protocol; the Blackroot Covenant maintains the wood; the Ash Legion maintains the muster. All three consider the others illegitimate.',
      ruins: 'Barrow fields, cathedrals with their bells intact, blackroot forests growing through throne rooms, and keeps whose ward-seals are still holding.',
      rumor: 'The crown-ledger names every ruler who ever held the throne, including the ones who have not been born yet.'
    },
    'forgotten-wastes': {
      era: 'Industrial collapse',
      history: 'A continental reactor network failed in sequence. The evacuation was ordered, then countermanded, then forgotten. Whole cities were buried by the sand before anyone could decide whether to save them.',
      society: 'The Rustborn Clans hold the salvage routes; the Salt Dukes hold the water; the Long Walkers hold nothing and keep moving. The Carrion Court arbitrates disputes over the dead.',
      ruins: 'Glass basins, buried arcologies, rustbelt refineries, and the salt roads that predate every surviving clan.',
      rumor: 'The glass prophet was made, not born, in a reactor control room and has been predicting the same sandstorm for thirty years.'
    },
    'hollow-dimension': {
      era: 'Achronal',
      history: 'This is not a place that experienced a collapse. It is the shape left behind when reality was removed. The Hollow Dimension repeats fragments of elsewhere, including fragments that have not happened.',
      society: 'The Unmade collect identities; the Fragment Collectors collect objects; the Backward Order walks against time and considers this polite. The Hollow Witnesses only observe, which is worse.',
      ruins: 'Folded halls, two rooms occupying one coordinate, doors that open onto their own thresholds, and camps that appear to have been left by the Cartographer.',
      rumor: 'Every Cartographer who enters is issued a previous log in their own handwriting. The archive denies this.'
    },
    'verdant-cataclysm': {
      era: 'Bio-industrial',
      history: 'A biological remediation programme was deployed to reclaim polluted cities. It succeeded beyond specification. The growth consumed the infrastructure, then the population, then the concept of a city.',
      society: 'The Green Choir speaks for the canopy; the Rootbound Order grafts; the Bloom Cult worships the growth; the Undermoss lives beneath it and trades in seeds and silence.',
      ruins: 'Root cathedrals, overgrown transit decks, bio-labs sealed under living wood, and planter-drone caches still tending empty beds.',
      rumor: 'The first strain was designed to keep a garden alive. It is still following that instruction, and you are part of the garden.'
    },
    'first-continuum': {
      era: 'Pre-collapse',
      history: 'The First Continuum is the world that existed before the collapse, preserved in a single stopped second. It is not a ruin and not a memory. It is a sealed original, and the collapse happened outside it.',
      society: 'The First Survey still expects the collapse to be a paperwork error. The Continuum Wardens preserve the seal. The Unwritten were erased from the record and have not accepted it.',
      ruins: 'The First Archive, the Sealed Quarter, the Witness Hall, and streets that have never weathered.',
      rumor: 'The Continuum did not survive the collapse. It declined to participate.'
    }
  };

  /* ------------------------------------------------------------------
     ACHIEVEMENTS
     ------------------------------------------------------------------ */
  var ACHIEVEMENTS = [
    { id: 'first_step', name: 'First Step', tier: 'bronze', xp: 40, desc: 'Archive your first expedition.', check: function (st) { return st.expeditions >= 1; } },
    { id: 'field_survivor', name: 'Field Survivor', tier: 'bronze', xp: 60, desc: 'Complete an expedition with a survival score of 70% or better.', check: function (st) { return st.bestSurvival >= 70; } },
    { id: 'void_walker', name: 'Void Walker', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Cosmic Void.', check: function (st) { return !!st.worldsVisited['cosmic-void']; } },
    { id: 'deep_diver', name: 'Deep Diver', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Sunken Cyber-Grid.', check: function (st) { return !!st.worldsVisited['sunken-cyber-grid']; } },
    { id: 'crownless', name: 'Crownless', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Ashen Kingdoms.', check: function (st) { return !!st.worldsVisited['ashen-kingdoms']; } },
    { id: 'salt_road', name: 'Salt Road', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Forgotten Wastes.', check: function (st) { return !!st.worldsVisited['forgotten-wastes']; } },
    { id: 'unmoored', name: 'Unmoored', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Hollow Dimension.', check: function (st) { return !!st.worldsVisited['hollow-dimension']; } },
    { id: 'green_thumb', name: 'Green Thumb', tier: 'bronze', xp: 70, desc: 'Chart a sector in the Verdant Cataclysm.', check: function (st) { return !!st.worldsVisited['verdant-cataclysm']; } },
    { id: 'collector', name: 'Relic Collector', tier: 'silver', xp: 120, desc: 'Recover 10 relics or artifacts.', check: function (st) { return st.relicsRecovered >= 10; } },
    { id: 'slayer', name: 'Slayer', tier: 'silver', xp: 120, desc: 'Win 10 combat encounters.', check: function (st) { return st.victories >= 10; } },
    { id: 'questmaster', name: 'Questmaster', tier: 'silver', xp: 150, desc: 'Complete 10 missions.', check: function (st) { return st.missionsComplete >= 10; } },
    { id: 'veteran', name: 'Veteran Cartographer', tier: 'silver', xp: 150, desc: 'Archive 10 expeditions.', check: function (st) { return st.expeditions >= 10; } },
    { id: 'bonded', name: 'Bonded', tier: 'silver', xp: 120, desc: 'Raise a companion to level 3.', check: function (st, p) { return Object.keys(p.companions || {}).some(function (k) { return p.companions[k].level >= 3; }); } },
    { id: 'all_worlds', name: 'The Long Map', tier: 'gold', xp: 300, desc: 'Chart a sector in all six base worlds.', check: function (st) {
      return ['cosmic-void', 'sunken-cyber-grid', 'ashen-kingdoms', 'forgotten-wastes', 'hollow-dimension', 'verdant-cataclysm'].every(function (w) { return !!st.worldsVisited[w]; });
    } },
    { id: 'iron_will', name: 'Iron Will', tier: 'gold', xp: 200, desc: 'Complete an expedition at 20% integrity or below.', check: function (st) { return st.lowestConditionComplete <= 20 && st.lowestConditionComplete >= 0; } },
    { id: 'flawless', name: 'Flawless Chart', tier: 'gold', xp: 250, desc: 'Complete an expedition at 90%+ integrity with 80%+ survival.', check: function (st) { return st.flawlessRuns >= 1; } },
    { id: 'archivist', name: 'Archivist', tier: 'gold', xp: 200, desc: 'Hold 60 archive entries at once.', check: function (st) { return st.archivePeak >= 60; } },
    { id: 'centurion', name: 'Centurion', tier: 'gold', xp: 250, desc: 'Reach Cartographer level 10.', check: function (st, p) { return p.level >= 10; } },
    { id: 'continuum', name: 'The Original', tier: 'mythic', xp: 500, desc: 'Unlock and chart the First Continuum.', check: function (st) { return !!st.worldsVisited['first-continuum']; } },
    { id: 'continuum_master', name: 'Keeper of the Last Map', tier: 'mythic', xp: 800, desc: 'Reach Cartographer level 20.', check: function (st, p) { return p.level >= 20; } }
  ];

  var TIERS = {
    bronze: { label: 'BRONZE', color: '#c07b4a' },
    silver: { label: 'SILVER', color: '#a9b6c3' },
    gold: { label: 'GOLD', color: '#d8a85a' },
    mythic: { label: 'MYTHIC', color: '#b98bff' }
  };

  var TITLES = [
    { level: 1, title: 'Wayfinder' },
    { level: 3, title: 'Pathfinder' },
    { level: 5, title: 'Horizon-Chaser' },
    { level: 8, title: 'Continuum Adept' },
    { level: 12, title: 'Arch-Cartographer' },
    { level: 16, title: 'Surveyor of the Unmade' },
    { level: 20, title: 'Keeper of the Last Map' }
  ];

  var MISSION_TEMPLATES = [
    { type: 'exploration', title: 'Sweep {sector}', desc: 'Run a full survey sweep of {sector} and log the returns.', stages: [{ event: 'survey', target: 2, label: 'Survey sweeps' }], reward: { xp: 70 } },
    { type: 'relic', title: 'Recover the anomaly', desc: 'A buried object is broadcasting from beneath {sector}. Recover it.', stages: [{ event: 'scan', target: 1, label: 'Deep scans' }], reward: { xp: 90 } },
    { type: 'resource', title: 'Provision the archive', desc: 'Gather {amount} units of {resource} before the horizon turns.', stages: [{ event: 'resource', resource: '{resourceId}', target: 8, label: 'Units gathered' }], reward: { xp: 80 } },
    { type: 'survival', title: 'Hold the line', desc: 'Finish the expedition with integrity at {threshold}% or better.', stages: [{ event: 'finalize', condition: 'integrity', target: '{threshold}', label: 'Integrity at close' }], reward: { xp: 110 } },
    { type: 'faction', title: 'Break the {faction}', desc: 'Destroy two hostiles bearing {faction} markings.', stages: [{ event: 'combat', target: 2, label: 'Hostiles destroyed', require: 'victory' }], reward: { xp: 120 } },
    { type: 'companion', title: 'Sync protocol', desc: 'Keep {companion} online while completing two field actions.', stages: [{ event: 'action', target: 2, label: 'Field actions with companion' }], reward: { xp: 90 } },
    { type: 'primary', title: 'Primary objective: {objective}', desc: 'Complete the assigned primary objective in {sector}.', stages: [{ event: 'any', target: 3, label: 'Objective progress' }], reward: { xp: 130 } }
  ];

  D.CODEX = CODEX;
  D.ACHIEVEMENTS = ACHIEVEMENTS;
  D.ACHIEVEMENT_TIERS = TIERS;
  D.TITLES = TITLES;
  D.MISSION_TEMPLATES = MISSION_TEMPLATES;
  D.UNLOCKABLE_WORLDS = D.WORLDS.filter(function (w) { return w.locked; }).map(function (w) { return w.id; });

  /* generator helper: only base worlds unless unlocks supplied */
  D.availableWorlds = function (unlocked) {
    return D.WORLDS.filter(function (w) {
      if (!w.locked) return true;
      return unlocked && unlocked.indexOf(w.id) >= 0;
    });
  };
})(window.WF = window.WF || {});
