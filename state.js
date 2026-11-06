/* =====================================================================
   core/state.js — single application state, persistence, bootstrap
   Exposes: WF.store
   ===================================================================== */
(function (WF) {
  'use strict';

  var KEY = 'wayfinder.archive.v3';
  var LEGACY_KEY = 'wayfinder.archive.v2';
  var BACKUP_KEY = 'wayfinder.archive.backup.v3';
  var MIGRATION_BACKUP_KEY = 'wayfinder.archive.v2.premigration';
  var EXPORT_APP = 'wayfinder-archive';
  var VERSION = 3;

  function defaults() {
    return {
      version: VERSION,
      createdAt: Date.now(),
      expeditionNumber: 0,
      expedition: null,
      routes: [],
      activeRouteId: null,
      archive: [],
      resources: null,
      condition: 100,
      eventAdjust: 0,
      hazardShield: 0,
      tuner: { supplies: 35, overclock: 30 },
      history: [],
      log: [],
      lastCombat: null,
      pendingEncounter: null,
      surveyCount: 0,
      scanCount: 0,
      encounterSeq: 0,
      actionSeq: 0,
      activeCompanionId: null,
      selection: { itemId: null, compare: [] },
      settings: { category: 'all', search: '', sort: 'rarity' },
      ui: { telemetryTab: 'sector', view: 'survival', codexWorld: null },
      profile: null,
      quests: [],
      questHistory: [],
      injuries: [],
      narratives: [],
      tactical: null,
      shared: { publications: [], inbox: [], profilePublished: null },
      meta: { schema: 3, createdAt: Date.now(), migrations: [] }
    };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION) return { state: parsed, migrated: false, source: 'v3' };
        var migratedNow = migrateAny(parsed, raw);
        if (migratedNow) return { state: migratedNow, migrated: true, source: 'v3-partial' };
      } catch (e) { /* fall through to legacy */ }
    }
    var legacy = null;
    try { legacy = window.localStorage.getItem(LEGACY_KEY); } catch (e) { legacy = null; }
    if (legacy) {
      try {
        var old = JSON.parse(legacy);
        var migrated = migrateAny(old, legacy);
        if (migrated) return { state: migrated, migrated: true, source: 'v2' };
      } catch (e) { return null; }
    }
    return null;
  }

  function saveNow(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  var saveTimer = null;
  function save(state) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveNow(state); }, 120);
  }

  function hydrate(state) {
    var d = defaults();
    Object.keys(d).forEach(function (k) {
      if (state[k] === undefined) state[k] = d[k];
    });
    state.tuner = state.tuner || d.tuner;
    state.settings = state.settings || d.settings;
    state.selection = state.selection || d.selection;
    state.ui = state.ui || d.ui;
    state.ui.view = state.ui.view || 'survival';
    if (!state.history) state.history = [];
    if (!state.log) state.log = [];
    if (!state.quests) state.quests = [];
    if (!state.questHistory) state.questHistory = [];
    if (!state.injuries) state.injuries = [];
    if (!state.narratives) state.narratives = [];
    if (!state.meta) state.meta = { schema: VERSION, createdAt: Date.now(), migrations: [] };
    if (!state.shared) state.shared = { publications: [], inbox: [], profilePublished: null };
    return state;
  }

  /**
   * Migrate a v2 (Phase 1) state object to v3 without discarding anything.
   * Adds profile/quests/history fields, keeps archive, routes, history, logs.
   */
  function migrateFromV2(old, raw) {
    var migrated = hydrate(JSON.parse(JSON.stringify(old)));
    migrated.version = VERSION;
    migrated.meta = migrated.meta || {};
    migrated.meta.schema = VERSION;
    migrated.meta.migrations = (migrated.meta.migrations || []).concat([{ from: 2, to: 3, at: Date.now() }]);
    if (!migrated.profile) migrated.profile = WF.profile ? WF.profile.defaultProfile() : null;
    if (migrated.profile && WF.profile) WF.profile.ensure(migrated);
    // seed discovery records from existing history
    if (WF.profile && migrated.history) {
      migrated.history.forEach(function (rec) {
        if (!rec.worldId) return;
        WF.profile.recordWorld(migrated, {
          worldId: rec.worldId, worldName: rec.worldName,
          classification: rec.classification, survivalBase: rec.survival
        });
      });
    }
    // preserve the original v2 payload before it is ever overwritten
    try {
      if (raw && !window.localStorage.getItem(MIGRATION_BACKUP_KEY)) {
        window.localStorage.setItem(MIGRATION_BACKUP_KEY, raw);
      }
    } catch (e) { /* storage may be unavailable */ }
    return migrated;
  }

  function migrateAny(parsed, raw) {
    if (!parsed || typeof parsed !== 'object') return null;
    var v = parsed.version || 1;
    if (v > VERSION) return null;
    if (v === VERSION) return hydrate(parsed);
    if (v === 2) return migrateFromV2(parsed, raw);
    // v1: only expedition/inventory era — treat as v2 then migrate
    var asV2 = parsed;
    asV2.version = 2;
    return migrateFromV2(asV2, raw);
  }

  function init() {
    var loaded = load();
    var state;
    var restored = false;
    var migrated = false;

    if (loaded) {
      state = hydrate(loaded.state);
      migrated = !!loaded.migrated;
      state.__migrationSource = loaded.source;
      WF.inventory.ensure(state);
      // reconcile active flags with persisted state
      if (state.activeRouteId) {
        var ri = WF.inventory.get(state, state.activeRouteId);
        if (ri) ri.equipped = true;
      }
      if (state.activeCompanionId) {
        var ci = WF.inventory.get(state, 'c-' + state.activeCompanionId) ||
          state.archive.filter(function (it) { return it.companionId === state.activeCompanionId; })[0];
        if (ci) ci.equipped = true;
      }
      restored = true;
      if (migrated) saveNow(state);
    } else {
      state = defaults();
      WF.inventory.ensure(state);
      WF.engine.reroll(state, { seed: makeSeed() });
    }

    // safety: always have a live expedition and routes
    if (!state.expedition) WF.engine.reroll(state, { seed: makeSeed() });
    if (!state.routes || !state.routes.length) {
      state.routes = WF.routes.generate(state.expedition, WF.inventory.characterProfile(state).attributes);
      WF.engine.syncRouteItems(state);
    }
    if (!state.activeRouteId && state.routes.length) {
      state.activeRouteId = state.routes[0].id;
      var it = WF.inventory.get(state, state.routes[0].id);
      if (it) it.equipped = true;
    }

    if (WF.profile) WF.profile.ensure(state);
    if (WF.companions && WF.companions.reconcile) WF.companions.reconcile(state);
    state.__restored = restored;
    state.__migrated = migrated;
    return state;
  }

  function makeSeed() {
    return (Math.random() * 0xFFFFFFFF) >>> 0;
  }

  function reset() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return init();
  }

  function resetProgress() {
    var s = init();
    s.profile = WF.profile.defaultProfile();
    WF.profile.ensure(s);
    s.questHistory = [];
    s.history = [];
    s.__restored = false;
    saveNow(s);
    return s;
  }

  /* ---------------- export / import / backup ---------------- */

  function exportPayload(state) {
    return {
      app: EXPORT_APP,
      schema: VERSION,
      exportedAt: new Date().toISOString(),
      generator: 'The Wayfinder\'s Archive',
      state: state
    };
  }

  function exportJson(state) {
    return JSON.stringify(exportPayload(state), null, 2);
  }

  function validatePayload(obj) {
    if (!obj || typeof obj !== 'object') return 'Payload is not an object.';
    if (obj.app && obj.app !== EXPORT_APP) return 'This file does not belong to the Wayfinder Archive.';
    if (obj.schema && obj.schema > VERSION) return 'Export schema ' + obj.schema + ' is newer than this build (v' + VERSION + ').';
    var st = obj.state || obj;
    if (!st || typeof st !== 'object') return 'No application state found.';
    if (!Array.isArray(st.archive)) return 'State is missing its archive.';
    if (!st.expedition && !st.expeditionNumber) return 'State has no expedition record.';
    return null;
  }

  /** Import a parsed export object. Returns {ok, state?, error?} */
  function importPayload(obj) {
    var err = validatePayload(obj);
    if (err) return { ok: false, error: err };
    var raw = obj.state || obj;
    var imported = migrateAny(JSON.parse(JSON.stringify(raw)), JSON.stringify(raw));
    if (!imported) return { ok: false, error: 'State could not be migrated.' };
    imported.version = VERSION;
    WF.inventory.ensure(imported);
    if (WF.profile) WF.profile.ensure(imported);
    if (WF.engine && (!imported.expedition || !imported.routes || !imported.routes.length)) {
      WF.engine.reroll(imported, { seed: makeSeed() });
    }
    imported.__restored = true;
    saveNow(imported);
    return { ok: true, state: imported };
  }

  function saveBackup(state) {
    try {
      var payload = { savedAt: Date.now(), schema: VERSION, state: state };
      window.localStorage.setItem(BACKUP_KEY, JSON.stringify(payload));
      return { ok: true, savedAt: payload.savedAt };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function backupInfo() {
    try {
      var raw = window.localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return { savedAt: obj.savedAt, schema: obj.schema, bytes: raw.length };
    } catch (e) { return null; }
  }

  function restoreBackup() {
    try {
      var raw = window.localStorage.getItem(BACKUP_KEY);
      if (!raw) return { ok: false, error: 'No local backup exists.' };
      var obj = JSON.parse(raw);
      var res = importPayload({ app: EXPORT_APP, schema: obj.schema || VERSION, state: obj.state });
      return res;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function migrationBackupInfo() {
    try {
      var raw = window.localStorage.getItem(MIGRATION_BACKUP_KEY);
      if (!raw) return null;
      return { bytes: raw.length, exists: true };
    } catch (e) { return null; }
  }

  function storageBytes(state) {
    try { return JSON.stringify(state).length; } catch (e) { return 0; }
  }

  WF.store = {
    KEY: KEY,
    LEGACY_KEY: LEGACY_KEY,
    BACKUP_KEY: BACKUP_KEY,
    MIGRATION_BACKUP_KEY: MIGRATION_BACKUP_KEY,
    VERSION: VERSION,
    defaults: defaults,
    init: init,
    save: save,
    saveNow: saveNow,
    reset: reset,
    resetProgress: resetProgress,
    makeSeed: makeSeed,
    exportJson: exportJson,
    exportPayload: exportPayload,
    importPayload: importPayload,
    validatePayload: validatePayload,
    saveBackup: saveBackup,
    backupInfo: backupInfo,
    restoreBackup: restoreBackup,
    migrationBackupInfo: migrationBackupInfo,
    storageBytes: storageBytes,
    migrateAny: migrateAny
  };
})(window.WF = window.WF || {});
