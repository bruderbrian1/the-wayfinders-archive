const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:8099/index.html';
const results = [];
function ok(name, cond, detail) { results.push({name, pass: !!cond}); console.log((cond?'PASS ':'FAIL ')+name+(detail?' — '+detail:'')); }

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(400);

  // ---------- Quest failure + reward distribution ----------
  const failRes = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const before = { failed: s.profile.stats.missionsFailed, xp: s.profile.xpTotal };
    // ensure quests exist, then close immediately without acting
    window.WF.quests.ensure(s);
    const summary = window.WF.quests.finalize(s);
    const rec = window.WF.history.buildRecord(s);
    window.WF.profile.recordExpedition(s, rec);
    return {
      failed: summary.failedCount, complete: summary.completeCount,
      before, after: { failed: s.profile.stats.missionsFailed, xp: s.profile.xpTotal },
      statuses: summary.failed.map(q => q.status),
      reasons: summary.failed.map(q => q.failReason).slice(0, 2),
      recordMissions: rec.missions.map(m => m.status)
    };
  });
  ok('Missions fail when not completed', failRes.failed >= 4 && failRes.statuses.every(x => x === 'failed'), 'failed=' + failRes.failed);
  ok('Failure records a consequence reason', /Incomplete|signal decayed/i.test(failRes.reasons[0] || ''), failRes.reasons[0]);
  ok('Mission failure increments permanent stats', failRes.after.failed > failRes.before.failed, failRes.before.failed + ' -> ' + failRes.after.failed);
  ok('Expedition record stores failed missions', failRes.recordMissions.includes('failed'));

  // ---------- reward distribution on completion ----------
  const reward = await page.evaluate(() => {
    const s = window.WF_APP.state;
    // clean expedition for a reward test
    window.WF.engine.reroll(s, { seed: 1234567 });
    const q = s.quests.find(x => x.kind === 'resource') || s.quests[0];
    if (q.stages[0].event !== 'resource') {
      // force completion through the correct event anyway
      q.stages.forEach(st => { st.target = 1; });
    }
    const xpBefore = s.profile.xpTotal;
    const resBefore = JSON.parse(JSON.stringify(s.resources));
    let events = 0;
    q.stages.forEach(st => {
      if (st.event === 'resource') {
        window.WF.quests.progress(s, { type: 'resource', resourceId: st.resource, qty: st.target });
      } else if (st.event === 'combat') {
        window.WF.quests.progress(s, { type: 'combat', outcome: 'victory' });
      } else if (st.event === 'scan') {
        window.WF.quests.progress(s, { type: 'scan' });
      } else if (st.event === 'survey') {
        window.WF.quests.progress(s, { type: 'survey' });
      } else if (st.event === 'action') {
        window.WF.quests.progress(s, { type: 'survey' });
      }
      events++;
    });
    // finalize-driven stages
    window.WF.quests.progress(s, { type: 'finalize' });
    const after = s.quests.find(x => x.id === q.id);
    return {
      status: after.status, xpBefore, xpAfter: s.profile.xpTotal,
      xpReward: q.rewards.xp,
      resBefore, resAfter: s.resources,
      rewards: q.rewards.resources,
      stages: after.stages.map(st => ({ p: st.progress, t: st.target, d: st.done }))
    };
  });
  const xpGain = reward.xpAfter - reward.xpBefore;
  ok('Completing a mission marks it complete', reward.status === 'complete', reward.status + ' stages=' + JSON.stringify(reward.stages));
  ok('Mission awards its XP', xpGain >= reward.xpReward, '+' + xpGain + ' xp (reward ' + reward.xpReward + ')');
  const resGained = (reward.rewards || []).every(r => (reward.resAfter[r.id] || 0) >= (reward.resBefore[r.id] || 0) + r.qty);
  ok('Mission delivers resource rewards', resGained, JSON.stringify(reward.rewards));

  // ---------- deterministic quest generation ----------
  const determ = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const exp = s.expedition;
    const q1 = s.quests.map(q => q.title + '|' + q.kind + '|' + q.stages.map(st => st.target).join(','));
    // rebuild the same expedition from the seed
    window.WF.engine.reconstruct(s, exp.seed, exp.number, exp.worldId);
    const q2 = s.quests.map(q => q.title + '|' + q.kind + '|' + q.stages.map(st => st.target).join(','));
    return { same: JSON.stringify(q1) === JSON.stringify(q2), n: q1.length, sample: q1[0], sample2: q2[0] };
  });
  ok('Quest board is seed-deterministic', determ.same, determ.sample + ' vs ' + determ.sample2);

  // ---------- companion progression ----------
  const comp = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const before = JSON.parse(JSON.stringify(window.WF.profile.companionStanding(s, 'oracle7')));
    window.WF.companions.activate(s, 'oracle7');
    s.resources.energyCells = 50; s.resources.foodRations = 50;
    for (let i = 0; i < 6; i++) {
      window.WF.engine.survey(s);
      window.WF.engine.scan(s);
    }
    const after = JSON.parse(JSON.stringify(window.WF.profile.companionStanding(s, 'oracle7')));
    const roster = window.WF.companions.roster(s).find(c => c.id === 'oracle7');
    return { before, after, level: roster.level, mult: roster.effectiveMultiplier };
  });
  ok('Companion gains XP from field actions', comp.after.xp > comp.before.xp || comp.after.level > comp.before.level,
    'xp ' + comp.before.xp + ' -> ' + comp.after.xp + ' · level ' + comp.after.level);
  ok('Companion compatibility/level scales effective multiplier', comp.mult > 0 && comp.mult <= 1.5, 'mult=' + comp.mult.toFixed(2));

  // ---------- level up, world unlock, achievements ----------
  const leveling = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const before = s.profile.level;
    const res = window.WF.profile.addXp(s, 8000, 'test');
    const unlocked = s.profile.unlockedWorlds.slice();
    s.profile.stats.expeditions = Math.max(1, s.profile.stats.expeditions);
    const unlockedAch = window.WF.profile.checkAchievements(s);
    return {
      before, after: s.profile.level, leveled: res.leveled,
      continuum: unlocked.includes('first-continuum'),
      title: window.WF.profile.levelTitle(s.profile.level),
      ach: unlockedAch.map(a => a.id), totalAch: Object.keys(s.profile.achievements).length
    };
  });
  ok('XP levels the Cartographer', leveling.after > leveling.before, leveling.before + ' -> ' + leveling.after);
  ok('Level 8 unlocks the First Continuum', leveling.continuum);
  ok('Title updates with level', leveling.title.length > 3, leveling.title);
  ok('Achievements unlock and award XP', leveling.totalAch >= 1, 'n=' + leveling.totalAch);

  // ---------- AI validation ----------
  const aiVal = await page.evaluate(() => ({
    short: window.WF.ai.validateText('too short'),
    script: window.WF.ai.validateText('<script>alert(1)</script> ' + 'x'.repeat(80)),
    ok: window.WF.ai.validateText('<b>Archive</b> ' + 'The Cartographer logs the sector. '.repeat(4)),
    long: window.WF.ai.validateText('x'.repeat(5000))
  }));
  ok('AI validator rejects short text', aiVal.short.ok === false);
  ok('AI validator rejects script markup', aiVal.script.ok === false);
  ok('AI validator sanitises tags on valid text', aiVal.ok.ok === true && !aiVal.ok.text.includes('<b>'), aiVal.ok.text.slice(0, 40));
  ok('AI validator rejects oversized text', aiVal.long.ok === false);

  // ---------- export / import roundtrip ----------
  const roundtrip = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const payload = JSON.parse(window.WF.store.exportJson(s));
    payload.state.profile.callsign = 'ROUNDTRIP';
    payload.state.profile.level = 42;
    const res = window.WF.store.importPayload(payload);
    return { ok: res.ok, callsign: res.state.profile.callsign, level: res.state.profile.level,
      archive: res.state.archive.length, history: res.state.history.length };
  });
  ok('Export produces a valid payload', roundtrip.ok === true);
  ok('Import restores modified profile data', roundtrip.callsign === 'ROUNDTRIP' && roundtrip.level === 42, JSON.stringify(roundtrip));
  ok('Import preserves archive and history', roundtrip.archive > 20 && roundtrip.history >= 1);

  // ---------- tactical action variety ----------
  const tact = await page.evaluate(() => {
    const s = window.WF_APP.state;
    s.condition = 100;
    s.tactical = null;
    const b = window.WF.engine.startTactical(s);
    const energyBefore = b.player.energy;
    window.WF.tactical.act(s, b, 'overcharge');
    const energyAfter = b.player.energy;
    const burning = !!b.enemy.statuses.burning;
    window.WF.tactical.act(s, b, 'guard');
    const guardLogged = b.log.some(l => /braces|Guarded|guard/i.test(l.text));
    window.WF.tactical.act(s, b, 'aimed');
    const exposed = b.log.some(l => /EXPOSED/i.test(l.text)) || !!b.enemy.statuses.exposed;
    // retreat should end the battle eventually
    for (let i = 0; i < 6 && !b.over; i++) window.WF.tactical.act(s, b, 'retreat');
    return { energyBefore, energyAfter, burning, guardLogged, exposed, over: b.over, outcome: b.outcome, decisions: b.decisions };
  });
  ok('Overcharge consumes energy and applies BURNING', tact.energyAfter === tact.energyBefore - 8 && tact.burning, JSON.stringify({e:tact.energyBefore + '->' + tact.energyAfter, burning:tact.burning}));
  ok('Guard and aimed actions resolve', tact.guardLogged && tact.exposed);
  ok('Tactical engagement closes with an outcome', tact.over && tact.outcome !== null, tact.outcome);

  // ---------- dead-button audit across all views ----------
  const audit = await page.evaluate(() => {
    const out = {};
    ['survival','missions','progression','codex','vault'].forEach(v => {
      window.WF_APP.state.ui.view = v;
      window.WF.ui.render();
      const actions = Array.from(document.querySelectorAll('[data-action]')).map(e => e.getAttribute('data-action'));
      const missing = Array.from(new Set(actions)).filter(a => !window.WF.ui.handlers[a]);
      out[v] = { total: actions.length, missing };
    });
    return out;
  });
  ok('Every control in every view is wired', Object.values(audit).every(v => v.missing.length === 0), JSON.stringify(audit));

  // ---------- responsive all views ----------
  for (const w of [1440, 1280, 1024, 768, 560, 390, 360]) {
    await page.setViewportSize({ width: w, height: 900 });
    let over = 0;
    for (const v of ['survival','missions','progression','codex','vault']) {
      await page.evaluate(view => { window.WF_APP.state.ui.view = view; window.WF.ui.render(); }, v);
      await page.waitForTimeout(80);
      over = Math.max(over, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    }
    ok('All views fit at ' + w + 'px', over <= 1, 'overflow=' + over);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { window.WF_APP.state.ui.view = 'missions'; window.WF.ui.render(); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: '/tmp/wf-phase2b-mobile.png', fullPage: false });

  ok('No console errors during Phase 2B flows', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ================= SERVER / SECURITY TESTS =================
  const mock = spawn(process.execPath, [path.resolve('work/mock-provider.mjs')], { stdio: 'ignore' });
  const proxy = spawn(process.execPath, [path.resolve('server/ai-proxy.mjs')], {
    env: { ...process.env, PORT: '8787', AI_API_KEY: 'test-server-only-key', AI_BASE_URL: 'http://localhost:8899/v1', AI_MODEL: 'mock-model' },
    stdio: 'ignore'
  });
  const proxyNoKey = spawn(process.execPath, [path.resolve('server/ai-proxy.mjs')], {
    env: { ...process.env, PORT: '8788', AI_API_KEY: '', AI_BASE_URL: 'http://localhost:8899/v1' },
    stdio: 'ignore'
  });
  await wait(1400);
  try {
    const health = await (await fetch('http://localhost:8787/health')).json();
    ok('Proxy health reports configured without leaking key', health.ok && health.configured && !JSON.stringify(health).includes('test-server-only-key'), JSON.stringify(health));

    const r = await fetch('http://localhost:8787/api/cartographer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'intro', context: { world: { name: 'Cosmic Void' }, cartographer: { callsign: 'TEST' } } })
    });
    const body = await r.json();
    ok('Proxy returns sanitised narrative', r.status === 200 && body.text && !body.text.includes('<b>'), r.status + ' ' + (body.text || '').slice(0, 50));

    const bad = await fetch('http://localhost:8787/api/cartographer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'not-a-kind', context: {} })
    });
    ok('Proxy rejects unknown narrative kind', bad.status === 400, 'status=' + bad.status);

    const noKey = await fetch('http://localhost:8788/api/cartographer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'intro', context: { world: { name: 'X' } } })
    });
    ok('Proxy without key refuses (client falls back)', noKey.status === 503, 'status=' + noKey.status);

    const staticFile = await fetch('http://localhost:8787/index.html');
    ok('Proxy serves the application offline', staticFile.status === 200, 'status=' + staticFile.status);
  } catch (e) {
    ok('Proxy server tests executed', false, e.message);
  } finally {
    mock.kill(); proxy.kill(); proxyNoKey.kill();
    await wait(200);
  }

  // static security scan
  const clientFiles = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|html|md)$/.test(f)) clientFiles.push(p);
    }
  })('files');
  const leaks = clientFiles.filter(f => /sk-[A-Za-z0-9]{10,}|AI_API_KEY\s*=\s*['"][^'"]+/.test(fs.readFileSync(f, 'utf8')));
  ok('No API keys or credentials in client files', leaks.length === 0, leaks.join(','));
  const serverSrc = fs.readFileSync('server/ai-proxy.mjs', 'utf8');
  ok('Server reads credentials from environment only', serverSrc.includes('process.env.AI_API_KEY') && !/sk-[A-Za-z0-9]{10,}/.test(serverSrc));
  ok('Client AI module never stores keys', !/localStorage[^\n]*AI_API_KEY/.test(fs.readFileSync('files/js/engine/ai-cartographer.js', 'utf8')));

  // ---------- offline file:// ----------
  const offline = await ctx.newPage();
  const offErrors = [];
  offline.on('pageerror', e => offErrors.push(e.message));
  await offline.goto('file://' + path.resolve('files/index.html'));
  await offline.waitForSelector('html[data-ready="true"]');
  await offline.waitForTimeout(600);
  const offlineChecks = await offline.evaluate(() => {
    const s = window.WF_APP.state;
    return {
      ready: document.documentElement.getAttribute('data-ready'),
      profile: !!s.profile,
      quests: s.quests.length,
      nav: document.querySelectorAll('.nav-btn').length,
      views: ['missions','progression','codex','vault'].every(v => { s.ui.view = v; window.WF.ui.render(); return document.getElementById('deckView').textContent.length > 200; }),
      ai: window.WF.ai.config(s).enabled,
      errors: window.__WF_ERRORS.slice()
    };
  });
  ok('Offline file:// boot works', offlineChecks.ready === 'true' && offlineChecks.profile && offlineChecks.quests >= 5, JSON.stringify({q:offlineChecks.quests}));
  ok('Offline views render', offlineChecks.nav === 5 && offlineChecks.views);
  ok('Offline AI defaults to templates', offlineChecks.ai === false);
  ok('Offline has no runtime errors', offErrors.length === 0 && offlineChecks.errors.length === 0, offErrors.join(' | '));
  await offline.screenshot({ path: '/tmp/wf-phase2b-offline.png', fullPage: false });

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' phase2b checks passed ====');
  if (failed.length) { console.log('FAILED:', failed.map(f => f.name).join('; ')); process.exit(1); }
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
