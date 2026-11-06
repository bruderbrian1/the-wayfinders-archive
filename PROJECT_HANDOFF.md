# PROJECT HANDOFF — The Wayfinder's Archive

**Document type:** technical handoff & code-review package
**Application:** The Wayfinder's Archive — procedural survival universe
**Current state:** Phase 2 complete (persistent progression, missions, tactical combat, optional AI narrative, shared-universe data model, redesigned UI)
**Package contents:** complete working source, tests, optional proxy, this handoff
**No application source was changed to produce this export.**

---

## 1. Project architecture

### 1.1 Shape

A dependency-free, single-page application composed of classic `<script>` files that attach modules to the global `WF` namespace. No bundler, no package manager, no framework, no build step.

```
index.html
  ├─ css/styles.css
  ├─ js/core/*.js          (utilities, data tables, profile, persistence)
  ├─ js/engine/*.js        (deterministic simulation engines)
  ├─ js/ui/*.js            (procedural SVG, renderers, command views)
  └─ js/app.js             (bootstrap + error surface)
```

The optional `server/ai-proxy.mjs` is a Node 20+ development server that (a) serves `files/` statically and (b) proxies narrative requests to an OpenAI-compatible provider using a server-side key.

### 1.2 Layering rules

| Layer | Modules | Rule |
|---|---|---|
| Data | `data.js`, `data-expansion.js` | Pure static tables and world/achievement definitions. No DOM, no state mutation. |
| Core | `utils.js`, `profile.js`, `state.js` | Deterministic RNG, formatting, permanent progression, persistence/migration. |
| Engines | `world-generator`, `route-calculator`, `inventory-manager`, `companion-manager`, `combat-engine`, `tactical-combat`, `quest-engine`, `lore-generator`, `ai-cartographer`, `shared-universe`, `expedition-history`, `expedition-engine` | All mechanics. Deterministic given state + seed + player decisions. No DOM access. |
| UI | `sigil.js`, `render.js`, `panels.js`, `deck.js` | Read state, call engines through action handlers, render HTML/SVG. No gameplay math. |
| Bootstrap | `app.js` | Initializes state, binds UI, exposes `window.WF_APP` for debugging/tests. |

### 1.3 Single state source

`WF.store.init()` returns one state object. Every mutation flows through an engine or a UI handler and is followed by `WF.store.save(state)` (debounced 120 ms). Rendering always reads the same object; there is no duplicated view state.

### 1.4 Determinism model

- **World generation:** `WF.world.generate({seed, number, worldId?, unlockedWorldIds?})` — seeded `mulberry32`, stable RNG call order even when a world is forced.
- **Routes:** generated from the expedition seed then recalculated against equipment.
- **Combat (quick):** seeded from `expedition.seed + encounter sequence`.
- **Combat (tactical):** seed + immutable starting snapshot + ordered decision list. `WF.tactical.replay()` reproduces outcome and damage exactly.
- **Quests:** generated from the expedition seed; progress derives only from recorded player actions.
- **Narrative:** AI/template text is presentation-only and never feeds mechanics.

---

## 2. Complete directory & file inventory

Line counts are current as of this export.

### Application (`files/`)

