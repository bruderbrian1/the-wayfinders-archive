# The Wayfinder's Archive — Phase 2

**Persistent Universe & AI-Powered Survival Adventure**
A single-page exploration, survival and progression universe. No build step, no required backend, no external API keys in the browser.

Phase 1 (procedural terminal) is preserved intact; Phase 2 layers persistence, missions, tactical combat, optional AI narrative and shared-universe data on top of it.

---

## 1. Run it

```bash
# offline, zero dependencies
open files/index.html

# or over HTTP (recommended for storage parity)
python3 -m http.server 8099 --directory files
# → http://localhost:8099/

# optional AI narrative proxy (server-side key only)
AI_API_KEY=sk-... AI_MODEL=gpt-4o-mini node server/ai-proxy.mjs
# → http://localhost:8787/
```

Everything except the optional proxy runs with no network access. `file://` is supported.

---

## 2. File map

```
files/
├─ index.html                       # shell + script order
├─ css/styles.css                   # design system, deck views, tactical UI, responsive
├─ README.md
└─ js/
   ├─ core/
   │  ├─ utils.js                   # seeded RNG, formatting, DOM, humanize
   │  ├─ data.js                    # 6 base worlds, items, companions, lore tables
   │  ├─ data-expansion.js          # First Continuum, world codex, achievements, mission vocab
   │  ├─ profile.js                 # persistent identity, XP, levels, unlocks, discoveries
   │  └─ state.js                   # single state, v3 schema, v2 migration, export/import/backup
   ├─ engine/
   │  ├─ world-generator.js         # seeded expeditions, procedural relics/supplies
   │  ├─ route-calculator.js        # journey matrix metrics
   │  ├─ inventory-manager.js       # archive, equipment, character profile, crafting
   │  ├─ companion-manager.js       # roster, levels, activation, reconciliation
   │  ├─ combat-engine.js           # original deterministic quick-resolve
   │  ├─ tactical-combat.js         # decisions, behaviours, statuses, injuries, replay
   │  ├─ quest-engine.js            # mission board, progress, rewards, failure, history
   │  ├─ lore-generator.js          # deterministic narrative templates
   │  ├─ ai-cartographer.js         # optional narrative client + offline fallback + validation
   │  ├─ shared-universe.js         # public profiles, share payloads, local outbox/inbox
   │  ├─ expedition-history.js      # persistent records + missions + conclusion
   │  └─ expedition-engine.js       # lifecycle, actions, combat application, tuner
   ├─ ui/
   │  ├─ sigil.js                   # procedural SVG sigils, world art, matrix
   │  ├─ render.js                  # header, nav, archive, matrix, events, actions
   │  ├─ panels.js                  # telemetry, tuner, operations, resources, log
   │  └─ deck.js                    # missions, progression, codex, vault, shared universe
   └─ app.js                        # bootstrap, error surface, shortcuts
server/
├─ ai-proxy.mjs                    # optional static server + narrative proxy
└─ README.md                       # proxy security and usage
```

24 production app files, ~9,500 lines (including the optional server), plus this README. Phase 1 baseline is preserved at `backups/phase1-baseline/`.

---

## 3. Persistence & progression

Permanent state lives in `state.profile`; expedition state stays in the expedition itself.

- **Identity** — callsign, ID, created date, titles.
- **Levels** — XP curve `120 + (level − 1) × 90`; titles conferred automatically.
- **Stats** — expeditions, completed/lost/partial, best survival, damage, resources, relics, combats, victories, missions complete/failed, sectors charted, flawless runs.
- **Achievements** — 20 permanent achievements across bronze/silver/gold/mythic tiers, each awarding XP.
- **Discoveries** — worlds charted (first visit, runs, best survival), every sector with its seed/coordinates, relic collection.
- **Companion progression** — per-companion XP, level, affinity and mission count; levels scale effective bonuses.
- **Unlockable content** — the seventh world, *The First Continuum*, unlocks at level 8; all base worlds remain available.
- **Expedition separation** — condition, injuries, quests, routes and narratives reset per expedition; profile and history do not.

