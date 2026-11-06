/* =====================================================================
   engine/shared-universe.js — backend-ready shared universe model
   No network transmission is performed. Publications are stored in a
   local outbox shaped exactly like future API payloads, and can be
   exported / imported / reconstructed offline.
   Exposes: WF.shared
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;
  var SCHEMA = 1;

  function ensure(state) {
    if (!state.shared) state.shared = { publications: [], inbox: [], profilePublished: null };
    if (!Array.isArray(state.shared.publications)) state.shared.publications = [];
    if (!Array.isArray(state.shared.inbox)) state.shared.inbox = [];
    return state.shared;
  }

  function publicProfile(state) {
    var p = WF.profile.ensure(state);
    var sum = WF.profile.summary(state);
    var relics = Object.keys(p.relicCollection).map(function (id) {
      return { id: id, name: p.relicCollection[id].name, rarity: p.relicCollection[id].rarity };
    }).slice(0, 40);
    return {
      schema: SCHEMA,
      kind: 'profile',
      cartographerId: p.id,
      callsign: p.callsign,
      level: p.level,
      title: sum.title,
      titles: p.titles.slice(),
      createdAt: p.createdAt,
      achievements: Object.keys(p.achievements),
      achievementCount: Object.keys(p.achievements).length,
      stats: {
        expeditions: p.stats.expeditions,
        completed: p.stats.completed,
        lost: p.stats.lost,
        bestSurvival: p.stats.bestSurvival,
        missionsComplete: p.stats.missionsComplete,
        relicsRecovered: p.stats.relicsRecovered,
        victories: p.stats.victories
      },
      worlds: Object.keys(p.discoveredWorlds),
      relics: relics,
      publishedAt: Date.now()
    };
  }

  function expeditionShare(state, record) {
    var p = WF.profile.ensure(state);
    var rec = record || (state.history && state.history[0]);
    if (!rec) return null;
    return {
      schema: SCHEMA,
      kind: 'expedition',
      id: 'share_' + (rec.seed || 0).toString(36) + '_' + rec.number,
      cartographerId: p.id,
      callsign: p.callsign,
      level: p.level,
      seed: rec.seed,
      number: rec.number,
      worldId: rec.worldId,
      worldName: rec.worldName,
      name: rec.name,
      sector: rec.sector,
      survival: rec.survival,
      outcome: rec.outcome,
      difficulty: rec.difficulty,
      hazards: rec.hazards,
      discoveries: (rec.discoveries || []).slice(0, 8),
      missions: (rec.missions || []).map(function (m) { return { title: m.title, kind: m.kind, status: m.status }; }),
      route: rec.route,
      companion: rec.companion,
      publishedAt: Date.now()
    };
  }

  function bundle(state, count) {
    var p = publicProfile(state);
    var recs = (state.history || []).slice(0, count || 10).map(function (r) {
      return expeditionShare(state, r);
    }).filter(Boolean);
    return {
      schema: SCHEMA,
      kind: 'bundle',
      cartographerId: p.cartographerId,
      profile: p,
      expeditions: recs,
      publishedAt: Date.now()
    };
  }

  function validate(payload) {
    if (!payload || typeof payload !== 'object') return 'Payload is not an object.';
    if (payload.schema !== SCHEMA) return 'Unsupported shared-universe schema.';
    if (['profile', 'expedition', 'bundle'].indexOf(payload.kind) < 0) return 'Unknown share kind.';
    if (!payload.cartographerId) return 'Missing cartographer identity.';
    if (payload.kind === 'expedition' && (payload.seed == null || !payload.worldId)) return 'Expedition share is missing its seed or world.';
    if (payload.kind === 'bundle' && !Array.isArray(payload.expeditions)) return 'Bundle has no expedition list.';
    if (payload.kind === 'profile' && !payload.callsign) return 'Profile share has no callsign.';
    return null;
  }

  function publish(state, kind) {
    var s = ensure(state);
    var payload;
    if (kind === 'expedition') payload = expeditionShare(state, state.history && state.history[0]);
    else if (kind === 'bundle') payload = bundle(state, 10);
    else payload = publicProfile(state);
    if (!payload) return { ok: false, message: 'No expedition record available to publish.' };
    var err = validate(payload);
    if (err) return { ok: false, message: err };
    payload.publicationId = 'pub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
    s.publications.unshift(payload);
    if (s.publications.length > 30) s.publications.length = 30;
    if (kind === 'profile') s.profilePublished = payload.publicationId;
    return { ok: true, publication: payload, message: 'Published to local outbox (not transmitted).' };
  }

  function receive(state, payload) {
    var err = validate(payload);
    if (err) return { ok: false, message: err };
    var s = ensure(state);
    var entry = JSON.parse(JSON.stringify(payload));
    entry.receivedAt = Date.now();
    entry.receivedId = 'rcv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
    s.inbox.unshift(entry);
    if (s.inbox.length > 50) s.inbox.length = 50;
    return { ok: true, entry: entry, message: 'Shared discovery accepted into the local inbox.' };
  }

  function findPublication(state, id) {
    var s = ensure(state);
    var all = s.publications.concat(s.inbox);
    for (var i = 0; i < all.length; i++) if (all[i].publicationId === id || all[i].receivedId === id || all[i].id === id) return all[i];
    return null;
  }

  function communityStats(state) {
    var s = ensure(state);
    var pool = s.publications.concat(s.inbox);
    var expeditions = [];
    pool.forEach(function (p) {
      if (p.kind === 'expedition') expeditions.push(p);
      if (p.kind === 'bundle' && p.expeditions) expeditions = expeditions.concat(p.expeditions);
    });
    var byWorld = {};
    var survivalSum = 0;
    expeditions.forEach(function (e) {
      byWorld[e.worldName] = (byWorld[e.worldName] || 0) + 1;
      survivalSum += e.survival || 0;
    });
    var topWorld = Object.keys(byWorld).sort(function (a, b) { return byWorld[b] - byWorld[a]; })[0] || null;
    return {
      publications: s.publications.length,
      received: s.inbox.length,
      sharedExpeditions: expeditions.length,
      avgSurvival: expeditions.length ? Math.round(survivalSum / expeditions.length) : 0,
      topWorld: topWorld,
      byWorld: byWorld
    };
  }

  WF.shared = {
    SCHEMA: SCHEMA,
    ensure: ensure,
    publicProfile: publicProfile,
    expeditionShare: expeditionShare,
    bundle: bundle,
    validate: validate,
    publish: publish,
    receive: receive,
    findPublication: findPublication,
    communityStats: communityStats
  };
})(window.WF = window.WF || {});