| Path | Lines | Role |
|---|---:|---|
| `index.html` | 78 | Entry point, atmosphere layers, view shell, script order |
| `css/styles.css` | 1588 | Design system, HUD theme, views, tactical UI, responsive |
| `README.md` | 222 | Project documentation |
| `js/app.js` | 54 | Bootstrap, global error capture, `R` reroll shortcut |
| `js/core/utils.js` | 212 | Seeded RNG, clamp/round/format, DOM helpers, humanize |
| `js/core/data.js` | 944 | 6 base worlds, 34 items, companions, hazards, factions, lore tables |
| `js/core/data-expansion.js` | 201 | First Continuum world, codex entries, 20 achievements, mission vocabulary |
| `js/core/profile.js` | 360 | Identity, XP/levels, titles, stats, achievements, discoveries, companion progress |
| `js/core/state.js` | 334 | Defaults, v3 schema, v2/v1 migration, export/import, backup/restore, resets |
| `js/engine/world-generator.js` | 286 | Expedition generation, procedural relics/supplies, unlockable pool |
| `js/engine/route-calculator.js` | 156 | Journey matrix metrics, safest/deadliest, survival modifier |
| `js/engine/inventory-manager.js` | 492 | Archive, equipment, character profile, injuries, weight, crafting, compare |
| `js/engine/companion-manager.js` | 112 | Roster, activation, levels, reconciliation |
| `js/engine/combat-engine.js` | 211 | Original deterministic quick-resolve (preserved) |
| `js/engine/tactical-combat.js` | 549 | Decisions, behaviours, statuses, injuries, replay |
| `js/engine/quest-engine.js` | 435 | Mission generation, progress, rewards, failure, history |
| `js/engine/lore-generator.js` | 138 | Deterministic narrative templates |
| `js/engine/ai-cartographer.js` | 319 | Optional AI client, context, validation, offline fallback |
| `js/engine/shared-universe.js` | 180 | Public profile/expedition/bundle payloads, outbox/inbox, local stats |
| `js/engine/expedition-history.js` | 167 | Archived records, mission attachment, conclusion narrative |
| `js/engine/expedition-engine.js` | 582 | Lifecycle, field actions, XP/quest hooks, tactical application, tuner |
| `js/ui/sigil.js` | 298 | Procedural item sigils, world art, matrix chart |
| `js/ui/render.js` | 775 | Header, nav, archive grid, matrix, compare tray, global actions |
| `js/ui/panels.js` | 794 | Telemetry dossier, tuner, operations/tactical, resources, companions, log |
| `js/ui/deck.js` | 565 | Mission Control, Cartographer, World Codex, Data Vault |

### Optional server (`server/`)

| Path | Lines | Role |
|---|---:|---|
| `ai-proxy.mjs` | 223 | Static file server + `POST /api/cartographer`, `GET /health`; server-side key |
| `README.md` | 35 | Usage, security properties, endpoints |

### Tests & tooling (`work/`)

| Path | Lines | Role |
|---|---:|---|
| `e2e.js` | 358 | Phase 1 regression suite (50 checks) |
| `e2e-phase2.js` | 233 | Progression, missions, AI, export, tactical, migration (41 checks) |
| `e2e-phase2b.js` | 307 | Failure/rewards, AI validation, unlock, audit, responsive, security (45 checks) |
| `e2e-phase2c.js` | 148 | Shared universe, discovery archive, fallback, conclusion (19 checks) |
| `mock-provider.mjs` | 10 | Local OpenAI-compatible mock used by proxy tests |
| `responsive.js` | 20 | Standalone width sweep 1440→360 px |
| `filetest.js` | 18 | `file://` offline boot check |

### Intentionally excluded from the archive

- `backups/phase1-baseline/`, `backups/phase2-complete/` — internal checkpoints, duplicate the same source.
- `files/js/ui/sedsP2b8p` — zero-byte artifact left by a sandboxed rename failure; unreferenced by the app.
- Screenshot/utility scripts (`work/shots*.js`, `work/*-shot.js`, `work/debug.js`, `work/theme-*.js`) and all generated PNGs.
- No `node_modules` or package manager state is required.

**Archive totals:** 36 files (25 application + 2 server + 7 test/tooling + this handoff + `MANIFEST.sha256`), roughly 11,400 lines.

---

## 3. Major engines and modules

### `WF.util`
Seeded `mulberry32` RNG, stable string hashing, clamp/round/percent formatting, DOM query/event helpers, risk classification. All procedural output derives from this.

### `WF.data` / `data-expansion`
Static universe content: 7 worlds (6 base + unlockable *First Continuum*), 34 authored items across 8 categories, 5 companions, hazards, factions, enemies, resources, achievements, codex histories, mission vocabulary, lore templates.

