const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');
const BASE = 'http://localhost:8099/index.html';
const results = [];
function ok(n,c,d){results.push({n,pass:!!c});console.log((c?'PASS ':'FAIL ')+n+(d?' — '+d:''));}

(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1500,height:1000}, acceptDownloads:true });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(400);

  // shared profile payload shape + privacy
  const prof = await page.evaluate(()=>{
    const s=window.WF_APP.state;
    const p=window.WF.shared.publicProfile(s);
    return { kind:p.kind, hasCallsign:!!p.callsign, level:p.level, ach:Array.isArray(p.achievements),
      leaks: JSON.stringify(p).includes('archive') || JSON.stringify(p).includes('resources') || JSON.stringify(p).includes('seed'),
      fields:Object.keys(p) };
  });
  ok('Public profile payload is well-formed', prof.kind==='profile' && prof.hasCallsign && prof.ach, prof.fields.join(','));
  ok('Public profile excludes private inventory and resources', prof.leaks===false);

  // publish outbox
  const pub = await page.evaluate(()=>{
    const s=window.WF_APP.state;
    // create a history record to share
    s.condition=72;
    const rec=window.WF.history.buildRecord(s);
    window.WF.history.archive(s);
    const a=window.WF.shared.publish(s,'expedition');
    const b=window.WF.shared.publish(s,'profile');
    const c=window.WF.shared.publish(s,'bundle');
    return {a:a.ok,b:b.ok,c:c.ok, n:s.shared.publications.length,
      expSeed:a.publication && a.publication.seed, expWorld:a.publication && a.publication.worldId,
      expId:a.publication && a.publication.id, stats:window.WF.shared.communityStats(s)};
  });
  ok('Publishing stages outbox payloads', pub.a && pub.b && pub.c && pub.n===3, 'n='+pub.n);
  ok('Community statistics aggregate local shares', pub.stats.sharedExpeditions>=1 && pub.stats.publications===3, JSON.stringify(pub.stats));
  ok('Expedition share carries seed and world', pub.expSeed!=null && !!pub.expWorld);

  // export share
  const dlP=page.waitForEvent('download',{timeout:5000}).catch(()=>null);
  await page.evaluate(()=>{window.WF_APP.state.ui.view='vault';window.WF.ui.render();});
  await page.waitForTimeout(300);
  await page.click('[data-action="export-share"]');
  const dl=await dlP;
  ok('Share bundle exports as download', !!dl, dl?dl.suggestedFilename():'none');

  // import share into same app + reconstruct via UI
  const beforeExp=await page.evaluate(()=>window.WF_APP.state.expedition.id);
  const imported=await page.evaluate(()=>{
    const s=window.WF_APP.state;
    const bundle=window.WF.shared.bundle(s,5);
    bundle.cartographerId='foreign_cartographer';
    bundle.profile.callsign='FOREIGN';
    const r=window.WF.shared.receive(s,bundle);
    window.WF.store.save(s);
    window.WF.ui.render();
    return {ok:r.ok, inbox:s.shared.inbox.length, id:r.entry&&r.entry.receivedId,
      seed:r.entry&&r.entry.expeditions[0].seed, world:r.entry&&r.entry.expeditions[0].worldId,
      worldName:r.entry&&r.entry.expeditions[0].worldName,
      name:r.entry&&r.entry.expeditions[0].name};
  });
  ok('Shared bundle imports into inbox', imported.ok && imported.inbox===1, 'inbox='+imported.inbox);
  await page.evaluate((id)=>{
    const s=window.WF_APP.state;
    const pub=window.WF.shared.findPublication(s,id);
    const e=pub.expeditions[0];
    window.WF.engine.reconstruct(s,e.seed,e.number,e.worldId);
    window.WF.store.save(s);window.WF.ui.render();
  }, imported.id);
  await page.waitForTimeout(400);
  const rebuilt=await page.evaluate(()=>({name:window.WF_APP.state.expedition.name, id:window.WF_APP.state.expedition.id, seed:window.WF_APP.state.expedition.seed, worldName:window.WF_APP.state.expedition.worldName}));
  ok('Shared expedition reconstructs from its seed', rebuilt.name===imported.name && rebuilt.seed===imported.seed, rebuilt.name);
  ok('Reconstructed expedition preserves its world', rebuilt.worldName===imported.worldName, rebuilt.worldName);

  // invalid share rejected
  const invalid=await page.evaluate(()=>window.WF.shared.receive(window.WF_APP.state,{schema:99,kind:'expedition'}));
  ok('Invalid shared payload rejected', invalid.ok===false && /schema/i.test(invalid.message), invalid.message);

  // discovery archive + sector rebuild
  const disc=await page.evaluate(()=>{
    const s=window.WF_APP.state;
    const keys=Object.keys(s.profile.discoveredSectors);
    s.ui.view='codex';window.WF.ui.render();
    return { sectors:keys.length, archive:document.querySelector('#codexPanel').textContent.includes('DISCOVERY ARCHIVE'),
      rebuildBtns:document.querySelectorAll('#codexPanel [data-action="reconstruct"]').length };
  });
  ok('Discovery archive lists charted sectors', disc.sectors>=1 && disc.archive, 'sectors='+disc.sectors);
  ok('Charted sectors are reconstructable', disc.rebuildBtns>=1, 'n='+disc.rebuildBtns);

  // AI conclusion attached to archived records
  const concl=await page.evaluate(()=>{
    const s=window.WF_APP.state;
    s.ui.view='survival';window.WF.ui.render();
    window.WF.quests.ensure(s);
    const rec=window.WF.history.buildRecord(s);
    return { has:!!rec.conclusion, len:rec.conclusion?rec.conclusion.length:0, head:rec.conclusion?rec.conclusion.slice(0,40):'' };
  });
  ok('Archived records carry a conclusion narrative', concl.has && concl.len>80, concl.head);

  // shared persistence after refresh
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForTimeout(400);
  const persisted=await page.evaluate(()=>({n:window.WF_APP.state.shared.publications.length,inbox:window.WF_APP.state.shared.inbox.length}));
  ok('Shared outbox survives refresh', persisted.n>=3 && persisted.inbox>=1, JSON.stringify(persisted));

  // AI provider failure must fall back without mutating mechanics
  const aiFail = await page.evaluate(async () => {
    const s = window.WF_APP.state;
    const before = { condition: s.condition, res: JSON.stringify(s.resources), xp: s.profile.xpTotal };
    s.profile.settings.ai = { enabled: true, endpoint: 'http://127.0.0.1:6599/not-a-provider' };
    const r = await window.WF.ai.generate(s, 'event');
    const after = { condition: s.condition, res: JSON.stringify(s.resources), xp: s.profile.xpTotal };
    s.profile.settings.ai = { enabled: false, endpoint: '' };
    return { source: r.source, fallback: !!r.fallback, error: !!r.error, len: r.text.length,
      unchanged: JSON.stringify(before) === JSON.stringify(after) };
  });
  ok('AI provider failure falls back to templates', aiFail.source === 'template' && aiFail.fallback && aiFail.len > 40, JSON.stringify(aiFail));
  ok('AI narrative never mutates mechanics', aiFail.unchanged === true);

  // phase checkpoints exist
  const fs=require('fs');
  const backups=fs.existsSync('backups')?fs.readdirSync('backups'):[];
  ok('Recoverable baseline checkpoint exists', backups.includes('phase1-baseline'), backups.join(','));

  // full suite counts reported separately; ensure no console noise
  const appErrors = errors.filter(e => !/Failed to load resource|net::ERR/.test(e));
  ok('No application console errors during shared-universe flows', appErrors.length===0, appErrors.slice(0,3).join(' | '));

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.WF_APP.state.ui.view='vault';window.WF.ui.render();});
  await page.waitForTimeout(300);
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok('Shared universe vault fits mobile', over<=1, 'overflow='+over);
  await page.screenshot({path:'/tmp/wf-phase2c-mobile.png',fullPage:false});

  await browser.close();
  const failed=results.filter(r=>!r.pass);
  console.log('\n==== '+(results.length-failed.length)+'/'+results.length+' phase2c checks passed ====');
  if(failed.length){console.log('FAILED:',failed.map(f=>f.n).join('; '));process.exit(1);}
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2)});
