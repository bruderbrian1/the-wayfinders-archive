/* =====================================================================
   engine/ai-cartographer.js — optional AI narrative layer
   Mechanics never pass through this module. It only returns text.
   Provider credentials live server-side (see server/ai-proxy.mjs).
   Without a configured endpoint, the deterministic template engine is used.
   Exposes: WF.ai
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var MAX_TEXT = 4000;
  var MIN_TEXT = 40;
  var DEFAULT_ENDPOINT = '/api/cartographer';
  var TIMEOUT_MS = 9000;

  var KINDS = [
    'intro', 'discovery', 'faction', 'companion', 'enemy',
    'relic', 'mission', 'event', 'conclusion'
  ];

  function config(state) {
    var p = WF.profile.ensure(state);
    return p.settings.ai || { enabled: false, endpoint: '' };
  }

  function setConfig(state, cfg) {
    var p = WF.profile.ensure(state);
    var endpoint = String(cfg.endpoint || '').trim();
    if (endpoint && !/^(\/|https:\/\/)/.test(endpoint)) {
      return { ok: false, message: 'Endpoint must be a relative path or an https:// URL.' };
    }
    p.settings.ai = {
      enabled: !!cfg.enabled,
      endpoint: endpoint || DEFAULT_ENDPOINT
    };
    return { ok: true, message: 'AI Cartographer settings saved.' };
  }

  function configured(state) {
    var c = config(state);
    return !!(c.enabled && c.endpoint);
  }

  /* ---------------- validation & sanitisation ---------------- */

  function sanitize(text) {
    return String(text || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/\u0000/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function validateText(text) {
    if (typeof text !== 'string') return { ok: false, error: 'Narrative is not text.' };
    var clean = sanitize(text);
    if (clean.length < MIN_TEXT) return { ok: false, error: 'Narrative is too short.' };
    if (clean.length > MAX_TEXT) return { ok: false, error: 'Narrative is too long.' };
    if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(text)) {
      return { ok: false, error: 'Narrative contains unsafe markup.' };
    }
    return { ok: true, text: clean };
  }

  /* ---------------- deterministic offline fallback ---------------- */

  function fallback(state, kind, opts) {
    opts = opts || {};
    var exp = state.expedition;
    var p = WF.profile.ensure(state);
    var idx = (state.narratives || []).length;
    var rng = new U.RNG(((exp ? exp.seed : 1) ^ U.hashString(kind + ':' + idx + ':' + (opts.itemId || ''))) >>> 0);
    var summary = WF.profile.summary(state);
    var companion = WF.companions && WF.companions.active(state);
    var route = state.routes && state.routes.length ? state.routes[0] : null;

    var world = exp ? exp.worldName : 'the archive';
    var sector = exp ? exp.sector : 'SECTOR NULL';

    if (kind === 'intro' && exp) {
      return WF.lore.intro(exp) + ' ' + rng.pick([
        'The Cartographer logs the entry and moves before the sector can finish resolving.',
        'Archive note appended: the horizon is stable enough to stand on, for now.',
        'The suit reports nominal. The Cartographer does not believe it.'
      ]);
    }

    if (kind === 'discovery') {
      return rng.pick([
        'The sweep returns something that should not still be powered. It is warm, it is deliberate, and it has been waiting in ' + sector + ' longer than the archive has existed.',
        'Beneath the surface layer, a cache of pre-collapse manufacture survives intact. The Cartographer records the find in the same handwriting as every other entry.',
        'A signal resolves into structure. The structure resolves into a door. The door is not locked, which is worse.'
      ]);
    }

    if (kind === 'faction') {
      var faction = exp ? exp.faction : 'the local faction';
      return 'TRANSMISSION INTERCEPT // ' + faction.toUpperCase() + ' // ' + sector + '\n\n' +
        rng.pick([
          '"Unregistered Cartographer. You are mapping ground we have already claimed. Withdraw, or be mapped yourself."',
          '"The archive you carry is a debt instrument. We intend to collect. Turn back before the next horizon."',
          '"You are not the first to survey this sector. You are, however, the first to do it while still breathing. Consider the implication."'
        ]) +
        '\n\n— signal authenticated against ' + (exp ? String(exp.primaryHazard.name).toLowerCase() : 'local interference') + ' noise floor.';
    }

    if (kind === 'companion') {
      var cname = companion ? companion.name : 'the companion module';
      return cname + ': "' + rng.pick([
        'I have run this sector four hundred times in simulation. You survive in eleven percent of them. I am adjusting the estimate upward as we speak.',
        'Your vitals are acceptable. Your decisions remain a statistical curiosity.',
        'I remember this place from a version of the archive that no longer exists. Try not to make the same mistake twice.',
        'The route ahead is stable for the next six minutes. After that, I recommend being somewhere else.'
      ]) + '"';
    }

    if (kind === 'enemy') {
      var enemy = opts.enemy || (exp && exp.enemyPool && exp.enemyPool[0]) || { name: 'the hostile' };
      return (enemy.name || 'The hostile') + ' — ' + (enemy.class || 'unclassified') + '. ' +
        rng.pick([
          'It does not hunt because it is hungry. It hunts because the archive still lists you as a valid target.',
          'Its behaviour is learned, not instinctive. Somewhere behind it is a doctrine that was never decommissioned.',
          'It has adapted to ' + (exp ? exp.primaryHazard.name.toLowerCase() : 'the environment') + '. You have not. That asymmetry is the encounter.'
        ]) +
        (enemy.ability ? ' Recorded ability: ' + enemy.ability.name + ' — ' + enemy.ability.text : '');
    }

    if (kind === 'relic') {
      var item = opts.item || null;
      return 'PROVENANCE // ' + (item ? item.name : 'unidentified relic') + '\n\n' +
        (item ? item.lore : 'The object predates the local collapse.') + ' ' +
        rng.pick([
          'Recovered from ' + sector + ' and logged against seed ' + (exp ? exp.seedLabel : 'unknown') + '.',
          'The archive cross-references three previous owners. All three entries end abruptly.',
          'It responds to the Cartographer, which the Cartographer has decided not to write down.'
        ]);
    }

    if (kind === 'mission') {
      var q = opts.quest;
      return 'MISSION BRIEF // ' + (q ? q.label : 'FIELD ASSIGNMENT') + '\n\n' +
        (q ? q.desc : 'Complete the assigned objective before the horizon turns.') + '\n\n' +
        'Assessment: ' + rng.pick([
          'Achievable with current loadout. Failure mode is environmental, not hostile.',
          'The window is narrow. Recommend resolving primary objectives before surveying further.',
          'High uncertainty. The route matrix and the mission board disagree, which is normal.'
        ]);
    }

    if (kind === 'event') {
      return rng.pick([
        'The suit picks up a transmission in the Cartographer\'s own voice, timestamped four hours from now. The message is three words long. Only the first is legible.',
        'A structure that was not on the survey appears at the edge of the sector. It is already on the map, in the Cartographer\'s handwriting.',
        'The horizon shifts by eleven degrees. The compass does not correct. The archive accepts the new bearing without complaint.',
        'Every loose object in the sector begins to point the same direction. ' + (companion ? companion.name + ' advises against following.' : 'There is no companion to advise against following.')
      ]);
    }

    if (kind === 'conclusion' && exp) {
      return 'EXPEDITION ' + U.pad(exp.number, 3) + ' — CLOSING ENTRY\n\n' +
        'The Cartographer exits ' + sector + ' with ' + Math.round(state.condition) + '% integrity. ' +
        'Survival rating reads ' + Math.round(WF.inventory.survivalBreakdown(state).survival) + '%. ' +
        (companion ? companion.name + ' is still online. ' : '') +
        'The sector is added to the long map under seed ' + exp.seedLabel + '. ' +
        rng.pick([
          'Some of it will be wrong. The archive will keep the version that survived.',
          'The horizon closes behind the Cartographer without ceremony.',
          'The record is filed. The Cartographer does not read it back.'
        ]);
    }

    return rng.pick([
      'The Cartographer records the moment without commentary. The archive prefers it that way.',
      'A routine observation is logged against the running expedition. Nothing about it feels routine.',
      'The sector offers no explanation. The Cartographer has stopped expecting one.'
    ]);
  }

  function record(state, kind, text, source, meta) {
    if (!state.narratives) state.narratives = [];
    var entry = {
      id: 'nar_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
      kind: kind,
      text: text,
      source: source,
      at: Date.now(),
      expeditionId: state.expedition ? state.expedition.id : null,
      expeditionNumber: state.expedition ? state.expedition.number : null,
      meta: meta || null
    };
    state.narratives.unshift(entry);
    if (state.narratives.length > 40) state.narratives.length = 40;
    return entry;
  }

  function contextFor(state, kind, opts) {
    var exp = state.expedition;
    var p = WF.profile.ensure(state);
    var companion = WF.companions && WF.companions.active(state);
    var weapon = WF.inventory.equipped(state, 'weapon');
    var quests = (state.quests || []).slice(0, 6).map(function (q) {
      return { kind: q.kind, title: q.title, status: q.status, label: q.label };
    });
    return {
      kind: kind,
      world: exp ? {
        id: exp.worldId, name: exp.worldName, classification: exp.classification,
        sector: exp.sector, conditions: exp.conditions,
        primaryHazard: exp.primaryHazard.name, secondaryHazard: exp.secondaryHazard.name,
        faction: exp.faction, difficulty: exp.difficulty.label
      } : null,
      cartographer: {
        callsign: p.callsign, level: p.level, title: WF.profile.levelTitle(p.level),
        integrity: Math.round(state.condition), survival: Math.round(WF.inventory.survivalBreakdown(state).survival)
      },
      loadout: {
        weapon: weapon ? weapon.name : null,
        companion: companion ? companion.name : null,
        route: state.activeRouteId
      },
      history: {
        expeditions: p.stats.expeditions,
        completed: p.stats.completed,
        lost: p.stats.lost,
        bestSurvival: p.stats.bestSurvival,
        recentWorlds: (state.history || []).slice(0, 3).map(function (r) { return r.worldName; })
      },
      missions: quests,
      item: opts && opts.item ? { name: opts.item.name, classification: opts.item.classification, rarity: opts.item.rarity } : null,
      enemy: opts && opts.enemy ? { name: opts.enemy.name, class: opts.enemy.class, ability: opts.enemy.ability } : null
    };
  }

  /**
   * Generate narrative. Always resolves; falls back to templates offline.
   * @returns {Promise<{text, source, error?}>}
   */
  function generate(state, kind, opts) {
    opts = opts || {};
    kind = KINDS.indexOf(kind) >= 0 ? kind : 'event';
    var c = config(state);

    if (!c.enabled || !c.endpoint) {
      var text = fallback(state, kind, opts);
      var entry = record(state, kind, text, 'template', opts.itemId || null);
      return Promise.resolve({ text: text, source: 'template', entry: entry });
    }

    var context = contextFor(state, kind, opts);
    var payload = { kind: kind, context: context };
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    return fetch(c.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) throw new Error('Narrative endpoint returned ' + res.status);
      return res.json();
    }).then(function (data) {
      var valid = validateText(data && (data.text || data.narrative));
      if (!valid.ok) throw new Error(valid.error);
      var entry = record(state, kind, valid.text, 'ai', opts.itemId || null);
      return { text: valid.text, source: 'ai', entry: entry };
    }).catch(function (err) {
      var fb = fallback(state, kind, opts);
      record(state, kind, fb, 'template', opts.itemId || null);
      return { text: fb, source: 'template', error: err.message, fallback: true };
    }).then(function (result) {
      clearTimeout(timer);
      return result;
    });
  }

  function history(state) {
    return (state.narratives || []).slice(0, 20);
  }

  function testConnection(state) {
    var c = config(state);
    if (!c.endpoint) return Promise.resolve({ ok: false, error: 'No endpoint configured.' });
    var url = c.endpoint.replace(/\/$/, '') + '/health';
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 5000);
    return fetch(url, { method: 'GET', signal: controller.signal })
      .then(function (r) {
        clearTimeout(timer);
        return r.json().then(function (j) {
          return { ok: r.ok && j && j.ok !== false, status: r.status, provider: j && j.provider };
        }).catch(function () { return { ok: r.ok, status: r.status }; });
      })
      .catch(function (e) {
        clearTimeout(timer);
        return { ok: false, error: e.message };
      });
  }

  WF.ai = {
    KINDS: KINDS,
    DEFAULT_ENDPOINT: DEFAULT_ENDPOINT,
    config: config,
    setConfig: setConfig,
    configured: configured,
    generate: generate,
    validateText: validateText,
    sanitize: sanitize,
    fallback: fallback,
    history: history,
    testConnection: testConnection,
    record: record
  };
})(window.WF = window.WF || {});
