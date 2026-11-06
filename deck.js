/* =====================================================================
   ui/deck.js — Phase 2 command views
   Mission Control · World Codex · Cartographer Progression · Data Vault
   Exposes: WF.deck (renderers used by WF.ui.render)
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util, A = WF.art;
  var deck = WF.deck = {};
  var ui = WF.ui;

  function state() { return ui.state; }
  function h() { return ui.helpers; }

  function dateStr(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16);
  }

  function tagTier(tier) {
    var t = D.ACHIEVEMENT_TIERS[tier] || { label: tier, color: '#8a97a3' };
    return '<span class="tier-tag" style="color:' + t.color + ';border-color:' + t.color + '55;background:' + t.color + '11">' + t.label + '</span>';
  }

  /* ==================================================================
     NAV
     ================================================================== */

  var VIEWS = [
    { id: 'survival', label: 'Survival Deck', glyph: '◈' },
    { id: 'missions', label: 'Mission Control', glyph: '⌖' },
    { id: 'progression', label: 'Cartographer', glyph: '✦' },
    { id: 'codex', label: 'World Codex', glyph: '⌘' },
    { id: 'vault', label: 'Data Vault', glyph: '⌸' }
  ];

  deck.VIEWS = VIEWS;

  deck.renderNav = function () {
    var s = state();
    var active = s.ui.view || 'survival';
    var summary = WF.profile.summary(s);
    var quests = WF.quests.counts(s);
    var mig = s.__migrated;
    return '<nav class="view-nav" aria-label="Command views">' +
      '<div class="view-nav-brand"><span class="mini-mark">✦</span><span class="mono-label">ARCHIVE DECK</span></div>' +
      VIEWS.map(function (v) {
        var badge = '';
        if (v.id === 'missions' && quests.active) badge = '<span class="nav-badge">' + quests.active + '</span>';
        if (v.id === 'progression') badge = '<span class="nav-badge level">' + summary.level + '</span>';
        return '<button class="nav-btn ' + (active === v.id ? 'active' : '') + '" data-action="set-view" data-view="' + v.id + '">' +
          '<span class="nav-glyph">' + v.glyph + '</span>' + v.label + badge + '</button>';
      }).join('') +
      (mig ? '<span class="nav-migrated" title="Legacy v2 data migrated">MIGRATED v2→v3</span>' : '') +
      '</nav>';
  };

  /* ==================================================================
     MISSION CONTROL
     ================================================================== */

  deck.renderMissions = function () {
    var s = state();
    var exp = s.expedition;
    var quests = WF.quests.ensure(s);
    var counts = WF.quests.counts(s);
    var summary = WF.profile.summary(s);
    var narratives = (s.narratives || []).slice(0, 6);

    var cards = quests.map(function (q) {
      var hidden = q.hidden && !q.revealed;
      var totalProgress = q.stages.reduce(function (n, st) { return n + Math.min(1, st.progress / st.target); }, 0) / Math.max(1, q.stages.length);
      var statusCls = q.status === 'complete' ? 'done' : q.status === 'failed' ? 'failed' : '';
      var stages = q.stages.map(function (st) {
        var pct = U.clamp((st.progress / st.target) * 100, 0, 100);
        return '<div class="quest-stage">' +
          '<div class="row" style="justify-content:space-between"><span class="help-line">' + U.esc(st.label) + '</span>' +
          '<span class="mono-label">' + U.round(Math.min(st.progress, st.target), 1) + ' / ' + st.target + '</span></div>' +
          '<div style="margin-top:5px">' + h().bar(pct, st.done ? '' : 'warn') + '</div></div>';
      }).join('');

      if (hidden) {
        return '<div class="quest-card hiddenq">' +
          '<div class="quest-head"><span class="quest-kind hidden">HIDDEN</span>' +
          '<span class="quest-title">UNKNOWN SIGNAL</span><span class="quest-status">UNREVEALED</span></div>' +
          '<div class="quest-desc">A buried transmission is present in this sector. Run a Deep Scan to reveal the objective. Reward class: unassessed.</div>' +
          '<div class="help-line" style="margin-top:10px">▸ Deep Scan to reveal</div></div>';
      }

      return '<div class="quest-card ' + statusCls + '">' +
        '<div class="quest-head"><span class="quest-kind ' + q.kind + '">' + q.label + '</span>' +
        '<span class="quest-title">' + U.esc(q.title) + '</span>' +
        '<span class="quest-status ' + statusCls + '">' + q.status.toUpperCase() + '</span></div>' +
        '<div class="quest-desc">' + U.esc(q.desc) + '</div>' +
        (q.faction ? '<div class="help-line" style="margin-top:6px">FACTION: ' + U.esc(q.faction) + '</div>' : '') +
        '<div class="quest-stages">' + stages + '</div>' +
        '<div class="quest-foot">' +
        '<span class="tag gold">' + (q.rewards.xp || 0) + ' XP</span>' +
        (q.rewards.resources || []).map(function (r) { return '<span class="tag teal">' + r.qty + '× ' + U.esc(r.name) + '</span>'; }).join('') +
        (q.companionId ? '<span class="tag">COMPANION: ' + U.esc(q.companionId.toUpperCase()) + '</span>' : '') +
        '<span class="quest-overall"><i style="width:' + Math.round(totalProgress * 100) + '%"></i></span>' +
        '</div></div>';
    }).join('') || '<div class="empty">No active mission board. Reroll the horizon to generate assignments.</div>';

    var history = (s.questHistory || []).slice(0, 24).map(function (q) {
      return '<div class="mission-history ' + q.status + '">' +
        '<div class="row" style="justify-content:space-between;gap:8px">' +
        '<span class="quest-kind ' + q.kind + '" style="font-size:7px">' + q.label + '</span>' +
        '<span class="mono-label" style="margin-left:auto">EXP ' + U.pad(q.expeditionNumber, 3) + '</span></div>' +
        '<div class="mh-title">' + U.esc(q.title) + '</div>' +
        '<div class="help-line">' + U.esc(q.worldName) + ' · ' + (q.status === 'complete' ? 'COMPLETE' : 'FAILED') +
        (q.failReason ? ' — ' + U.esc(q.failReason) : '') + '</div></div>';
    }).join('') || '<div class="empty">No archived missions yet. Complete or close an expedition.</div>';

    var feed = narratives.map(function (n) {
      return '<div class="narrative-entry">' +
        '<div class="row" style="justify-content:space-between"><span class="mono-label" style="color:var(--gold-dim)">' +
        U.esc(n.kind.toUpperCase()) + '</span><span class="tag ' + (n.source === 'ai' ? 'teal' : '') + '">' + (n.source === 'ai' ? 'AI' : 'ARCHIVE TEMPLATE') + '</span></div>' +
        '<div class="narrative-text">' + U.esc(n.text) + '</div>' +
        '<div class="help-line" style="margin-top:4px">' + dateStr(n.at) + '</div></div>';
    }).join('') || '<div class="help-line">No narrative dispatches yet. Generate one from the panel on the right.</div>';

    return '<section class="panel deck-panel" id="missionsPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> Mission Control <span class="idx">/ ' + exp.sector + '</span></div>' +
      '<span class="meta-label" style="margin:0">' + counts.active + ' ACTIVE · ' + counts.complete + ' COMPLETE · ' + counts.failed + ' FAILED</span></div>' +
      '<div class="panel-body">' +
      '<div class="deck-stats">' +
      h().stat('Active Assignments', counts.active, 'teal') +
      h().stat('Board Size', counts.total) +
      h().stat('Missions Completed', summary.stats.missionsComplete, 'gold') +
      h().stat('Missions Failed', summary.stats.missionsFailed, 'neg') +
      h().stat('Cartographer Level', summary.level, 'gold') +
      h().stat('Unclaimed XP (board)', quests.filter(function (q) { return q.status === 'active'; }).reduce(function (n, q) { return n + (q.rewards.xp || 0); }, 0) + ' XP') +
      '</div>' +
      '<div class="deck-grid wide-left">' +
      '<div><div class="section-label" style="margin-top:4px">ACTIVE MISSION BOARD</div>' +
      '<div class="quest-list">' + cards + '</div>' +
      '<div class="section-label">MISSION HISTORY · PERMANENT</div>' +
      '<div class="mission-history-grid">' + history + '</div></div>' +
      '<div><div class="section-label" style="margin-top:4px">AI CARTOGRAPHER · NARRATIVE DISPATCH</div>' +
      '<div class="panel-inner">' +
      '<div class="help-line">Narrative only. Mechanics, rewards and combat remain deterministic and are never modified by the narrative layer.</div>' +
      '<div class="row wrap" style="gap:6px;margin-top:10px">' +
      ['intro', 'faction', 'mission', 'companion', 'event', 'enemy'].map(function (k) {
        return '<button class="btn sm" data-action="ai-generate" data-kind="' + k + '">' + U.titleCase(k) + '</button>';
      }).join('') +
      '</div>' +
      '<div class="row" style="justify-content:space-between;margin-top:9px">' +
      '<span class="help-line">' + (WF.ai.configured(s) ? 'AI endpoint configured' : 'Offline template engine') + '</span>' +
      '<button class="btn sm" data-action="set-view" data-view="vault">Configure</button></div>' +
      '</div>' +
      '<div class="narrative-feed">' + feed + '</div>' +
      '<div class="section-label">BOARD LEGEND</div>' +
      '<div class="help-line">' +
      'PRIMARY — must be resolved before the archive closes the expedition.<br>' +
      'SECONDARY — optional, paid on completion.<br>' +
      'HIDDEN — revealed by a Deep Scan.<br>' +
      'RESOURCE / FACTION / COMPANION — tracked from real field actions.<br>' +
      'Failure is recorded permanently and affects Cartographer statistics.' +
      '</div></div>' +
      '</div></div></section>';
  };

  /* ==================================================================
     PROGRESSION
     ================================================================== */

  deck.renderProgression = function () {
    var s = state();
    var p = WF.profile.ensure(s);
    var sum = WF.profile.summary(s);
    var achievements = WF.profile.achievementList(s);
    var roster = WF.companions.roster(s);
    var history = (s.history || []).slice(0, 12);
    var unlocked = achievements.filter(function (a) { return a.unlocked; }).length;

    var xpPct = sum.progressPct;

    var achCards = achievements.map(function (a) {
      return '<div class="ach-card ' + (a.unlocked ? 'unlocked' : 'locked') + '" title="' + U.esc(a.desc) + '">' +
        '<div class="row" style="justify-content:space-between">' + tagTier(a.tier) +
        '<span class="ach-xp">' + a.xp + ' XP</span></div>' +
        '<div class="ach-name">' + U.esc(a.name) + '</div>' +
        '<div class="ach-desc">' + U.esc(a.desc) + '</div>' +
        '<div class="ach-state">' + (a.unlocked ? '▣ EARNED ' + dateStr(a.unlockedAt).slice(0, 10) : '▢ LOCKED') + '</div>' +
        '</div>';
    }).join('');

    var compCards = roster.map(function (c) {
      var stand = WF.profile.companionStanding(s, c.id);
      var needed = 80 * stand.level;
      var pct = U.clamp((stand.xp / needed) * 100, 0, 100);
      return '<div class="dev-card ' + (c.active ? 'active' : '') + '">' +
        '<div class="row" style="justify-content:space-between"><span class="comp-name">' + U.esc(c.name) + '</span>' +
        '<span class="tag ' + (c.active ? 'teal' : '') + '">' + (c.active ? 'ACTIVE' : 'STANDBY') + '</span></div>' +
        '<div class="help-line">' + U.esc(c.role) + ' · LEVEL ' + c.level + '</div>' +
        '<div style="margin-top:7px">' + h().bar(pct) + '</div>' +
        '<div class="row" style="justify-content:space-between;margin-top:4px"><span class="help-line">' + stand.xp + ' / ' + needed + ' XP</span>' +
        '<span class="help-line">AFFINITY ' + stand.affinity + '</span></div>' +
        '<div class="help-line" style="margin-top:6px">' + U.esc(c.ability.name || '') + '</div>' +
        '<div class="row" style="margin-top:8px">' +
        '<button class="btn sm" data-action="activate-companion" data-id="' + c.id + '">' + (c.active ? 'Stand Down' : 'Deploy') + '</button>' +
        '<span class="help-line">' + (c.compatible ? 'COMPATIBLE' : 'OFF-WORLD') + '</span></div>' +
        '</div>';
    }).join('');

    var worldRows = D.WORLDS.map(function (w) {
      var disc = p.discoveredWorlds[w.id];
      var visited = !!disc;
      var locked = w.locked && p.unlockedWorlds.indexOf(w.id) < 0;
      return '<div class="world-row ' + (visited ? 'visited' : '') + '">' +
        '<span class="world-glyph" style="color:' + (w.palette ? w.palette.a : 'var(--teal)') + '">' + (visited ? '◆' : locked ? '⊘' : '◇') + '</span>' +
        '<div class="grow"><div class="world-row-name">' + U.esc(w.name) + (locked ? ' <span class="tag bad" style="font-size:7px">LOCKED</span>' : '') + '</div>' +
        '<div class="help-line">' + (visited ? (disc.expeditions || 0) + ' expeditions · best ' + (disc.bestSurvival || 0) + '%' : locked ? 'Reach Cartographer level ' + w.unlockLevel : 'Undiscovered') + '</div></div>' +
        '<button class="btn sm" data-action="set-codex" data-world="' + w.id + '">Codex</button>' +
        '</div>';
    }).join('');

    var timeline = history.map(function (r) {
      return '<div class="timeline-row">' +
        '<div class="timeline-dot ' + (r.outcome === 'lost' ? 'loss' : r.outcome === 'complete' ? 'win' : '') + '"></div>' +
        '<div class="grow"><div class="row" style="justify-content:space-between;gap:8px">' +
        '<span class="log-no">EXP ' + U.pad(r.number, 3) + '</span>' +
        '<span class="mono-label">' + dateStr(r.date).slice(0, 10) + '</span></div>' +
        '<div class="timeline-title">' + U.esc(r.name) + '</div>' +
        '<div class="help-line">' + U.esc(r.worldName) + ' · ' + r.survival + '% survival · ' + r.outcome.toUpperCase() +
        ' · ' + (r.missions ? r.missions.filter(function (m) { return m.status === 'complete'; }).length : 0) + ' missions</div></div>' +
        '<button class="btn sm" data-action="reconstruct" data-seed="' + r.seed + '" data-num="' + r.number + '" data-world="' + r.worldId + '">Rebuild</button>' +
        '</div>';
    }).join('') || '<div class="empty">No archived expeditions yet.</div>';

    var relics = Object.keys(p.relicCollection).map(function (id) {
      var r = p.relicCollection[id];
      return '<span class="tag ' + (D.RARITY[r.rarity] ? r.rarity : '') + '">' + U.esc(r.name) + ' · ' + (D.RARITY[r.rarity] ? D.RARITY[r.rarity].label : '') + '</span>';
    }).join('') || '<span class="help-line">No relics recorded yet.</span>';

    return '<section class="panel deck-panel" id="progressionPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> Cartographer Progression <span class="idx">/ permanent record</span></div>' +
      '<span class="meta-label" style="margin:0">SCHEMA v' + WF.store.VERSION + ' · SINCE ' + dateStr(p.createdAt).slice(0, 10) + '</span></div>' +
      '<div class="panel-body">' +

      '<div class="identity-card">' +
      '<div class="identity-left">' +
      '<div class="identity-label">CARTOGRAPHER IDENTITY</div>' +
      '<div class="identity-name">' + U.esc(p.callsign) + '</div>' +
      '<div class="identity-title">' + U.esc(sum.title) + ' · LEVEL ' + p.level + '</div>' +
      '<div class="identity-meta">ID ' + U.esc(p.id) + ' · ' + Object.keys(p.achievements).length + ' / ' + D.ACHIEVEMENTS.length + ' achievements · ' + sum.worlds + ' worlds charted</div>' +
      '<div class="row" style="gap:8px;margin-top:10px">' +
      '<button class="btn sm" data-action="rename-cartographer">Change Callsign</button>' +
      '<button class="btn sm" data-action="set-view" data-view="vault">Data Vault</button></div>' +
      '</div>' +
      '<div class="identity-right">' +
      '<div class="row" style="justify-content:space-between"><span class="mono-label">EXPERIENCE</span>' +
      '<span class="mono-label" style="color:var(--teal)">' + p.xp + ' / ' + sum.xpToNext + ' XP</span></div>' +
      '<div class="xp-track"><i style="width:' + xpPct + '%"></i></div>' +
      '<div class="row" style="justify-content:space-between;margin-top:6px">' +
      '<span class="help-line">TOTAL ' + p.xpTotal + ' XP</span><span class="help-line">' + xpPct + '% TO LEVEL ' + (p.level + 1) + '</span></div>' +
      '<div class="tag-list" style="margin-top:10px">' + p.titles.map(function (t) { return '<span class="tag gold">' + U.esc(t) + '</span>'; }).join('') + '</div>' +
      '</div></div>' +

      '<div class="deck-stats">' +
      h().stat('Expeditions', sum.stats.expeditions) +
      h().stat('Completed', sum.stats.completed, 'pos') +
      h().stat('Lost', sum.stats.lost, 'neg') +
      h().stat('Best Survival', sum.stats.bestSurvival + '%', 'teal') +
      h().stat('Combat Victories', sum.stats.victories, 'gold') +
      h().stat('Relics Recovered', sum.stats.relicsRecovered) +
      h().stat('Resources Collected', sum.stats.resourcesCollected) +
      h().stat('Damage Taken', sum.stats.damageTaken, 'neg') +
      h().stat('Sectors Charted', sum.sectors, 'teal') +
      h().stat('Missions Complete', sum.stats.missionsComplete, 'gold') +
      '</div>' +

      '<div class="deck-grid">' +
      '<div><div class="section-label" style="margin-top:4px">ACHIEVEMENT GALLERY · ' + unlocked + ' / ' + achievements.length + '</div>' +
      '<div class="ach-grid">' + achCards + '</div></div>' +
      '<div>' +
      '<div class="section-label" style="margin-top:4px">COMPANION DEVELOPMENT</div>' +
      '<div class="stack" style="gap:8px">' + compCards + '</div>' +
      '<div class="section-label">WORLD DISCOVERY RECORDS</div>' +
      '<div class="stack" style="gap:6px">' + worldRows + '</div>' +
      '</div></div>' +

      '<div class="deck-grid">' +
      '<div><div class="section-label">EXPEDITION TIMELINE</div><div class="timeline">' + timeline + '</div></div>' +
      '<div><div class="section-label">RELIC COLLECTION</div>' +
      '<div class="tag-list" style="margin-top:8px">' + relics + '</div>' +
      '<div class="section-label">CURRENT LOADOUT CONTRIBUTION</div>' +
      '<div class="help-line">Level and permanent statistics never reset when the horizon rerolls. Expedition condition, missions and injuries are expedition-scoped.</div>' +
      '<div class="stack" style="gap:5px;margin-top:8px">' +
      WF.inventory.characterProfile(s).sources.map(function (src) {
        return '<div class="kv"><span class="k">' + U.titleCase(src.slot) + '</span><span class="v">' + U.esc(src.name) + '</span></div>';
      }).join('') + '</div>' +
      '</div></div>' +

      '</div></section>';
  };

  /* ==================================================================
     WORLD CODEX
     ================================================================== */

  deck.renderCodex = function () {
    var s = state();
    var p = WF.profile.ensure(s);
    var worlds = D.WORLDS;
    var selectedId = s.ui.codexWorld || (Object.keys(p.discoveredWorlds)[0] || 'cosmic-void');
    var w = D.WORLD_BY_ID[selectedId] || D.WORLDS[0];
    var codex = D.CODEX[w.id] || {};
    var disc = p.discoveredWorlds[w.id];
    var locked = w.locked && p.unlockedWorlds.indexOf(w.id) < 0;

    var tabs = worlds.map(function (x) {
      var d = p.discoveredWorlds[x.id];
      var lk = x.locked && p.unlockedWorlds.indexOf(x.id) < 0;
      return '<button class="codex-tab ' + (x.id === w.id ? 'active' : '') + ' ' + (d ? 'seen' : '') + '" data-action="set-codex" data-world="' + x.id + '">' +
        '<span class="codex-dot" style="background:' + (x.palette ? x.palette.a : '#3ff0d0') + '"></span>' +
        '<span>' + U.esc(x.name) + '</span>' +
        (lk ? '<span class="tag bad" style="font-size:7px">LOCKED</span>' : d ? '<span class="tag good" style="font-size:7px">CHARTED</span>' : '<span class="tag" style="font-size:7px">UNSEEN</span>') +
        '</button>';
    }).join('');

    var enemies = w.enemies.map(function (e) {
      return '<div class="codex-enemy"><div class="row" style="justify-content:space-between"><span class="comp-name" style="font-size:11px">' + U.esc(e.name) + '</span>' +
        '<span class="tag bad">TIER ' + e.tier + '</span></div>' +
        '<div class="help-line">' + U.esc(e.class) + ' · HP ' + e.health + ' · ATK ' + e.attack + ' · PEN ' + e.penetration + '</div>' +
        '<div class="help-line" style="color:var(--gold-dim)">' + U.esc(e.ability.name) + ' — ' + U.esc(e.ability.text) + '</div></div>';
    }).join('');

    var hazards = w.hazards.map(function (hz) {
      return '<div class="codex-hazard"><div class="row" style="justify-content:space-between"><span>' + U.esc(hz.name) + '</span>' +
        '<span class="mono-label">' + hz.severity + '%</span></div>' +
        '<div style="margin-top:4px">' + h().bar(hz.severity, 'danger') + '</div>' +
        '<div class="help-line" style="margin-top:4px">' + U.esc(hz.desc) + '</div></div>';
    }).join('');

    var sectors = Object.keys(p.discoveredSectors).filter(function (k) {
      return p.discoveredSectors[k].worldId === w.id;
    }).map(function (k) {
      var sec = p.discoveredSectors[k];
      return '<div class="kv"><span class="k">' + U.esc(sec.sector) + '</span><span class="v">' + sec.expeditions + ' runs · best ' + sec.bestSurvival + '%</span></div>';
    }).join('') || '<div class="help-line">No sectors charted in this world yet.</div>';

    var allSectors = Object.keys(p.discoveredSectors).map(function (k) { return p.discoveredSectors[k]; })
      .sort(function (a, b) { return (b.lastAt || 0) - (a.lastAt || 0); })
      .map(function (sec) {
        return '<div class="mission-history complete">' +
          '<div class="row" style="justify-content:space-between"><span class="mono-label">' + U.esc(sec.worldName) + '</span>' +
          '<span class="mono-label">' + sec.expeditions + ' RUNS</span></div>' +
          '<div class="mh-title">' + U.esc(sec.sector) + '</div>' +
          '<div class="help-line">BEST ' + (sec.bestSurvival || 0) + '% · ' + (sec.seed ? 'SEED ' + Number(sec.seed).toString(16).toUpperCase() : 'NO SEED') + '</div>' +
          (sec.seed ? '<button class="btn sm" style="margin-top:5px" data-action="reconstruct" data-seed="' + sec.seed + '" data-num="' + sec.number + '" data-world="' + sec.worldId + '">Rebuild Sector</button>' : '') +
          '</div>';
      }).join('') || '<div class="empty">No sectors charted yet.</div>';

    var relicIndex = D.ITEMS.filter(function (i) { return i.category === 'relic' || i.category === 'artifact'; }).map(function (i) {
      var known = !!p.relicCollection[i.id];
      return '<div class="codex-relic ' + (known ? 'known' : '') + '">' +
        '<div class="item-sigil sm">' + A.itemSigil(i) + '</div>' +
        '<div class="grow"><div style="font-size:11px;color:' + (known ? 'var(--text)' : 'var(--silver-dim)') + '">' + U.esc(known ? i.name : 'Unidentified Entry') + '</div>' +
        '<div class="help-line">' + (known ? U.esc(i.classification) : 'Recover this relic to index it') + '</div></div>' +
        h().rarityBadge(i.rarity) + '</div>';
    }).join('');

    return '<section class="panel deck-panel" id="codexPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> World Codex <span class="idx">/ ' + worlds.length + ' realities</span></div>' +
      '<span class="meta-label" style="margin:0">' + Object.keys(p.discoveredWorlds).length + ' CHARTED</span></div>' +
      '<div class="panel-body">' +
      '<div class="codex-tabs">' + tabs + '</div>' +
      '<div class="codex-hero" style="background:linear-gradient(120deg,' + (w.palette ? w.palette.a : '#3ff0d0') + '18,transparent 60%)">' +
      '<div class="codex-hero-art">' + A.worldArt({ id: w.id + '-codex', worldId: w.id, palette: w.palette, seed: U.hashString(w.id) }) + '</div>' +
      '<div class="codex-hero-body">' +
      '<h2 class="hero-title" style="font-size:26px">' + U.esc(w.name) + '</h2>' +
      '<div class="hero-class">' + U.esc(w.classification) + '</div>' +
      '<div class="lore-quote" style="font-size:14px;margin:10px 0">' + U.esc(codex.history || w.description) + '</div>' +
      '<div class="tag-list">' +
      '<span class="tag ' + (disc ? 'good' : '') + '">' + (disc ? 'CHARTED' : locked ? 'LOCKED' : 'UNDISCOVERED') + '</span>' +
      (disc ? '<span class="tag teal">' + (disc.expeditions || 0) + ' EXPEDITIONS</span><span class="tag gold">BEST ' + (disc.bestSurvival || 0) + '%</span>' : '') +
      '<span class="tag">' + U.esc(w.tagline) + '</span>' +
      '</div></div></div>' +

      '<div class="deck-grid">' +
      '<div>' +
      '<div class="section-label">ARCHIVE HISTORY</div>' +
      '<p style="font-size:12.5px;line-height:1.7;color:#b8c6d1">' + U.esc(codex.history || w.description) + '</p>' +
      '<div class="section-label">SOCIETY &amp; FACTIONS</div>' +
      '<p style="font-size:12.5px;line-height:1.7;color:#b8c6d1">' + U.esc(codex.society || 'No sociological record survives.') + '</p>' +
      '<div class="tag-list">' + w.factions.map(function (f) { return '<span class="tag">' + U.esc(f) + '</span>'; }).join('') + '</div>' +
      '<div class="section-label">RUINS &amp; LANDMARKS</div>' +
      '<p style="font-size:12.5px;line-height:1.7;color:#b8c6d1">' + U.esc(codex.ruins || 'Unsurveyed.') + '</p>' +
      '<div class="section-label">ARCHIVE RUMOUR</div>' +
      '<div class="log-narrative" style="font-size:13px">' + U.esc(codex.rumor || 'None recorded.') + '</div>' +
      '<div class="section-label">SECTORS CHARTED</div>' + sectors +
      '</div>' +
      '<div>' +
      '<div class="section-label" style="margin-top:4px">ENVIRONMENTAL HAZARDS</div>' +
      '<div class="stack" style="gap:6px">' + hazards + '</div>' +
      '<div class="section-label">HOSTILE INDEX</div>' +
      '<div class="stack" style="gap:6px">' + enemies + '</div>' +
      '</div></div>' +

      '<div class="deck-grid">' +
      '<div><div class="section-label">RELIC INDEX</div><div class="stack" style="gap:5px">' + relicIndex + '</div></div>' +
      '<div><div class="section-label">CARTOGRAPHER MASTERY</div>' +
      '<div class="help-line">World records are permanent. They are written when an expedition is generated and updated when it closes.</div>' +
      '<div class="stack" style="gap:5px;margin-top:8px">' +
      '<div class="kv"><span class="k">World</span><span class="v">' + U.esc(w.name) + '</span></div>' +
      '<div class="kv"><span class="k">Classification</span><span class="v">' + U.esc(w.classification) + '</span></div>' +
      '<div class="kv"><span class="k">Expeditions</span><span class="v">' + (disc ? disc.expeditions || 0 : 0) + '</span></div>' +
      '<div class="kv"><span class="k">Best Survival</span><span class="v">' + (disc ? disc.bestSurvival || 0 : 0) + '%</span></div>' +
      '<div class="kv"><span class="k">Unlock</span><span class="v">' + (w.locked ? (p.unlockedWorlds.indexOf(w.id) >= 0 ? 'UNLOCKED' : 'LEVEL ' + w.unlockLevel) : 'OPEN') + '</span></div>' +
      '</div>' +
      '<div class="tag-list" style="margin-top:10px">' + w.perks.map(function (p2) { return '<span class="tag good">' + U.esc(p2.name) + '</span>'; }).join('') +
      w.penalties.map(function (p2) { return '<span class="tag bad">' + U.esc(p2.name) + '</span>'; }).join('') + '</div>' +
      '</div></div>' +
      '<div class="section-label">DISCOVERY ARCHIVE · ALL CHARTED SECTORS</div>' +
      '<div class="mission-history-grid">' + allSectors + '</div>' +
      '</div></section>';
  };

  /* ==================================================================
     DATA VAULT
     ================================================================== */

  deck.renderVault = function () {
    var s = state();
    var ai = WF.ai.config(s);
    var backup = WF.store.backupInfo();
    var mig = WF.store.migrationBackupInfo();
    var bytes = WF.store.storageBytes(s);
    var summary = WF.profile.summary(s);
    var shared = WF.shared.ensure(s);
    var cstats = WF.shared.communityStats(s);
    var automationNote = ai.enabled
      ? 'AI narrative is ENABLED. Requests go to the configured endpoint; no credential is stored in this browser.'
      : 'AI narrative is DISABLED. The deterministic template engine is active and fully offline.';

    var outbox = shared.publications.slice(0, 4).map(function (pub) {
      var label = pub.kind === 'expedition' ? (pub.name + ' · ' + pub.worldName) : pub.kind === 'bundle' ? ('Bundle · ' + (pub.expeditions || []).length + ' expeditions') : ('Profile · ' + pub.callsign);
      return '<div class="kv"><span class="k">' + U.esc(pub.kind.toUpperCase()) + ' · ' + dateStr(pub.publishedAt).slice(0, 10) + '</span>' +
        '<span class="v" style="font-size:9px">' + U.esc(label) + '</span>' +
        (pub.kind === 'expedition' ? '<button class="btn sm" data-action="reconstruct-shared" data-id="' + pub.publicationId + '">Rebuild</button>' : '') +
        '</div>';
    }).join('') || '<div class="help-line">Outbox is empty. Publish a profile or expedition to stage a share payload.</div>';

    var inbox = shared.inbox.slice(0, 4).map(function (pub) {
      var label = pub.kind === 'bundle' ? ('Bundle · ' + (pub.expeditions || []).length) : pub.kind === 'expedition' ? (pub.name || 'Expedition') : ('Profile · ' + pub.callsign);
      return '<div class="kv"><span class="k">' + U.esc(pub.callsign || 'UNKNOWN') + ' · LV ' + (pub.level || 1) + '</span>' +
        '<span class="v" style="font-size:9px">' + U.esc(label) + '</span>' +
        ((pub.kind === 'expedition' || pub.kind === 'bundle') ? '<button class="btn sm" data-action="reconstruct-shared" data-id="' + pub.receivedId + '">Rebuild</button>' : '') +
        '</div>';
    }).join('') || '<div class="help-line">No shared discoveries received.</div>';

    return '<section class="panel deck-panel" id="vaultPanel">' +
      '<div class="panel-head"><div class="panel-title"><span class="dot"></span> Data Vault <span class="idx">/ schema v' + WF.store.VERSION + '</span></div>' +
      '<span class="meta-label" style="margin:0">' + (bytes / 1024).toFixed(1) + ' KB LOCAL STATE</span></div>' +
      '<div class="panel-body">' +
      '<div class="deck-grid">' +

      '<div><div class="section-label" style="margin-top:4px">AI CARTOGRAPHER · OPTIONAL NARRATIVE LAYER</div>' +
      '<div class="panel-inner">' +
      '<div class="kv"><span class="k">Mode</span><span class="v">' + (ai.enabled ? 'ENABLED' : 'OFFLINE TEMPLATES') + '</span></div>' +
      '<div class="help-line" style="margin-top:6px">' + U.esc(automationNote) + '</div>' +
      '<div class="slider-block" style="margin-top:12px">' +
      '<div class="slider-head"><span class="slider-label">Narrative Endpoint</span></div>' +
      '<input id="aiEndpoint" type="text" value="' + U.esc(ai.endpoint || WF.ai.DEFAULT_ENDPOINT) + '" placeholder="/api/cartographer" spellcheck="false">' +
      '<div class="help-line" style="margin-top:5px">Relative path or https:// URL. API keys are configured server-side only.</div></div>' +
      '<div class="row wrap" style="gap:8px;margin-top:10px">' +
      '<button class="btn ' + (ai.enabled ? '' : 'primary') + '" data-action="ai-toggle">' + (ai.enabled ? 'Disable AI' : 'Enable AI') + '</button>' +
      '<button class="btn" data-action="ai-save-endpoint">Save Endpoint</button>' +
      '<button class="btn" data-action="ai-test">Test Connection</button>' +
      '<button class="btn sm" data-action="ai-generate" data-kind="intro">Generate Sample</button></div>' +
      '<div class="status-line" id="aiStatus"></div>' +
      '<div class="section-label">SECURITY POSTURE</div>' +
      '<div class="help-line">' +
      '• No provider key is ever written to browser storage or sent to the client.<br>' +
      '• The optional proxy (server/ai-proxy.mjs) holds credentials in environment variables.<br>' +
      '• Narrative responses are sanitised and length-bounded before rendering.<br>' +
      '• AI output never mutates resources, survival, equipment or combat outcomes.<br>' +
      '• With no endpoint, the application is fully offline.' +
      '</div></div>' +

      '<div class="section-label">DATA PORTABILITY</div>' +
      '<div class="panel-inner">' +
      '<div class="kv"><span class="k">Schema</span><span class="v">v' + WF.store.VERSION + (s.__migrated ? ' · MIGRATED FROM ' + U.esc(s.__migrationSource || 'legacy') : '') + '</span></div>' +
      '<div class="kv"><span class="k">Cartographer</span><span class="v">' + U.esc(summary.callsign) + ' · LV ' + summary.level + '</span></div>' +
      '<div class="kv"><span class="k">Expedition records</span><span class="v">' + (s.history || []).length + '</span></div>' +
      '<div class="kv"><span class="k">Archive entries</span><span class="v">' + (s.archive || []).length + '</span></div>' +
      '<div class="kv"><span class="k">Last local backup</span><span class="v">' + (backup ? dateStr(backup.savedAt) : 'NONE') + '</span></div>' +
      '<div class="kv"><span class="k">v2 migration backup</span><span class="v">' + (mig ? (mig.bytes / 1024).toFixed(1) + ' KB PRESERVED' : 'NOT PRESENT') + '</span></div>' +
      '<div class="row wrap" style="gap:8px;margin-top:12px">' +
      '<button class="btn primary" data-action="export-data">Export JSON</button>' +
      '<button class="btn" data-action="import-data">Import JSON</button>' +
      '<button class="btn" data-action="backup-now">Create Backup</button>' +
      '<button class="btn" data-action="restore-backup"' + (backup ? '' : ' disabled') + '>Restore Backup</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<div class="help-line" style="margin-top:8px">Export includes the full persistent profile, archive, quest history, expedition history and current expedition state. Import validates schema and migrates forward; it never silently drops fields.</div>' +
      '</div>' +
      '<div class="section-label">RESET CONTROLS</div>' +
      '<div class="panel-inner">' +
      '<div class="row wrap" style="gap:8px">' +
      '<button class="btn danger" data-action="reset-progress">Reset Progression</button>' +
      '<button class="btn danger" data-action="reset-app">Reset Entire Archive</button></div>' +
      '<div class="help-line" style="margin-top:8px">Reset Progression clears level, achievements, mission history and expedition records while keeping the archive and current run. Reset Entire Archive clears all local state. Both require confirmation.</div>' +
      '</div></div>' +

      '<div><div class="section-label" style="margin-top:4px">SHARED UNIVERSE ARCHITECTURE</div>' +
      '<div class="panel-inner">' +
      '<div class="help-line">The data model is ready for server synchronisation. No network calls are made today.</div>' +
      '<div class="stack" style="gap:5px;margin-top:8px">' +
      '<div class="kv"><span class="k">Profile record</span><span class="v">EXPORTABLE</span></div>' +
      '<div class="kv"><span class="k">Shared discoveries</span><span class="v">EXPORTABLE</span></div>' +
      '<div class="kv"><span class="k">Seeded reconstructions</span><span class="v">DETERMINISTIC</span></div>' +
      '<div class="kv"><span class="k">Public expedition records</span><span class="v">SCHEMA READY</span></div>' +
      '<div class="kv"><span class="k">Accounts / sync</span><span class="v">NOT DEPLOYED</span></div>' +
      '<div class="kv"><span class="k">Competitive combat</span><span class="v">OUT OF SCOPE</span></div>' +
      '</div>' +
      '<div class="section-label">NARRATIVE STORAGE</div>' +
      '<div class="help-line">' + (s.narratives || []).length + ' dispatches retained (max 40). Latest: ' +
      (s.narratives && s.narratives[0] ? U.esc(s.narratives[0].kind) + ' · ' + U.esc(s.narratives[0].source) : 'none') + '.</div>' +
      '</div>' +

      '<div class="section-label">SHARED UNIVERSE · LOCAL OUTBOX</div>' +
      '<div class="panel-inner">' +
      '<div class="help-line">Backend-ready payloads. Nothing is transmitted: publications and imports stay in local storage until a sync service is deployed.</div>' +
      '<div class="deck-stats" style="grid-template-columns:repeat(2,1fr);margin:10px 0 6px">' +
      h().stat('Published', cstats.publications) +
      h().stat('Received', cstats.received) +
      h().stat('Shared Expeditions', cstats.sharedExpeditions) +
      h().stat('Community Avg', cstats.avgSurvival + '%', 'teal') +
      '</div>' +
      '<div class="row wrap" style="gap:6px">' +
      '<button class="btn sm" data-action="publish-profile">Publish Profile</button>' +
      '<button class="btn sm" data-action="publish-expedition">Publish Expedition</button>' +
      '<button class="btn sm gold" data-action="export-share">Export Share Bundle</button>' +
      '<button class="btn sm" data-action="import-share">Import Share</button></div>' +
      '<input type="file" id="importShareFile" accept="application/json,.json" style="display:none">' +
      '<div class="section-label" style="margin-top:12px">OUTBOX</div>' + outbox +
      '<div class="section-label">INBOX</div>' + inbox +
      '<div class="help-line" style="margin-top:6px">' + (cstats.topWorld ? 'Most shared world (local dataset): ' + U.esc(cstats.topWorld) : 'No shared world statistics yet.') + '</div>' +
      '</div>' +

      '<div class="section-label">DIAGNOSTICS</div>' +
      '<div class="panel-inner">' +
      '<div class="kv"><span class="k">Engine modules</span><span class="v">WORLD · ROUTE · COMBAT · TACTICAL · QUESTS · PROFILE</span></div>' +
      '<div class="kv"><span class="k">Offline capable</span><span class="v" style="color:var(--ok)">YES</span></div>' +
      '<div class="kv"><span class="k">External dependencies</span><span class="v">NONE</span></div>' +
      '<div class="kv"><span class="k">Build step</span><span class="v">NONE</span></div>' +
      '<div class="kv"><span class="k">Storage keys</span><span class="v" style="font-size:8px">v3 / v2 legacy / backup</span></div>' +
      '</div></div>' +

      '</div></div></section>';
  };

  deck.render = function (view) {
    if (view === 'missions') return deck.renderMissions();
    if (view === 'progression') return deck.renderProgression();
    if (view === 'codex') return deck.renderCodex();
    if (view === 'vault') return deck.renderVault();
    return '';
  };
})(window.WF = window.WF || {});