XP is awarded for surveys, scans, relics, combat, missions, camping, expedition closure and achievements. Nothing is awarded by reroll alone (anti-farming).

---

## 4. Mission engine

Every expedition generates a deterministic mission board from its seed:

| Kind | Driven by |
|---|---|
| Primary | first generated objective |
| Secondary | second generated objective |
| Exploration | survey count |
| Resource | actual resource collection event |
| Relic (hidden) | revealed by Deep Scan |
| Faction | combat victories against the sector faction |
| Companion | field actions while that companion is active |
| Survival | integrity at expedition close |
| Hidden | unrevealed until a scan/combat event |

Each mission has stages with real counters, XP and resource rewards, failure rules, and permanent history. Missions fail at close if not completed; hidden missions fail if never revealed. Completion/failure is deterministic for a given seed plus the recorded player decisions.

Mission Control shows the live board, per-stage progress, rewards, permanent mission history, and the narrative dispatch feed.

---

## 5. Tactical combat

`WF.tactical` sits alongside the original `WF.combat` (kept for auto-resolve and regression compatibility).

- **Actions**: Strike, Aimed Shot, Guard, Overcharge, Field Kit, Withdraw.
- **Enemy behaviours**: Aggressive, Defensive, Adaptive, Ambush, Swarm — each changes how the enemy acts.
- **Statuses**: burning, bleeding, exposed, guarded, stunned, irradiated, escort.
- **Companion abilities in combat**: GRAVEKEEPER escort reduction, ORACLE-7 behaviour reveal + crit, SABLE opening crit, ECHO lethal-blow undo, THORN regeneration.
- **Injuries**: crossing 50%/25% integrity applies real attribute penalties (laceration, sprain, concussion, radiation burn, temporal scar, deep trauma), treated with camp/medical supplies.
- **Determinism**: every battle stores its seed, full starting snapshot and ordered decision list. Replay runs in a sandbox and reproduces the exact outcome (`Replay Decisions`).

Environmental damage still uses the expedition's primary hazard and the matching resistance. Difficulty scales with expedition number and difficulty score.

---

## 6. AI Cartographer (optional)

`WF.ai` is narrative-only. It cannot mutate resources, survival, equipment, combat, missions or XP.

- **Offline default**: deterministic templates in `WF.lore` + `WF.ai.fallback` (9 narrative kinds).
- **With a proxy**: `POST /api/cartographer` receives `{kind, context}` and returns validated text. Context includes world data, hazards, faction, loadout, companion, missions, history and stats.
- **Validation**: HTML/script stripping, 40–4000 character bounds, unsafe-markup rejection.
- **Failure**: any network/validation/provider error falls back to templates and is surfaced as a fallback result.
- **Security**: no key in client code or browser storage. `server/ai-proxy.mjs` reads `AI_API_KEY` from the environment only, allow-lists kinds, caps body/context size, rate-limits, and never returns provider details.

Configure in **Data Vault → AI Cartographer**. Test Connection hits `/health`.

---

## 7. Shared universe (backend-ready, local-only)

`WF.shared` defines the future API shape without performing network calls:

- **Public profile** — identity, level, titles, achievements, aggregate stats, worlds, public relic names. Excludes archive, resources, routes and seeds.
- **Expedition share** — seed, number, world, sector, survival, outcome, hazards, discoveries, missions, route, companion.
- **Bundle** — profile + up to 10 expeditions.
- **Outbox / inbox** — publications and received payloads stored locally; both survive refresh.
- **Reconstruction** — any shared or archived expedition can be rebuilt deterministically from its seed and world.
- **Community statistics** — aggregated over the local outbox/inbox only, explicitly labelled as a local dataset.

Publishing is staged, not transmitted. Accounts, sync, public discovery feeds and multiplayer remain architectural preparation, not deployed services.