### `WF.world`
Generates a complete expedition: world, name, sector/coordinates, conditions, two hazards (with exclusion rules), faction, resources, perks/penalties, objectives, enemy pool, difficulty, base survival, seed and narrative. Also generates procedural relics and field caches.

### `WF.routes`
Generates 4–5 routes from the seed; recalculates stability, compatibility, survival, collapse index, pick frequency, hazard exposure and resource requirement against the current character profile. Safest/deadliest flags drive the matrix highlight.

### `WF.inventory`
Owns the archive, quantity/equipment flags, resource pool, weight/capacity, crafting, comparison, and the **single authoritative character profile** (base + equipment + injuries + expedition penalties). Also owns the transparent survival breakdown used by header, tuner and history.

### `WF.companions`
Roster, activation (one at a time), profile-backed levels/affinity, compatibility scaling, reconciliation after import/migration. Bonuses feed inventory survival and tactical combat.

### `WF.combat` (preserved Phase 1)
Quick deterministic resolver: player damage, armour mitigation, crits, environmental ticks, companion support, loot. Used by auto-resolve and by the original test suite.

### `WF.tactical`
Advanced turn-based layer: Strike / Aimed / Guard / Overcharge / Field Kit / Withdraw; 5 enemy behaviours; statuses (burning, bleeding, exposed, guarded, stunned, irradiated, escort); companion combat abilities; injury thresholds; 14-round cap. Stores an immutable starting snapshot + decision log for exact replay.

### `WF.quests`
Seeded mission board (primary, secondary, hidden, exploration, resource, relic, faction, companion, multi-stage survival). Tracks real events, awards XP/resources, fails at close with consequences, and archives mission history.

### `WF.profile`
Permanent identity: callsign, level/XP curve, titles, stats, 20 achievements, world/sector/relic discovery records, companion standing, world unlocks. Never reset by expedition reroll.

### `WF.history`
Builds and stores expedition records: outcome, survival, integrity, corruption, damage, combat counts, equipment, missions, discoveries, route, companion, narrative and AI/template conclusion. Cap: 60 records.

### `WF.lore`
Deterministic narrative templates for introductions, discoveries, combat results, rest, closure and full archival narratives.

### `WF.ai`
Narrative-only optional layer. Builds sanitised context, calls a configured endpoint with timeout, validates output (40–4000 chars, no markup), falls back to templates on any failure. Never mutates state. Nine kinds.

### `WF.shared`
Backend-ready payloads: public profile (no inventory/resources/seeds), expedition share (seed + world + results), bundle, validation, local outbox/inbox, community aggregation over the local dataset. No network transmission.

### `WF.engine`
Expedition lifecycle and actions: reroll (archives and abandons current missions), reconstruct-from-seed, survey, deep scan, camp, consumables, quick/tactical engagement, injury treatment, finalize, tuner formula.

### `WF.store`
Persistence, schema versioning, v2→v3 migration, export/import validation, backup/restore, reset scopes. Single seam for future cloud storage.

### UI
- `sigil.js` — procedural item sigils, atmospheric world art (planets, rings, ruins, canopy), matrix SVG.
- `render.js` — header, view nav, inventory grid, matrix, compare tray, toasts, transitions, action router.
- `panels.js` — telemetry dossiers, tuner, operations/tactical, resources/crafting, companions, log.
- `deck.js` — Mission Control, Cartographer progression, World Codex, Data Vault/shared universe.

---

## 4. Startup instructions

### Offline (no install)

```bash
# Option A — direct file
open files/index.html          # macOS
xdg-open files/index.html      # Linux
# Windows: double-click files/index.html
```

`file://` works because all scripts are classic, all artwork is inline SVG, and no fetch occurs unless AI narrative is explicitly enabled with an endpoint.

### Local HTTP (recommended)

```bash
python3 -m http.server 8099 --directory files
# http://localhost:8099/index.html
```

### Optional AI proxy

```bash
AI_API_KEY=sk-... \
AI_MODEL=gpt-4o-mini \
AI_BASE_URL=https://api.openai.com/v1 \
PORT=8787 \
node server/ai-proxy.mjs
# http://localhost:8787/
```

