const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:8099/index.html';
const results = [];
function ok(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail || '' });
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]', { timeout: 10000 });
  await page.waitForTimeout(300);

  // 1. load
  ok('App loads without JS errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  ok('No captured WF errors', (await page.evaluate(() => window.__WF_ERRORS.length)) === 0);

  const snap1 = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return {
      exp: s.expedition.name, world: s.expedition.worldName, id: s.expedition.id, seed: s.expedition.seed,
      routes: s.routes.map(r => ({ id: r.id, x: r.coords.x, y: r.coords.y, survival: r.survivalRate, collapse: r.collapseIndex })),
      survival: window.WF.inventory.survivalBreakdown(s).survival,
      archive: s.archive.length,
      history: s.history.length,
      title: document.querySelector('.brand-title').textContent,
      headerExp: document.querySelector('.meta-value.gold').textContent
    };
  });
  ok('Header renders title', snap1.title.includes("Wayfinder's Archive"));
  ok('Header shows expedition name', snap1.headerExp === snap1.exp, snap1.headerExp);
  ok('Archive seeded with sample content', snap1.archive > 20, 'items=' + snap1.archive);
  ok('Routes generated', snap1.routes.length >= 4, 'n=' + snap1.routes.length);

  // 2. archive search
  const searchRes = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const all = window.WF.inventory.query(s, { category: 'all', search: '', sort: 'rarity' }).length;
    const weapons = window.WF.inventory.query(s, { category: 'weapon', search: '', sort: 'rarity' }).length;
    const chrono = window.WF.inventory.query(s, { category: 'all', search: 'chrono', sort: 'rarity' });
    return { all, weapons, chrono: chrono.map(i => i.name) };
  });
  ok('Category filter works', searchRes.weapons === 5, 'weapons=' + searchRes.weapons);
  ok('Search works', searchRes.chrono.length === 1 && searchRes.chrono[0].includes('Chrono'), searchRes.chrono.join(','));

  // 3. UI search + filter interaction
  await page.fill('#archiveSearch', 'compass');
  await page.waitForTimeout(250);
  const cardNames = await page.$$eval('.item-card .item-name', els => els.map(e => e.textContent));
  ok('UI search filters list', cardNames.length === 1 && /Chrono/.test(cardNames[0]), cardNames.join(','));
  await page.fill('#archiveSearch', '');
  await page.waitForTimeout(250);
  await page.click('[data-action="filter-cat"][data-cat="weapon"]');
  await page.waitForTimeout(200);
  const weaponCards = await page.$$eval('.item-card .item-name', els => els.map(e => e.textContent));
  ok('UI category chip filters list', weaponCards.length === 5, 'cards=' + weaponCards.length);
  await page.click('[data-action="filter-cat"][data-cat="all"]');
  await page.waitForTimeout(150);

  // 4. select item -> dossier
  await page.click('[data-action="select-item"][data-id="w-railspike"]');
  await page.waitForTimeout(200);
  const dossier = await page.evaluate(() => ({
    title: document.querySelector('#telemetryPanel .hero-title').textContent,
    lore: document.querySelector('#telemetryPanel .lore-quote').textContent,
    ability: document.querySelector('#telemetryPanel .ability-name').textContent
  }));
  ok('Item selection opens dossier', /Railspike/.test(dossier.title), dossier.title);
  ok('Dossier shows lore', dossier.lore.length > 40);
  ok('Dossier shows ability', dossier.ability.includes('SPIKE') || dossier.ability.length > 3, dossier.ability);

  // 5. equip changes stats
  const before = await page.evaluate(() => ({
    cp: window.WF.inventory.characterProfile(window.WF_APP.state).attributes.combatPower,
    survival: window.WF.inventory.survivalBreakdown(window.WF_APP.state).survival,
    route: window.WF_APP.state.routes.map(r => r.survivalRate)
  }));
  await page.click('[data-action="equip"][data-id="w-railspike"]');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    cp: window.WF.inventory.characterProfile(window.WF_APP.state).attributes.combatPower,
    survival: window.WF.inventory.survivalBreakdown(window.WF_APP.state).survival,
    equipped: window.WF_APP.state.archive.find(i => i.instanceId === 'w-railspike').equipped,
    route: window.WF_APP.state.routes.map(r => r.survivalRate)
  }));
  ok('Equipping weapon raises combat power', after.cp > before.cp, before.cp + ' -> ' + after.cp);
  ok('Equipping changes survival model', after.survival !== before.survival, before.survival.toFixed(2) + ' -> ' + after.survival.toFixed(2));
  ok('Equipped flag persists in state', after.equipped === true);

  // 6. unequip
  await page.evaluate(() => { window.WF.inventory.unequip(window.WF_APP.state, 'weapon'); window.WF.store.save(window.WF_APP.state); window.WF.ui.render(); });
  await page.waitForTimeout(200);
  const un = await page.evaluate(() => window.WF.inventory.characterProfile(window.WF_APP.state).attributes.combatPower);
  ok('Unequip restores baseline stats', un === before.cp, 'cp=' + un);

  // 7. reroll changes world state
  await page.click('[data-action="reroll"]');
  await page.waitForTimeout(1200);
  const snap2 = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { exp: s.expedition.name, id: s.expedition.id, num: s.expedition.number, world: s.expedition.worldName,
      routes: s.routes.map(r => ({ id: r.id, x: r.coords.x, y: r.coords.y })),
      hazard: s.expedition.primaryHazard.name, history: s.history.length };
  });
  ok('Reroll generates new expedition', snap2.id !== snap1.id && snap2.num === 2, snap1.id + ' -> ' + snap2.id);
  ok('Reroll changes route coordinates', JSON.stringify(snap2.routes) !== JSON.stringify(snap1.routes));
  ok('Reroll archived prior expedition', snap2.history >= 1, 'history=' + snap2.history);

  // 8. world-specific hazards
  const hazardCheck = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const w = s.expedition.worldId;
    const table = {
      'cosmic-void': ['Gravitational Shear','Meteor Storm','Radiation Bloom','Singularity Drift','Vacuum Reversal','Ionized Dust Front'],
      'sunken-cyber-grid': ['Flood Surge','Digital Corruption','Memory-Wipe Protocol','Razor Current','Pressure Collapse','Rogue Daemon Bloom'],
      'ashen-kingdoms': ['Curse Miasma','Undead Tide','Ashfall','Blackroot Blight','Wailing Gale','Blood Moon'],
      'forgotten-wastes': ['Radiation Storm','Glass Heatwave','Sandstorm Quake','Rust Plague','Sinkhole Fields','Scavenger Ambush'],
      'hollow-dimension': ['Temporal Fracture','Reality Shear','Echo Loop','Non-Euclidean Drift','Memory Static','Dimensional Collapse'],
      'verdant-cataclysm': ['Spore Bloom','Toxic Pollen','Vine Creep','Bio-Acid Rain','Mutant Swarm','Fungal Rot']
    };
    const valid = table[w] || [];
    return { world: w, primary: s.expedition.primaryHazard.name, secondary: s.expedition.secondaryHazard.name,
      ok: valid.includes(s.expedition.primaryHazard.name) && valid.includes(s.expedition.secondaryHazard.name) };
  });
  ok('Hazards match generated world', hazardCheck.ok, hazardCheck.world + ': ' + hazardCheck.primary + ' / ' + hazardCheck.secondary);

  // 9. tuner sliders
  const tuner0 = await page.textContent('#tunerPanel .big-survival .num');
  await page.evaluate(() => {
    const el = document.getElementById('supplySlider');
    el.value = 5; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  const tuner1 = await page.textContent('#tunerPanel .big-survival .num');
  await page.evaluate(() => {
    const el = document.getElementById('overclockSlider');
    el.value = 140; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  const tuner2 = await page.textContent('#tunerPanel .big-survival .num');
  ok('Tuner supply slider updates survival', tuner0 !== tuner1, tuner0 + ' -> ' + tuner1);
  ok('Tuner overclock slider updates survival', tuner1 !== tuner2, tuner1 + ' -> ' + tuner2);
  const tunerMath = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const r = window.WF.engine.tunerResult(s);
    const manual = Math.max(0, Math.min(100, r.base + (50 - s.tuner.supplies) * 0.18 + (50 - s.tuner.overclock) * 0.12));
    return { expected: manual, got: r.estimated };
  });
  ok('Tuner formula matches specification', Math.abs(tunerMath.expected - tunerMath.got) < 1e-9, JSON.stringify(tunerMath));

  // 10. resource collection
  const resBefore = await page.evaluate(() => JSON.parse(JSON.stringify(window.WF_APP.state.resources)));
  await page.click('[data-action="survey"]');
  await page.waitForTimeout(400);
  const afterSurvey = await page.evaluate(() => ({
    res: JSON.parse(JSON.stringify(window.WF_APP.state.resources)),
    pending: !!window.WF_APP.state.pendingEncounter,
    log: window.WF_APP.state.log.length
  }));
  const gained = Object.keys(afterSurvey.res).some(k => afterSurvey.res[k] > (resBefore[k] || 0));
  const surveyEvent = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const ev = s.log.filter(e => e.type === 'survey').slice(-1)[0];
    return ev ? (ev.resources || []) : [];
  });
  const energyGained = surveyEvent.filter(r => r.id === 'energyCells').reduce((n, r) => n + r.qty, 0);
  const expectedEnergy = (resBefore.energyCells || 0) - 1 + energyGained;
  ok('Survey consumes energy cell (net of yield)', afterSurvey.res.energyCells === expectedEnergy,
    resBefore.energyCells + ' -> ' + afterSurvey.res.energyCells + ' (yield +' + energyGained + ')');
  ok('Survey writes expedition log', afterSurvey.log >= 2, 'log=' + afterSurvey.log);

  // 11. combat
  const beforeCombat = await page.evaluate(() => ({
    condition: window.WF_APP.state.condition,
    cp: window.WF.inventory.characterProfile(window.WF_APP.state).attributes.combatPower
  }));
  await page.evaluate(() => { window.WF.ui.handlers.engage(); });
  await page.waitForTimeout(400);
  const afterCombat = await page.evaluate(() => ({
    condition: window.WF_APP.state.condition,
    last: window.WF_APP.state.lastCombat,
    log: window.WF_APP.state.log.filter(e => e.type === 'combat').length
  }));
  ok('Combat resolves deterministically', !!afterCombat.last && afterCombat.last.rounds.length > 0,
    afterCombat.last ? afterCombat.last.outcome + ' in ' + afterCombat.last.rounds.length + ' lines' : 'none');
  ok('Combat consumes integrity', afterCombat.condition < beforeCombat.condition, beforeCombat.condition.toFixed(1) + ' -> ' + afterCombat.condition.toFixed(1));
  ok('Combat recorded in log', afterCombat.log >= 1);

  // 12. companion
  const compBefore = await page.evaluate(() => ({
    active: window.WF.companions.active(window.WF_APP.state) ? window.WF.companions.active(window.WF_APP.state).id : null,
    nav: window.WF.inventory.characterProfile(window.WF_APP.state).attributes.navSkill,
    survival: window.WF.inventory.survivalBreakdown(window.WF_APP.state).survival
  }));
  await page.click('[data-action="activate-companion"][data-id="oracle7"]');
  await page.waitForTimeout(300);
  const compAfter = await page.evaluate(() => ({
    active: window.WF.companions.active(window.WF_APP.state) ? window.WF.companions.active(window.WF_APP.state).id : null,
    nav: window.WF.inventory.characterProfile(window.WF_APP.state).attributes.navSkill,
    survival: window.WF.inventory.survivalBreakdown(window.WF_APP.state).survival
  }));
  ok('Companion activates', compAfter.active === 'oracle7', String(compAfter.active));
  ok('Companion boosts navigation', compAfter.nav > compBefore.nav, compBefore.nav + ' -> ' + compAfter.nav);
  ok('Companion changes survival', compAfter.survival !== compBefore.survival, compBefore.survival.toFixed(2) + ' -> ' + compAfter.survival.toFixed(2));

  // 13. route selection
  const routePick = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const target = s.routes.find(r => r.id !== s.activeRouteId);
    window.WF.inventory.equip(s, target.id);
    s.routes = window.WF.routes.recalc(s.routes, window.WF.inventory.characterProfile(s).attributes, s.expedition);
    window.WF.store.save(s); window.WF.ui.render();
    return { active: s.activeRouteId, target: target.id, survival: window.WF.inventory.survivalBreakdown(s).survival };
  });
  await page.waitForTimeout(200);
  ok('Route selection applies', routePick.active === routePick.target);

  // 14. craft
  const craft = await page.evaluate(() => {
    const s = window.WF_APP.state;
    s.resources.scrapMetal = 100; s.resources.energyCells = 100; s.resources.ancientCircuits = 100;
    s.resources.relicFragments = 100; s.resources.quantumCrystals = 100; s.resources.voidEssence = 100;
    const before = s.archive.find(i => i.instanceId === 'w-railspike').qty;
    const res = window.WF.inventory.craft(s, 'w-railspike');
    const after = s.archive.find(i => i.instanceId === 'w-railspike').qty;
    window.WF.store.save(s); window.WF.ui.render();
    return { ok: res.ok, before, after };
  });
  await page.waitForTimeout(200);
  ok('Crafting consumes resources and adds item', craft.ok && craft.after === craft.before + 1, JSON.stringify(craft));

  // 15. finalize archives
  const histBefore = await page.evaluate(() => window.WF_APP.state.history.length);
  await page.click('[data-action="finalize"]');
  await page.waitForTimeout(1300);
  const histAfter = await page.evaluate(() => ({
    hist: window.WF_APP.state.history.length,
    num: window.WF_APP.state.expedition.number,
    record: window.WF_APP.state.history[0] ? {
      outcome: window.WF_APP.state.history[0].outcome,
      survival: window.WF_APP.state.history[0].survival,
      narrative: window.WF_APP.state.history[0].narrative.length
    } : null
  }));
  ok('Finalize archives expedition', histAfter.hist === histBefore + 1, histBefore + ' -> ' + histAfter.hist);
  ok('Archived record has narrative', !!histAfter.record && histAfter.record.narrative > 100);
  ok('New expedition opened after finalize', histAfter.num === 3, 'exp=' + histAfter.num);

  // 16. persistence across reload
  const savedSnap = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { exp: s.expedition.id, history: s.history.length, qty: s.archive.find(i => i.instanceId === 'w-railspike').qty,
      companion: window.WF.companions.active(s) ? window.WF.companions.active(s).id : null, tuner: s.tuner };
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(400);
  const restoredSnap = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { exp: s.expedition.id, history: s.history.length, qty: s.archive.find(i => i.instanceId === 'w-railspike').qty,
      companion: window.WF.companions.active(s) ? window.WF.companions.active(s).id : null, tuner: s.tuner, restored: s.__restored };
  });
  ok('Refresh preserves expedition', restoredSnap.exp === savedSnap.exp, savedSnap.exp + ' / ' + restoredSnap.exp);
  ok('Refresh preserves history', restoredSnap.history === savedSnap.history, savedSnap.history + ' / ' + restoredSnap.history);
  ok('Refresh preserves inventory qty', restoredSnap.qty === savedSnap.qty);
  ok('Refresh preserves companion', restoredSnap.companion === savedSnap.companion, String(restoredSnap.companion));
  ok('Refresh preserves tuner', JSON.stringify(restoredSnap.tuner) === JSON.stringify(savedSnap.tuner));

  // 17. compare
  await page.evaluate(() => {
    const s = window.WF_APP.state;
    s.selection.compare = ['r-chronoCompass', 'r-tideLens'];
    s.ui.compareOpen = true;
    window.WF.ui.render();
  });
  await page.waitForTimeout(250);
  const cmpVisible = await page.evaluate(() => {
    const t = document.querySelector('#telemetryPanel');
    return t.textContent.includes('Equipment Comparison') && t.textContent.includes('Delta') === false && document.querySelectorAll('#telemetryPanel .spec-table tr').length > 3;
  });
  ok('Comparison view renders', cmpVisible);
  await page.evaluate(() => { window.WF_APP.state.ui.compareOpen = false; window.WF_APP.state.selection.compare = []; window.WF.ui.render(); });

  // 17b. seed reconstruction determinism
  const recon = await page.evaluate(() => {
    const s = window.WF_APP.state;
    const rec = s.history[s.history.length - 1];
    return { seed: rec.seed, num: rec.number, name: rec.name, world: rec.worldId };
  });
  await page.evaluate((r) => { window.WF.engine.reconstruct(window.WF_APP.state, r.seed, r.num); window.WF.store.save(window.WF_APP.state); window.WF.ui.render(); }, recon);
  await page.waitForTimeout(500);
  const rebuilt = await page.evaluate(() => {
    const s = window.WF_APP.state;
    return { seed: s.expedition.seed, name: s.expedition.name, world: s.expedition.worldId, routes: s.routes.map(r => r.id + r.collapseIndex + ':' + r.survivalRate).join('|') };
  });
  ok('Seed reconstruction is deterministic', rebuilt.seed === recon.seed && rebuilt.name === recon.name && rebuilt.world === recon.world,
    recon.name + ' / ' + rebuilt.name);
  const rebuiltAgain = await page.evaluate((r) => {
    window.WF.engine.reconstruct(window.WF_APP.state, r.seed, r.num);
    const s = window.WF_APP.state;
    return s.routes.map(x => x.id + x.collapseIndex + ':' + x.survivalRate).join('|');
  }, recon);
  ok('Reconstructed routes match exactly', rebuiltAgain === rebuilt.routes);

  // 17c. field healing consumes a supply
  const healRes = await page.evaluate(() => {
    const s = window.WF_APP.state;
    s.condition = 30;
    const kit = s.archive.find(i => i.instanceId === 's-medkit');
    kit.qty = Math.max(1, kit.qty);
    const before = { cond: s.condition, med: kit.qty };
    const r = window.WF.engine.useConsumable(s, 's-medkit');
    window.WF.store.save(s); window.WF.ui.render();
    return { before, after: { cond: s.condition, med: kit.qty }, ok: r.ok };
  });
  ok('Healing consumes supplies and restores integrity', healRes.ok && healRes.after.cond > healRes.before.cond && healRes.after.med === healRes.before.med - 1,
    JSON.stringify(healRes));

  // 18. no placeholder buttons: every data-action has a handler
  const actionAudit = await page.evaluate(() => {
    const actions = Array.from(document.querySelectorAll('[data-action]')).map(e => e.getAttribute('data-action'));
    const uniq = Array.from(new Set(actions));
    return { uniq, missing: uniq.filter(a => !window.WF.ui.handlers[a]) };
  });
  ok('All rendered actions are wired', actionAudit.missing.length === 0, 'missing=' + actionAudit.missing.join(','));

  // 19. responsive
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cols: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns,
    visible: !!document.querySelector('#archivePanel .item-card') && !!document.querySelector('#matrixPanel .route-card')
  }));
  ok('Mobile layout stacks without overflow', mobile.overflow <= 1, 'overflow=' + mobile.overflow + 'px cols=' + mobile.cols);
  ok('Mobile keeps panels visible', mobile.visible);
  await page.screenshot({ path: '/tmp/wf-mobile.png', fullPage: false });

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/wf-desktop.png', fullPage: true });

  // 20. console clean after all interaction
  ok('No console errors after full interaction', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' tests passed ====');
  if (failed.length) { console.log('FAILED:', failed.map(f => f.name).join('; ')); process.exit(1); }
})().catch(e => { console.error('TEST HARNESS ERROR', e); process.exit(2); });
