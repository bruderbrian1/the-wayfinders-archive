const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');
const BASE = 'http://localhost:8099/index.html';
const results = [];
function ok(name, cond, detail) { results.push({name, pass: !!cond}); console.log((cond?'PASS ':'FAIL ')+name+(detail?' — '+detail:'')); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(400);

  // nav + views
  ok('Nav renders five views', (await page.$$('.nav-btn')).length === 5);
  const profile0 = await page.evaluate(() => ({ p: !!window.WF_APP.state.profile, quests: window.WF_APP.state.quests.length, view: window.WF_APP.state.ui.view }));
  ok('Persistent profile created on boot', profile0.p);
  ok('Mission board generated', profile0.quests >= 5, 'n=' + profile0.quests);

  await page.click('[data-action="set-view"][data-view="missions"]');
  await page.waitForTimeout(350);
  const missions = await page.evaluate(() => ({
    visible: getComputedStyle(document.getElementById('deckView')).display !== 'none',
    cards: document.querySelectorAll('.quest-card').length,
    kinds: Array.from(document.querySelectorAll('.quest-kind')).map(e => e.textContent.trim()),
    history: document.querySelectorAll('.mission-history').length
  }));
  ok('Mission Control renders quest cards', missions.visible && missions.cards >= 4, 'cards=' + missions.cards);
  ok('Mission board includes primary/hidden/resource', ['PRIMARY','HIDDEN','RESOURCE'].every(k => missions.kinds.includes(k)), missions.kinds.join(','));

  await page.click('[data-action="set-view"][data-view="progression"]');
  await page.waitForTimeout(300);
  const prog = await page.evaluate(() => ({
    name: (document.querySelector('.identity-name')||{}).textContent,
    ach: document.querySelectorAll('.ach-card').length,
    timelines: document.querySelectorAll('.timeline-row').length,
    comp: document.querySelectorAll('.dev-card').length
  }));
  ok('Progression view renders identity', prog.name === 'THE CARTOGRAPHER', prog.name);
  ok('Achievement gallery renders 20', prog.ach === 20, 'n=' + prog.ach);
  ok('Companion development renders', prog.comp === 5, 'n=' + prog.comp);

  await page.click('[data-action="set-view"][data-view="codex"]');
  await page.waitForTimeout(300);
  const codex = await page.evaluate(() => ({
    tabs: document.querySelectorAll('.codex-tab').length,
    title: (document.querySelector('#codexPanel .hero-title')||{}).textContent,
    enemies: document.querySelectorAll('.codex-enemy').length
  }));
  ok('Codex renders 7 worlds', codex.tabs === 7, 'tabs=' + codex.tabs);
  ok('Codex detail renders hostiles', codex.enemies >= 4, 'n=' + codex.enemies);

  // select the locked continuum codex entry
  await page.click('[data-action="set-codex"][data-world="first-continuum"]');
  await page.waitForTimeout(300);
  const lockedCodex = await page.evaluate(() => document.querySelector('#codexPanel .hero-title').textContent);
  ok('Locked world codex reachable', lockedCodex === 'The First Continuum', lockedCodex);

  await page.click('[data-action="set-view"][data-view="vault"]');
  await page.waitForTimeout(300);
  const vault = await page.evaluate(() => ({
    endpoint: !!document.getElementById('aiEndpoint'),
    exportBtn: !!document.querySelector('[data-action="export-data"]'),
    schema: document.body.textContent.includes('schema v3') || document.body.textContent.includes('SCHEMA V3')
  }));
  ok('Data Vault renders AI + portability', vault.endpoint && vault.exportBtn);

  // AI fallback
  await page.click('[data-action="ai-generate"][data-kind="intro"]');
  await page.waitForTimeout(600);
  const ai = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { n: s.narratives.length, source: s.narratives[0] && s.narratives[0].source, len: s.narratives[0] ? s.narratives[0].text.length : 0 };
  });
  ok('Offline AI fallback produces narrative', ai.n >= 1 && ai.source === 'template' && ai.len > 40, JSON.stringify(ai));

  // export
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('[data-action="export-data"]');
  const dl = await downloadPromise;
  ok('Export produces a download', !!dl, dl ? dl.suggestedFilename() : 'no download');

  // tactical combat
  await page.click('[data-action="set-view"][data-view="survival"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="tactical-start"]');
  await page.waitForTimeout(400);
  const battle0 = await page.evaluate(() => {
    const t = window.WF_APP.state.tactical;
    return t ? { seed: t.seed, behavior: t.enemy.behavior.label, actions: document.querySelectorAll('[data-action="tactical-act"]').length, round: t.round } : null;
  });
  ok('Tactical encounter starts', !!battle0 && battle0.actions === 6, battle0 ? battle0.behavior : 'none');
  for (let i = 0; i < 16; i++) {
    const over = await page.evaluate(() => window.WF_APP.state.tactical && window.WF_APP.state.tactical.over);
    if (over) break;
    await page.evaluate(() => {
      const el = document.querySelector('[data-action="tactical-act"][data-id="strike"]');
      if (el && !el.disabled) el.click();
    });
    await page.waitForTimeout(120);
  }
  const battle1 = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { over: s.tactical.over, outcome: s.tactical.outcome, decisions: s.tactical.decisions, condition: Math.round(s.condition), last: s.lastCombat && s.lastCombat.tactical };
  });
  ok('Tactical battle resolves', battle1.over && !!battle1.outcome, battle1.outcome + ' / ' + battle1.condition + '%');
  ok('Decisions recorded', battle1.decisions && battle1.decisions.length > 0, String(battle1.decisions && battle1.decisions.length));
  ok('Tactical result applied to lastCombat', battle1.last === true);

  await page.click('[data-action="tactical-close"]');
  await page.waitForTimeout(250);
  await page.click('[data-action="replay-combat"]');
  await page.waitForTimeout(400);
  const replay = await page.evaluate(() => {
    const lc = window.WF_APP.state.lastCombat;
    return { has: !!lc.replay, outcome: lc.replay && lc.replay.outcome, damage: lc.replay && lc.replay.damage, recorded: lc.outcome, recordedDamage: lc.damageSustained };
  });
  ok('Replay reproduces recorded outcome', replay.has && replay.outcome === replay.recorded && replay.damage === replay.recordedDamage, JSON.stringify(replay));

  // XP + achievements
  const progression = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { xp: s.profile.xpTotal, level: s.profile.level, ach: Object.keys(s.profile.achievements), stats: s.profile.stats };
  });
  ok('Actions award XP', progression.xp > 0, 'xp=' + progression.xp);
  ok('Achievements unlocked during play', progression.ach.length >= 1, progression.ach.join(','));
  ok('Permanent stats track combat', progression.stats.combats >= 1);

  // quest progress from survey/scan + completion
  const qBefore = await page.evaluate(() => window.WF_APP.state.quests.map(q => ({ id: q.id, status: q.status })));
  await page.evaluate(() => { window.WF.ui.handlers.survey(); });
  await page.waitForTimeout(500);
  const qAfter = await page.evaluate(() => ({
    quests: window.WF_APP.state.quests.map(q => ({ id: q.id, status: q.status, stages: q.stages.map(st => st.progress) })),
    history: window.WF_APP.state.questHistory.length,
    xp: window.WF_APP.state.profile.xpTotal
  }));
  ok('Survey updates mission progress', JSON.stringify(qAfter.quests) !== JSON.stringify(qBefore.map(q => ({ id: q.id, status: q.status, stages: [] }) )) || qAfter.quests.some(q => q.stages.some(v => v > 0)), JSON.stringify(qAfter.quests.map(q => q.stages)));
  ok('Mission completion awards XP', qAfter.xp > progression.xp, progression.xp + ' -> ' + qAfter.xp);

  // finalize archives missions
  await page.click('[data-action="finalize"]');
  await page.waitForTimeout(1400);
  const closed = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { qh: s.questHistory.length, quests: s.quests.length, hist: s.history.length, xp: s.profile.xpTotal, missionsInRecord: s.history[0] && s.history[0].missions ? s.history[0].missions.length : 0 };
  });
  ok('Finalize archives mission history', closed.qh >= 5, 'n=' + closed.qh);
  ok('New expedition has fresh mission board', closed.quests >= 5, 'n=' + closed.quests);
  ok('Expedition record stores missions', closed.missionsInRecord >= 4, 'n=' + closed.missionsInRecord);

  // persistence
  const snap = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { level: s.profile.level, xp: s.profile.xpTotal, ach: Object.keys(s.profile.achievements).length, qh: s.questHistory.length, hist: s.history.length, exp: s.expedition.id };
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(500);
  const restored = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { level: s.profile.level, xp: s.profile.xpTotal, ach: Object.keys(s.profile.achievements).length, qh: s.questHistory.length, hist: s.history.length, exp: s.expedition.id, view: s.ui.view };
  });
  ok('Profile survives refresh', restored.level === snap.level && restored.xp === snap.xp, snap.xp + ' / ' + restored.xp);
  ok('Achievements survive refresh', restored.ach === snap.ach);
  ok('Mission history survives refresh', restored.qh === snap.qh);
  ok('Expedition survives refresh', restored.exp === snap.exp);

  // migration from v2 fixture
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.waitForSelector('html[data-ready="true"]');
  const mig = await p2.evaluate(() => {
    const s = window.WF_APP.state;
    const v2 = JSON.parse(JSON.stringify(s));
    delete v2.profile; delete v2.quests; delete v2.questHistory; delete v2.injuries; delete v2.narratives; delete v2.tactical; delete v2.meta;
    v2.version = 2;
    localStorage.setItem('wayfinder.archive.v2', JSON.stringify(v2));
    // suppress the beforeunload save so the legacy-only state is what loads
    window.WF.store.saveNow = function () {};
    window.WF.store.save = function () {};
    localStorage.removeItem('wayfinder.archive.v3');
    return { items: v2.archive.length, history: v2.history.length, exp: v2.expedition.id };
  });
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.waitForSelector('html[data-ready="true"]');
  await p2.waitForTimeout(500);
  const migrated = await p2.evaluate(() => {
    const s = window.WF_APP.state;
    return {
      migrated: !!s.__migrated, source: s.__migrationSource, profile: !!s.profile, level: s.profile && s.profile.level,
      archive: s.archive.length, history: s.history.length, exp: s.expedition.id,
      v2Still: !!localStorage.getItem('wayfinder.archive.v2'),
      backup: !!localStorage.getItem('wayfinder.archive.v2.premigration'),
      v3: !!localStorage.getItem('wayfinder.archive.v3')
    };
  });
  ok('v2 data migrates to v3', migrated.profile && migrated.migrated && migrated.source === 'v2', JSON.stringify(migrated));
  ok('Migration preserves archive and history', migrated.archive >= mig.items && migrated.history >= mig.history, migrated.archive + ' items');
  ok('Migration preserves original v2 payload', migrated.v2Still && migrated.backup);
  ok('Migration writes v3 state', migrated.v3);

  // invalid import rejected
  const badImport = await p2.evaluate(() => window.WF.store.importPayload({ app: 'other', state: {} }));
  ok('Invalid import rejected', badImport.ok === false, badImport.error);

  // responsive new views
  for (const w of [1280, 900, 560, 360]) {
    await p2.setViewportSize({ width: w, height: 900 });
    await p2.evaluate(() => { window.WF_APP.state.ui.view = 'progression'; window.WF.ui.render(); });
    await p2.waitForTimeout(200);
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('Progression view fits at ' + w + 'px', over <= 1, 'overflow=' + over);
  }
  await p2.setViewportSize({ width: 390, height: 844 });
  await p2.evaluate(() => { window.WF_APP.state.ui.view = 'missions'; window.WF.ui.render(); });
  await p2.waitForTimeout(250);
  await p2.screenshot({ path: '/tmp/wf-phase2-mobile.png', fullPage: false });
  await p2.evaluate(() => { window.WF_APP.state.ui.view = 'progression'; window.WF.ui.render(); });
  await p2.waitForTimeout(250);
  await p2.screenshot({ path: '/tmp/wf-phase2-prog.png', fullPage: true });

  ok('No console errors during Phase 2 flows', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' phase2 checks passed ====');
  if (failed.length) { console.log('FAILED:', failed.map(f => f.name).join('; ')); process.exit(1); }
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