In **Data Vault → AI Cartographer**, endpoint `/api/cartographer`, then Enable AI. Without a key the proxy returns 503 and the client uses templates.

### Tests

```bash
# from the package root; requires Playwright + Chromium available to Node
node work/e2e.js
node work/e2e-phase2.js
node work/e2e-phase2b.js
node work/e2e-phase2c.js
```

The suites expect the app at `http://localhost:8099/index.html` (start the HTTP server first). `e2e-phase2b.js` spawns `work/mock-provider.mjs` and the proxy on ports 8899/8787/8788.

---

## 5. Local storage structure & schema

### Keys

| Key | Purpose |
|---|---|
| `wayfinder.archive.v3` | Current state, schema version 3 |
| `wayfinder.archive.v2` | Legacy state; read-only, never deleted |
| `wayfinder.archive.v2.premigration` | Byte copy of the original v2 payload before migration |
| `wayfinder.archive.backup.v3` | Manual local backup (`{savedAt, schema, state}`) |

### v3 state shape

```js
{
  version: 3,
  createdAt: Number,
  expeditionNumber: Number,
  expedition: {
    id, number, seed, seedLabel, name, worldId, worldName, classification,
    tagline, worldDescription, glyph, palette, sector, placeName, coords,
    depth, conditions[], primaryHazard{}, secondaryHazard{}, faction,
    resources[], perks[], penalties[], objectives[], difficulty{},
    survivalBase, anomalyLevel, temporalStability, integrity,
    enemyPool[], narrative, createdAt
  },
  routes: [{ id, designation, name, terrain, distance, base{}, stability,
             compatibility, survivalRate, collapseIndex, hazardExposure,
             resourceRequirement, pickFreq, coords{x,y}, isSafest, isDeadliest }],
  activeRouteId,
  archive: [{ instanceId, id, name, category, rarity, level, classification,
              lore, discovery, bonuses{}, ability{}, compat[], extraSpecs[],
              weight, value, qty, equipped, craft?, procedural? }],
  resources: { scrapMetal, ancientCircuits, quantumCrystals, voidEssence,
               medicalSupplies, energyCells, foodRations, relicFragments },
  condition: 0..100,
  eventAdjust: Number,
  hazardShield: Number,
  tuner: { supplies, overclock },
  history: [ ExpeditionRecord ],
  log: [ LogEntry ],
  lastCombat: Object|null,
  pendingEncounter: Object|null,
  tactical: Object|null,          // active battle (seed, snapshot, decisions)
  injuries: [{ id, name, severity, effect{}, source, acquiredAt }],
  narratives: [{ id, kind, text, source: 'ai'|'template', at, ... }],
  quests: [ Quest ],
  questHistory: [ ArchivedQuest ],
  profile: {
    id, callsign, createdAt, level, xp, xpTotal,
    stats: { expeditions, completed, partial, lost, bestSurvival,
             survivalSum, damageTaken, resourcesCollected, relicsRecovered,
             combats, victories, missionsComplete, missionsFailed,
             fieldActions, routesTaken, lowestConditionComplete,
             flawlessRuns, archivePeak, worldsVisited{}, firstPlayed, lastPlayed },
    achievements: { [id]: { unlockedAt, name, tier } },
    discoveredWorlds: { [worldId]: { firstAt, expeditions, bestSurvival } },
    discoveredSectors: { "world::sector": { sector, coords, seed, number, ... } },
    relicCollection: { [itemId]: { name, rarity, firstAt } },
    companions: { [companionId]: { xp, level, missions, affinity } },
    unlockedWorlds: [worldId],
    titles: [String],
    settings: { ai: { enabled, endpoint } }
  },
  shared: { publications: [], inbox: [], profilePublished },
  settings: { category, search, sort },
  selection: { itemId, compare[] },
  ui: { telemetryTab, view, codexWorld },
  meta: { schema, createdAt, migrations[] }
}
```

### Migration rules

