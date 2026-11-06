/* =====================================================================
   engine/quest-engine.js — interactive missions
   Missions are generated from the expedition seed + objectives, track
   real player actions, award XP/resources, and fail deterministically.
   Exposes: WF.quests
   ===================================================================== */
(function (WF) {
  'use strict';

  var D = WF.data, U = WF.util;

  var KIND_LABEL = {
    primary: 'PRIMARY',
    secondary: 'SECONDARY',
    hidden: 'HIDDEN',
    exploration: 'EXPLORATION',
    resource: 'RESOURCE',
    relic: 'RELIC RECOVERY',
    faction: 'FACTION ASSIGNMENT',
    companion: 'COMPANION',
    survival: 'SURVIVAL CHALLENGE'
  };

  function fill(text, exp, extra) {
    return WF.world.fill(text, {
      sector: exp.sector,
      world: exp.worldName,
      faction: exp.faction,
      place: exp.placeName || exp.sector,
      objective: exp.objectives[0] ? exp.objectives[0].text : 'the sector',
      resource: extra && extra.resource ? extra.resource : 'resources',
      amount: extra && extra.amount ? extra.amount : 10,
      threshold: extra && extra.threshold != null ? extra.threshold : 60,
      companion: extra && extra.companion ? extra.companion : 'the companion'
    });
  }

  function stagesForTag(tag, exp, rng) {
    var t = String(tag || '').toLowerCase();
    if (/combat|containment|ritual/.test(t)) {
      return [{ event: 'combat', target: 1, label: 'Hostile neutralised', require: 'victory' }];
    }
    if (/recovery|excavation|harvest|capture/.test(t)) {
      return [{ event: 'scan', target: 1, label: 'Deep scan completed' }];
    }
    if (/endurance|stabilisation/.test(t)) {
      return [{ event: 'finalize', target: 60, label: 'Integrity at expedition close', metric: 'integrity' }];
    }
    if (/diplomacy/.test(t)) {
      return [{ event: 'survey', target: 2, label: 'Contact sweeps completed' }];
    }
    return [{ event: 'survey', target: rng.int(2, 3), label: 'Survey sweeps completed' }];
  }

  function pickRewardResources(state, exp, rng, count) {
    var pool = (exp.resources || []).slice();
    var out = [];
    for (var i = 0; i < count && pool.length; i++) {
      var entry = rng.pick(pool);
      out.push({ id: entry.id, name: entry.name, qty: rng.int(2, 5) });
    }
    return out;
  }

  function makeQuest(exp, spec, rng, index) {
    var stages = (spec.stages || []).map(function (st, si) {
      return {
        id: 'st' + si,
        event: st.event,
        label: st.label || 'Progress',
        target: st.target || 1,
        progress: 0,
        done: false,
        require: st.require || null,
        metric: st.metric || null,
        resource: st.resource || null
      };
    });
    return {
      id: 'q_' + exp.seed.toString(36) + '_' + index,
      expeditionId: exp.id,
      expeditionNumber: exp.number,
      seed: exp.seed,
      kind: spec.kind,
      label: KIND_LABEL[spec.kind] || 'MISSION',
      title: spec.title,
      desc: spec.desc,
      faction: spec.faction || null,
      companionId: spec.companionId || null,
      hidden: !!spec.hidden,
      revealed: !spec.hidden,
      stages: stages,
      rewards: spec.rewards || { xp: 60, resources: [] },
      failure: spec.failure || { type: 'finalize_incomplete' },
      status: 'active',
      createdAt: Date.now(),
      completedAt: null,
      failedAt: null,
      progressLog: []
    };
  }

  /**
   * Generate the mission board for a new expedition.
   * Deterministic for a given expedition seed.
   */
  function generate(state) {
    var exp = state.expedition;
    if (!exp) return [];
    var rng = new U.RNG((exp.seed ^ 0x51ED270B) >>> 0);
    var objectives = rng.shuffle(exp.objectives || []);
    var quests = [];
    var idx = 0;

    // primary — from the first objective
    if (objectives[0]) {
      quests.push(makeQuest(exp, {
        kind: 'primary',
        title: fill(objectives[0].text, exp),
        desc: 'PRIMARY ASSIGNMENT — ' + fill(objectives[0].text, exp) + '. The archive will not close this expedition until the objective is resolved.',
        stages: stagesForTag(objectives[0].tag, exp, rng),
        rewards: { xp: 130 + exp.difficulty.score, resources: pickRewardResources(state, exp, rng, 2) },
        failure: { type: 'finalize_incomplete' }
      }, rng, idx++));
    }

    // secondary — from the next objective
    if (objectives[1]) {
      quests.push(makeQuest(exp, {
        kind: 'secondary',
        title: fill(objectives[1].text, exp),
        desc: 'SECONDARY ASSIGNMENT — ' + fill(objectives[1].text, exp) + '. Optional, but the archive pays for completion.',
        stages: stagesForTag(objectives[1].tag, exp, rng),
        rewards: { xp: 90 + Math.round(exp.difficulty.score * 0.6), resources: pickRewardResources(state, exp, rng, 1) }
      }, rng, idx++));
    }

    // exploration
    quests.push(makeQuest(exp, {
      kind: 'exploration',
      title: 'Sweep ' + exp.sector,
      desc: 'Run two survey sweeps across ' + exp.sector + ' and log the returns. The archive needs the ground truth, not the projection.',
      stages: [{ event: 'survey', target: 2, label: 'Survey sweeps completed' }],
      rewards: { xp: 70, resources: pickRewardResources(state, exp, rng, 1) }
    }, rng, idx++));

    // resource collection
    var res = rng.pick(exp.resources || []);
    if (res) {
      var amount = rng.int(8, 16);
      quests.push(makeQuest(exp, {
        kind: 'resource',
        title: 'Provision: ' + res.name,
        desc: 'Gather ' + amount + ' units of ' + res.name + ' from ' + exp.sector + ' before the horizon turns.',
        stages: [{ event: 'resource', resource: res.id, target: amount, label: 'Units of ' + res.name }],
        rewards: { xp: 80, resources: [{ id: res.id, name: res.name, qty: 4 }] }
      }, rng, idx++));
    }

    // relic recovery (hidden until a scan reveals it)
    quests.push(makeQuest(exp, {
      kind: 'hidden',
      title: 'Signal beneath the sector',
      desc: 'A buried object is broadcasting a pre-collapse identification code. Recover it before the signal decays.',
      hidden: true,
      stages: [{ event: 'scan', target: 1, label: 'Anomaly recovered' }],
      rewards: { xp: 140, resources: pickRewardResources(state, exp, rng, 1) }
    }, rng, idx++));

    // faction assignment
    quests.push(makeQuest(exp, {
      kind: 'faction',
      title: 'Break the ' + exp.faction,
      desc: exp.faction + ' patrols the outer markers. Destroy two hostiles carrying their markings to reduce pressure on the sector.',
      faction: exp.faction,
      stages: [{ event: 'combat', target: 2, label: 'Hostiles destroyed', require: 'victory' }],
      rewards: { xp: 120, resources: pickRewardResources(state, exp, rng, 2) }
    }, rng, idx++));

    // companion mission if one is active
    var companion = WF.companions && WF.companions.active(state);
    if (companion) {
      quests.push(makeQuest(exp, {
        kind: 'companion',
        title: 'Sync protocol: ' + companion.name,
        desc: 'Keep ' + companion.name + ' online through two field actions in ' + exp.sector + '. Compatibility drift is already logged.',
        companionId: companion.id,
        stages: [{ event: 'action', target: 2, label: 'Field actions with ' + companion.name }],
        rewards: { xp: 95, resources: pickRewardResources(state, exp, rng, 1) }
      }, rng, idx++));
    }

    return quests;
  }

  function ensure(state) {
    if (!state.quests || !state.quests.length) {
      if (state.expedition) state.quests = generate(state);
    }
    return state.quests || [];
  }

  function questState(state) {
    ensure(state);
    return state.quests;
  }

  function revealHidden(state) {
    var revealed = [];
    questState(state).forEach(function (q) {
      if (q.hidden && !q.revealed) {
        q.revealed = true;
        revealed.push(q);
        WF.engine.log(state, {
          type: 'system',
          text: 'HIDDEN OBJECTIVE REVEALED — ' + q.title + '. ' + q.desc,
          short: 'ANOMALY FOUND'
        });
      }
    });
    return revealed;
  }

  /**
   * Award a quest and apply rewards.
   * @returns {{quest, xp, resources, leveled}}
   */
  function complete(state, quest) {
    if (quest.status !== 'active') return null;
    quest.status = 'complete';
    quest.completedAt = Date.now();
    var rng = new U.RNG((quest.seed ^ U.hashString(quest.id)) >>> 0);
    var rewards = quest.rewards || { xp: 50, resources: [] };
    var xpResult = WF.profile.addXp(state, rewards.xp || 50, 'mission:' + quest.id);
    (rewards.resources || []).forEach(function (r) {
      WF.inventory.addResource(state, r.id, r.qty);
    });
    if (rewards.resources && rewards.resources.length) {
      WF.profile.recordResourceGain(state, rewards.resources.reduce(function (n, r) { return n + r.qty; }, 0));
    }
    if (quest.companionId) {
      WF.profile.companionXp(state, quest.companionId, 45);
      WF.companions.reconcile && WF.companions.reconcile(state);
    }
    WF.profile.checkAchievements(state);
    if (state.log) {
      WF.engine.log(state, {
        type: 'mission',
        text: 'MISSION COMPLETE — ' + quest.title + ' [' + quest.label + ']. +' + (rewards.xp || 0) + ' XP' +
          ((rewards.resources || []).length ? ' · ' + rewards.resources.map(function (r) { return r.qty + '× ' + r.name; }).join(', ') : '') + '.',
        short: 'MISSION COMPLETE'
      });
    }
    return { quest: quest, xp: rewards.xp || 0, resources: rewards.resources || [], leveled: xpResult.leveled };
  }

  function fail(state, quest, reason) {
    if (quest.status !== 'active') return null;
    quest.status = 'failed';
    quest.failedAt = Date.now();
    quest.failReason = reason || 'Incomplete at expedition close.';
    if (state.log) {
      WF.engine.log(state, {
        type: 'mission',
        text: 'MISSION FAILED — ' + quest.title + '. ' + quest.failReason,
        short: 'MISSION FAILED'
      });
    }
    return quest;
  }

  /**
   * Feed a recorded field event into mission progress.
   * event: { type, qty, resourceId, outcome, condition, ... }
   */
  function progress(state, event) {
    if (!state.expedition) return { completed: [], failed: [] };
    var quests = questState(state);
    var completed = [];

    if (event.type === 'scan' || event.type === 'combat') revealHidden(state);

    quests.forEach(function (q) {
      if (q.status !== 'active') return;
      var questDone = true;
      q.stages.forEach(function (st) {
        if (st.done) return;
        var advanced = false;

        if (st.event === 'finalize') return; // resolved at close

        if (st.event === 'resource') {
          if (event.type === 'resource' && event.resourceId === st.resource) {
            st.progress += event.qty || 0;
            advanced = true;
          }
        } else if (st.event === 'combat') {
          if (event.type === 'combat' && (!st.require || event.outcome === st.require)) {
            st.progress += 1;
            advanced = true;
          }
        } else if (st.event === 'action') {
          if (event.type === 'survey' || event.type === 'scan' || event.type === 'combat') {
            if (!q.companionId || (WF.companions.active(state) && WF.companions.active(state).id === q.companionId)) {
              st.progress += 1;
              advanced = true;
            }
          }
        } else if (event.type === st.event) {
          st.progress += 1;
          advanced = true;
        }

        if (advanced && st.progress >= st.target) st.done = true;
        if (st.progress < st.target) questDone = false;
      });
      // questDone must account for finalize stages which are not done yet
      q.stages.forEach(function (st) { if (!st.done) questDone = false; });
      if (questDone) {
        var res = complete(state, q);
        if (res) completed.push(res);
      }
    });

    return { completed: completed, failed: [] };
  }

  /**
   * Close out the mission board.
   * @returns {{completed, failed, missions:Array}}
   */
  function finalize(state, opts) {
    opts = opts || {};
    var quests = questState(state);
    var completed = [], failed = [];
    var integrity = Math.round(state.condition);

    quests.forEach(function (q) {
      if (q.status !== 'active') return;
      // resolve finalize-driven stages against actual closing condition
      q.stages.forEach(function (st) {
        if (st.event === 'finalize' && st.metric === 'integrity') {
          st.progress = integrity;
          if (integrity >= st.target) st.done = true;
        }
      });
      var allDone = q.stages.every(function (st) { return st.done; });
      if (allDone) {
        var res = complete(state, q);
        if (res) completed.push(res);
      } else {
        var reason = opts.abandon
          ? 'Expedition abandoned — horizon rerolled before completion.'
          : q.hidden && !q.revealed
            ? 'The signal decayed before it could be located.'
            : 'Incomplete at expedition close (integrity ' + integrity + '%).';
        fail(state, q, reason);
        failed.push(q);
      }
    });

    // persist to the permanent mission history
    if (!state.questHistory) state.questHistory = [];
    quests.forEach(function (q) {
      state.questHistory.unshift({
        id: q.id,
        expeditionId: q.expeditionId,
        expeditionNumber: q.expeditionNumber,
        seed: q.seed,
        kind: q.kind,
        label: q.label,
        title: q.title,
        desc: q.desc,
        faction: q.faction,
        companionId: q.companionId,
        status: q.status,
        stages: q.stages.map(function (st) { return { label: st.label, progress: st.progress, target: st.target, done: st.done }; }),
        rewards: q.rewards,
        completedAt: q.completedAt,
        failedAt: q.failedAt,
        failReason: q.failReason || null,
        worldName: state.expedition.worldName,
        worldId: state.expedition.worldId
      });
    });
    if (state.questHistory.length > 160) state.questHistory.length = 160;

    var summary = {
      completed: completed,
      failed: failed,
      total: quests.length,
      completeCount: completed.length,
      failedCount: failed.length
    };
    state.quests = [];
    return summary;
  }

  function failAllActive(state, reason) {
    var quests = questState(state);
    var failed = [];
    quests.forEach(function (q) {
      if (q.status === 'active') {
        fail(state, q, reason || 'Expedition condition collapsed.');
        failed.push(q);
      }
    });
    return failed;
  }

  function counts(state) {
    var q = questState(state);
    return {
      total: q.length,
      active: q.filter(function (x) { return x.status === 'active'; }).length,
      complete: q.filter(function (x) { return x.status === 'complete'; }).length,
      failed: q.filter(function (x) { return x.status === 'failed'; }).length,
      hidden: q.filter(function (x) { return x.hidden && !x.revealed; }).length
    };
  }

  WF.quests = {
    generate: generate,
    ensure: ensure,
    questState: questState,
    progress: progress,
    finalize: finalize,
    complete: complete,
    fail: fail,
    revealHidden: revealHidden,
    counts: counts,
    failAllActive: failAllActive,
    KIND_LABEL: KIND_LABEL
  };
})(window.WF = window.WF || {});