---

## 8. Storage, migration & data protection

- Current key: `wayfinder.archive.v3`.
- Legacy key: `wayfinder.archive.v2` — read, migrated forward, never deleted.
- Before migration the original v2 payload is copied to `wayfinder.archive.v2.premigration`.
- v1 states are treated as v2 and migrated.
- Migration adds profile, quests, quest history, injuries, narratives, shared universe, meta; preserves archive, resources, routes, expedition, tuner and history.
- Export/import: full JSON (`{app, schema, exportedAt, state}`), validated and migrated on import.
- Backup: `wayfinder.archive.backup.v3` with restore.
- Reset progression (keeps archive) and reset all, both confirmed.
- Invalid/foreign/newer-schema imports are rejected with a readable reason.

---

## 9. Interface

Five command views under one persistent header:

1. **Survival Deck** — original archive, telemetry, journey matrix, tuner, operations, tactical encounter, resources, companions, log.
2. **Mission Control** — live mission board, history, AI dispatch feed.
3. **Cartographer** — identity, XP, achievements gallery, companion development, world discovery records, expedition timeline, relic collection.
4. **World Codex** — seven worlds, histories, societies, factions, hazards, hostile index, relic index, all charted sectors with rebuild.
5. **Data Vault** — AI settings, security posture, export/import/backup/restore, resets, shared-universe outbox/inbox, diagnostics.

Responsive from 360 px to 1600 px+, no horizontal overflow at any tested width.

**Visual theme — "Deep Signal":** deep-space black with holographic cyan and neon magenta, drifting orrery rings, starfield and scanlines, glass HUD panels with corner brackets, clipped neon controls, and a rounded cyberpunk inventory grid with rarity rims. Procedural world art now includes banded planets, rim light and a slow drift behind a scan sweep (respects reduced-motion).

---

## 10. Tests

| Suite | Coverage | Result |
|---|---|---|
| `work/e2e.js` | original Phase 1 regression | **50/50** |
| `work/e2e-phase2.js` | progression, missions, AI, export, tactical, migration, persistence | **41/41** |
| `work/e2e-phase2b.js` | failure/rewards, AI validation, companion progression, level/unlock, action audit, responsive, proxy/security, offline | **45/45** |
| `work/e2e-phase2c.js` | shared universe, discovery archive, AI failure fallback, conclusion, checkpoints | **19/19** |

**Total: 155/155 passing**, no application console errors.

Run:

```bash
node work/e2e.js && node work/e2e-phase2.js && node work/e2e-phase2b.js && node work/e2e-phase2c.js
```

The proxy tests spawn a mock provider and verify sanitisation, allow-listing, 503-without-key, static serving and absence of credentials in client files. Offline `file://` boot and all views are tested separately.

---

## 11. Implemented vs prepared vs simulated

**Implemented:** persistence and migration, progression, achievements, unlocks, missions with stages/rewards/failure/history, deterministic tactical combat with statuses/injuries/replay, companion progression, AI client + offline templates + server proxy + validation, shared payloads/outbox/inbox/reconstruction, expanded UI, export/import/backup.

**Architectural preparation only:** user accounts, cloud sync, public discovery feeds, community aggregation across users, multiplayer, real-time features. Payload shapes and local flows exist; no backend service is deployed.

**Simulated / labelled:** route `Path Selection Frequency` (synthetic cohort), threat projections, community statistics scoped to the local dataset. All other displayed statistics are computed from state.

---

## 12. Known limitations

- AI narrative requires an operator-provided compatible endpoint; the shipped app never calls one by itself.
- Shared universe is local-only by design in this phase.
- No positional combat grid; tactical combat is turn-based and abstract by layer.
- Objectives are missions now, but there is no branching campaign across multiple expeditions.
- The optional proxy is a development server, not a hardened public deployment (no TLS, no account system).
- Weight counts carried gear + resources, not the archive database.