- v2 → v3 adds all Phase 2 fields, seeds world discovery from existing history, preserves every Phase 1 field.
- v1 is treated as v2.
- Unknown/future schemas are rejected on import, not silently truncated.
- The original v2 payload is copied to `premigration` before first v3 save.

### Export / import

- Export: `{app:"wayfinder-archive", schema:3, exportedAt, generator, state}`.
- Import validates app identity, schema ceiling, archive and expedition presence; migrates forward; replaces state after confirmation.
- Backups are manual snapshots with restore.

---

## 6. Dependencies & external services

### Runtime

**None.** No npm packages, no CDN, no web fonts, no image assets. Browser APIs only: DOM, Canvas-free SVG, localStorage, fetch (optional AI), FileReader/Blob (import/export), AbortController.

### Optional server

- Node.js 20+ (uses `fetch`, `AbortController`, ES modules).
- No npm dependencies (built-in `http`, `fs`, `path`, `url`).
- An OpenAI-compatible chat-completions provider; `AI_API_KEY`, optional `AI_BASE_URL`, `AI_MODEL`.

### Tests

- Playwright (`playwright` package) with Chromium.
- Node.js 20+.

### Browser support

Modern Chromium/Firefox/Safari assumed. Automated verification is Chromium-only. `:has()` is used for quest-card accenting (supported in current evergreen browsers); it is cosmetic only.

---

## 7. Known limitations

1. **AI narrative requires deployment.** No provider is bundled or called by default; offline templates are always available.
2. **Shared universe is local-only.** Outbox/inbox, public profiles and bundle payloads exist, but there is no account system, sync, public feed or server-side aggregation.
3. **No multiplayer or real-time sync** (explicitly out of Phase 2 scope).
4. **Combat is abstract/positionless.** Tactical decisions are turn-based; there is no grid, cover geometry or line-of-sight.
5. **No multi-expedition campaign.** Missions are multi-stage, but expeditions are single runs.
6. **Proxy is development-grade.** No TLS, authentication, persistent rate-limit store or observability. Put behind a hardened reverse proxy for public use.
7. **Browser test coverage is Chromium-only.**
8. **`Path Selection Frequency`, threat projections and community statistics are simulated/local**, and labelled as such in the UI.
9. **No localization.** UI strings and narrative templates are English-only.
10. **The zero-byte `files/js/ui/sedsP2b8p` artifact is excluded**; it was never referenced and has no runtime effect.

---

## 8. Test suite & latest results

| Suite | Scope | Result |
|---|---|---|
| `work/e2e.js` | Phase 1 regression: load, archive search/filter, dossier, equip deltas, reroll, route regeneration, world hazards, tuner formula, resources, combat, companions, crafting, finalize, persistence, compare, mobile | **50/50** |
| `work/e2e-phase2.js` | Profile, missions, progression UI, codex, vault, offline AI, export, tactical, replay, XP, persistence, v2 migration, responsive | **41/41** |
| `work/e2e-phase2b.js` | Mission failure/rewards, deterministic quests, companion progression, level/unlock, AI validation, export/import, action variety, dead-control audit, responsive, proxy security, offline `file://` | **45/45** |
| `work/e2e-phase2c.js` | Shared-universe payloads/outbox/inbox/reconstruction, discovery archive, AI failure fallback + no mechanical mutation, conclusions, checkpoint existence | **19/19** |

**Latest total: 155/155 passing**, zero application console errors. Responsive sweeps report 0 px horizontal overflow at 1440, 1280, 1024, 900, 768, 560, 390 and 360 px across all five views.

Note: the Phase 2C suite checks for `backups/phase1-baseline`; that directory is intentionally absent from this export. Remove or adapt that single assertion for external CI (`Recoverable baseline checkpoint exists`).

---

## 9. Unfinished functionality

