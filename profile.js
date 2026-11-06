/* =====================================================================
   core/profile.js — persistent Cartographer identity & progression
   Permanent data lives in state.profile and survives every expedition.
   Expedition state (condition, quests, routes, logs) stays separate.
   Exposes: WF.profile
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var DEFAULT_STATS = {
    expeditions: 0,
    completed: 0,
    partial: 0,
    lost: 0,
    bestSurvival: 0,
    survivalSum: 0,
    damageTaken: 0,
    resourcesCollected: 0,
    relicsRecovered: 0,
    combats: 0,
    victories: 0,
    missionsComplete: 0,
    missionsFailed: 0,
    fieldActions: 0,
    routesTaken: 0,
    lowestConditionComplete: -1,
    flawlessRuns: 0,
    archivePeak: 0,
    worldsVisited: {},
    firstPlayed: 0,
    lastPlayed: 0
  };

  function defaultProfile() {
    return {
      id: 'cart_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      callsign: 'THE CARTOGRAPHER',
      createdAt: Date.now(),
      level: 1,
      xp: 0,
      xpTotal: 0,
      stats: JSON.parse(JSON.stringify(DEFAULT_STATS)),
      achievements: {},
      discoveredWorlds: {},
      discoveredSectors: {},
      relicCollection: {},
      companions: {},
      unlockedWorlds: D.WORLDS.filter(function (w) { return w.locked; }).map(function (w) { return w.id; }).filter(function () { return false; }),
      titles: ['Wayfinder'],
      settings: { ai: { enabled: false, endpoint: '' } },
      notes: ''
    };
  }

  function ensure(state) {
    if (!state.profile) state.profile = defaultProfile();
    var p = state.profile;
    var d = defaultProfile();
    Object.keys(d).forEach(function (k) { if (p[k] === undefined) p[k] = d[k]; });
    Object.keys(DEFAULT_STATS).forEach(function (k) {
      if (p.stats[k] === undefined) p.stats[k] = DEFAULT_STATS[k];
    });
    if (!p.stats.worldsVisited) p.stats.worldsVisited = {};
    if (!p.achievements) p.achievements = {};
    if (!p.discoveredWorlds) p.discoveredWorlds = {};
    if (!p.discoveredSectors) p.discoveredSectors = {};
    if (!p.relicCollection) p.relicCollection = {};
    if (!p.companions) p.companions = {};
    if (!p.settings) p.settings = { ai: { enabled: false, endpoint: '' } };
    if (!p.settings.ai) p.settings.ai = { enabled: false, endpoint: '' };
    if (!p.titles) p.titles = ['Wayfinder'];
    p.stats.firstPlayed = p.stats.firstPlayed || Date.now();
    // unlock worlds earned by level
    unlockWorlds(state, true);
    return p;
  }

  function xpToNext(level) { return 120 + (level - 1) * 90; }

  function levelTitle(level) {
    var title = 'Wayfinder';
    D.TITLES.forEach(function (t) { if (level >= t.level) title = t.title; });
    return title;
  }

  function addXp(state, amount, reason) {
    var p = ensure(state);
    amount = Math.max(0, Math.round(amount || 0));
    if (!amount) return { gained: 0, leveled: false, level: p.level };
    p.xp += amount;
    p.xpTotal += amount;
    p.stats.lastPlayed = Date.now();
    var leveled = false, levelsGained = 0;
    while (p.xp >= xpToNext(p.level) && p.level < 99) {
      p.xp -= xpToNext(p.level);
      p.level += 1;
      leveled = true;
      levelsGained++;
      p.stats.archivePeak = Math.max(p.stats.archivePeak, (state.archive || []).length);
      unlockWorlds(state, false);
    }
    if (leveled) {
      var title = levelTitle(p.level);
      if (p.titles.indexOf(title) < 0) p.titles.push(title);
      if (state.log) {
        WF.engine && WF.engine.log ? WF.engine.log(state, {
          type: 'system',
          text: 'CARTOGRAPHER ADVANCEMENT — level ' + p.level + ' reached. Title conferred: ' + title + '.',
          short: 'LEVEL ' + p.level
        }) : null;
      }
    }
    return { gained: amount, leveled: leveled, level: p.level, levelsGained: levelsGained, reason: reason || '' };
  }

  function unlockWorlds(state, silent) {
    var p = state.profile;
    if (!p) return [];
    var unlocked = [];
    D.WORLDS.forEach(function (w) {
      if (!w.locked) return;
      if (p.unlockedWorlds.indexOf(w.id) >= 0) return;
      if (p.level >= w.unlockLevel || (p.stats.worldsVisited && p.stats.worldsVisited[w.id])) {
        p.unlockedWorlds.push(w.id);
        unlocked.push(w);
      }
    });
    return unlocked;
  }

  function isWorldUnlocked(state, worldId) {
    var w = D.WORLD_BY_ID[worldId];
    if (!w) return false;
    if (!w.locked) return true;
    if (!state.profile) return false;
    return state.profile.unlockedWorlds.indexOf(worldId) >= 0;
  }

  /* ---------------- world / sector / relic discovery ---------------- */

  function recordWorld(state, exp) {
    var p = ensure(state);
    var first = !p.discoveredWorlds[exp.worldId];
    if (first) {
      p.discoveredWorlds[exp.worldId] = {
        firstAt: Date.now(),
        name: exp.worldName,
        classification: exp.classification
      };
      p.stats.worldsVisited[exp.worldId] = true;
    }
    var w = p.discoveredWorlds[exp.worldId];
    w.expeditions = (w.expeditions || 0) + 1;
    w.bestSurvival = Math.max(w.bestSurvival || 0, exp.survivalBase || 0);
    return first;
  }

  function recordSector(state, exp) {
    var p = ensure(state);
    var key = exp.worldId + '::' + exp.sector;
    var first = !p.discoveredSectors[key];
    if (first) {
      p.discoveredSectors[key] = {
        sector: exp.sector,
        worldId: exp.worldId,
        worldName: exp.worldName,
        coords: exp.coords,
        depth: exp.depth,
        firstAt: Date.now(),
        expeditions: 0,
        bestSurvival: 0,
        seed: exp.seed,
        number: exp.number,
        lastAt: Date.now()
      };
    }
    var s = p.discoveredSectors[key];
    s.expeditions += 1;
    s.bestSurvival = Math.max(s.bestSurvival, exp.survivalBase || 0);
    s.seed = exp.seed;
    s.number = exp.number;
    s.lastAt = Date.now();
    return first;
  }

  function recordRelic(state, item) {
    if (!item || (item.category !== 'relic' && item.category !== 'artifact')) return false;
    var p = ensure(state);
    var first = !p.relicCollection[item.id];
    if (first) {
      p.relicCollection[item.id] = {
        name: item.name,
        rarity: item.rarity,
        classification: item.classification,
        firstAt: Date.now()
      };
      p.stats.relicsRecovered += 1;
    }
    return first;
  }

  function recordResourceGain(state, amount) {
    var p = ensure(state);
    p.stats.resourcesCollected += Math.max(0, amount || 0);
  }

  function recordCombat(state, result) {
    var p = ensure(state);
    p.stats.combats += 1;
    if (result && result.outcome === 'victory') p.stats.victories += 1;
    if (result && result.damageSustained) p.stats.damageTaken += result.damageSustained;
  }

  /** Called once per archived expedition. */
  function recordExpedition(state, record) {
    var p = ensure(state);
    var st = p.stats;
    st.expeditions += 1;
    st.survivalSum += record.survival || 0;
    st.bestSurvival = Math.max(st.bestSurvival, record.survival || 0);
    st.missionsComplete += (record.missions || []).filter(function (m) { return m.status === 'complete'; }).length;
    st.missionsFailed += (record.missions || []).filter(function (m) { return m.status === 'failed'; }).length;
    if (record.outcome === 'complete') st.completed += 1;
    else if (record.outcome === 'lost') st.lost += 1;
    else st.partial += 1;

    if (record.outcome !== 'lost' && record.integrity < 40) {
      st.lowestConditionComplete = st.lowestConditionComplete < 0
        ? record.integrity : Math.min(st.lowestConditionComplete, record.integrity);
    }
    if (record.outcome === 'complete' && record.integrity >= 90 && (record.survival || 0) >= 80) {
      st.flawlessRuns += 1;
    }
    st.archivePeak = Math.max(st.archivePeak, (state.archive || []).length);
    st.lastPlayed = Date.now();

    var wid = record.worldId || record.primaryWorldId;
    if (wid) recordWorld(state, { worldId: wid, worldName: record.worldName, classification: record.classification, survivalBase: record.survival });
    return checkAchievements(state);
  }

  /* ---------------- companions ---------------- */

  function companionStanding(state, id) {
    var p = ensure(state);
    if (!p.companions[id]) {
      p.companions[id] = { xp: 0, level: 1, missions: 0, affinity: 0, firstSync: Date.now() };
    }
    return p.companions[id];
  }

  function companionXp(state, id, amount) {
    if (!id) return null;
    var p = ensure(state);
    var c = companionStanding(state, id);
    c.xp += Math.max(0, amount || 0);
    c.missions += 1;
    c.affinity = U.clamp(c.affinity + 1, 0, 100);
    var leveled = false;
    while (c.xp >= 80 * c.level) {
      c.xp -= 80 * c.level;
      c.level += 1;
      leveled = true;
    }
    return { level: c.level, leveled: leveled, xp: c.xp };
  }

  function companionLevel(state, id, baseLevel) {
    var c = ensure(state).companions[id];
    return (baseLevel || 1) + (c ? c.level - 1 : 0);
  }

  /* ---------------- achievements ---------------- */

  function checkAchievements(state) {
    var p = ensure(state);
    var unlocked = [];
    D.ACHIEVEMENTS.forEach(function (a) {
      if (p.achievements[a.id]) return;
      if (a.check(p.stats, p)) {
        p.achievements[a.id] = { unlockedAt: Date.now(), name: a.name, tier: a.tier };
        unlocked.push(a);
        addXp(state, a.xp, 'achievement:' + a.id);
      }
    });
    return unlocked;
  }

  function achievementList(state) {
    var p = ensure(state);
    return D.ACHIEVEMENTS.map(function (a) {
      return {
        id: a.id, name: a.name, desc: a.desc, tier: a.tier, xp: a.xp,
        unlocked: !!p.achievements[a.id],
        unlockedAt: p.achievements[a.id] ? p.achievements[a.id].unlockedAt : null
      };
    });
  }

  /* ---------------- misc ---------------- */

  function progressPct(state) {
    var p = ensure(state);
    return Math.round((p.xp / xpToNext(p.level)) * 100);
  }

  function rename(state, callsign) {
    var p = ensure(state);
    var clean = String(callsign || '').replace(/[<>]/g, '').trim().slice(0, 24);
    if (clean.length < 2) return { ok: false, message: 'Callsign must be at least 2 characters.' };
    p.callsign = clean.toUpperCase();
    return { ok: true, message: 'Callsign updated: ' + p.callsign };
  }

  function summary(state) {
    var p = ensure(state);
    return {
      callsign: p.callsign,
      level: p.level,
      xp: p.xp,
      xpToNext: xpToNext(p.level),
      xpTotal: p.xpTotal,
      title: levelTitle(p.level),
      progressPct: progressPct(state),
      achievements: Object.keys(p.achievements).length,
      achievementTotal: D.ACHIEVEMENTS.length,
      worlds: Object.keys(p.discoveredWorlds).length,
      sectors: Object.keys(p.discoveredSectors).length,
      relics: Object.keys(p.relicCollection).length,
      unlockedWorlds: p.unlockedWorlds.slice(),
      stats: p.stats
    };
  }

  WF.profile = {
    defaultProfile: defaultProfile,
    ensure: ensure,
    addXp: addXp,
    xpToNext: xpToNext,
    levelTitle: levelTitle,
    unlockWorlds: unlockWorlds,
    isWorldUnlocked: isWorldUnlocked,
    recordWorld: recordWorld,
    recordSector: recordSector,
    recordRelic: recordRelic,
    recordResourceGain: recordResourceGain,
    recordCombat: recordCombat,
    recordExpedition: recordExpedition,
    companionStanding: companionStanding,
    companionXp: companionXp,
    companionLevel: companionLevel,
    checkAchievements: checkAchievements,
    achievementList: achievementList,
    progressPct: progressPct,
    rename: rename,
    summary: summary
  };
})(window.WF = window.WF || {});