- Account system, authentication and cloud sync.
- Public discovery/relic feed and cross-player community statistics.
- Real-time or asynchronous multiplayer expeditions.
- Multi-expedition campaign / branching world-state consequences.
- Positional tactical grid, cover, line-of-sight.
- Server-authoritative validation of saves and seeds (currently client-local).
- CI pipeline, cross-browser matrix (WebKit/Firefox), accessibility audit.
- Localization/i18n and RTL layout.
- Production hardening of the optional proxy (TLS, auth, durable rate limits, logging, provider failover).

---

## 10. Safe modification & extension guide

### 10.1 Ground rules

1. **Keep the module pattern** (`(function(WF){ ... })(window.WF = window.WF || {})`) and load order: utils → data → data-expansion → profile → engines → state → UI → app.
2. **Mechanics live in engines, never in renderers.** UI handlers may call engine functions and save state, but must not compute combat/survival/route values.
3. **All randomness must come from `WF.util.RNG`** seeded from the expedition seed (or an explicitly recorded action counter). Never use `Math.random()` for gameplay.
4. **Any state shape change requires a schema bump and migration.** Add a `migrateFromVn` path, keep prior keys readable, and test old payloads.
5. **Never let AI/network output touch state.** Narrative is display-only.
6. **Preserve the Phase 1 quick-combat API** (`WF.combat.resolve`) and its tests; extend through `WF.tactical` instead of rewriting.

### 10.2 Common changes

**Add an item or companion**
- Add definition to `data.js` (or a new data module) with required fields: `id, name, category, rarity, level, classification, lore, discovery, bonuses, ability, compat, extraSpecs, weight, value`.
- Archive seeding is automatic via `WF.inventory.ensure`.
- Add a crafting recipe via `craft` if desired.
- Run the entitlement/equip tests.

**Add a world**
- Append a full world object to `WORLDS` (hazards, factions, perks, penalties, objectives, resources, nameParts, enemies, loreIntro, palette, routeWords).
- If unlockable, set `locked: true, unlockLevel`.
- Add a codex entry in `data-expansion.js`; add the hazard table entry in the world-hazard test if the suite validates it.
- Generated names/sectors are automatic.

**Add a mission kind**
- Extend `KIND_LABEL` and `generate()` in `quest-engine.js`.
- Feed real events through `WF.quests.progress({type,...})` from an engine action.
- Add UI rendering in `deck.renderMissions` (class `quest-kind <kind>`); rewards/failure/history are handled generically.

**Add a tactical action**
- Extend `WF.tactical.ACTIONS` and `act()` resolution.
- Keep it deterministic: derive all rolls from `battle.seed + round + decisions.length`.
- Decisions are recorded automatically; replay requires no extra work.
- Add UI affordance in `panels.tacticalHtml` (it renders from `ACTIONS`).

**Change a formula**
- Update the engine and every display derived from it (`survivalBreakdown`, `tunerResult`, route metrics).
- Update the handoff/README formula documentation.
- Re-run the full suite; several tests assert exact tuner math and stat deltas.

**Extend persistence**
- Bump `VERSION`, add defaults/hydration, write `migrateFromVn`.
- Add import/export coverage and a v(n−1) fixture test.

**Connect a backend**
- Replace `WF.store.save/load/importPayload` with an adapter; keep the same state shape.
- Publish `WF.shared` payloads to your API; keep local outbox as an offline queue.
- Never trust client seeds/saves for competitive features without server validation.

**Add AI capabilities**
- Extend `WF.ai.KINDS` + fallback + context, and the proxy allow-list.
- Keep validation/sanitisation and the “no mechanical mutation” invariant.
- Keep the offline path fully functional.

### 10.3 Debugging

`window.WF_APP` exposes `{ state, ui, engine, store }` in development. `window.__WF_ERRORS` captures runtime errors; the header surfaces a boot error banner if initialization fails. All modules are also reachable directly on `window.WF`.

---

## 11. Export verification

See the accompanying export report. The archive contains this document at its root, the complete `files/` application, `server/`, and the runnable `work/` test suites; directory structure and filenames are preserved, and the ZIP is validated by CRC, by a clean extraction, and by booting the extracted app from `file://`. `MANIFEST.sha256` lists a SHA-256 for every file.
