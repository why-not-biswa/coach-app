/* Let's be Kobe · app 0.4 (design pass). Vanilla JS, offline, all data on this phone.
   Same plan, rules, ladder, and data format as 0.3. */
(function () {
  'use strict';
  var P = window.PLAN;
  var KEY = 'coach.v1';
  var VERSION = '0.5';

  /* ---------- storage ---------- */
  function fresh() { return { v: 1, settings: { hrmax: 187, theme: 'auto', voice: true }, days: {}, links: {}, ladder: { cur: Object.assign({}, P.ladderStart), hist: [], pass: {} } }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) { s.settings = Object.assign({ hrmax: 187, theme: 'auto', voice: true }, s.settings || {}); s.ladder.pass = s.ladder.pass || {}; return s; } } catch (e) {}
    return fresh();
  }
  var st = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast('Could not save. Export a backup now.'); } }

  /* ---------- dates ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function nice(s) { var d = parse(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
  function longDate(s) { var d = parse(s); return DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()]; }
  function mondayOf(s) { return addDays(s, -((parse(s).getDay() + 6) % 7)); }
  var TODAY = iso(new Date());
  /* ---------- plan helpers ---------- */
  function dayR(ds) { return st.days[ds] || { sessions: {}, logs: {} }; }
  function dayW(ds) { if (!st.days[ds]) st.days[ds] = { sessions: {}, logs: {} }; var d = st.days[ds]; d.sessions = d.sessions || {}; d.logs = d.logs || {}; return d; }
  function planned(ds) { var d = dayR(ds); return d.choice && d.choice.length ? d.choice.slice() : P.week[parse(ds).getDay()].slice(); }
  function flowOf(ds) { return P.flow[parse(ds).getDay()]; }
  function phaseOf(ds) {
    var ph = P.phases;
    if (ds < ph[0].start) return { p: ph[0], week: 0, pre: true };
    for (var i = 0; i < ph.length; i++) if (ds >= ph[i].start && ds <= ph[i].end) return { p: ph[i], week: Math.floor(diffDays(ph[i].start, ds) / 7) + 1 };
    return { p: ph[ph.length - 1], week: 0, post: true };
  }
  function itemPhaseOk(it, n) { return (it.from == null || n >= it.from) && (it.to == null || n <= it.to); }
  var ITEM = {}; Object.keys(P.sessions).forEach(function (k) { P.sessions[k].items.forEach(function (it) { ITEM[it.id] = { s: k, it: it }; }); });
  function splitName(n) { var i = n.indexOf(' · '); return i < 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 3)]; }
  var LOAD = { 'Low': ['Easy', 1], 'Low–Med': ['Light', 2], 'Med–High': ['Moderate', 2], 'High': ['Hard', 3] };
  function dots(load) { var l = LOAD[load] || ['', 1], h = '<span class="row" style="gap:6px;display:inline-flex"><span class="dots">'; for (var i = 1; i <= 3; i++) h += '<i class="' + (i <= l[1] ? 'on' : '') + '"></i>'; return h + '</span>' + l[0] + '</span>'; }
  var MN = { neck: 'Neck', traps: 'Traps', delts: 'Shoulders', reardelts: 'Rear shoulders', chest: 'Chest', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs and breath', obliques: 'Obliques', lats: 'Lats', upperback: 'Upper back', lowback: 'Lower back', glutes: 'Glutes', hipflexors: 'Hip flexors', adductors: 'Inner thighs', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves', tibialis: 'Shins', feet: 'Feet and arches' };

  /* ---------- ladder ---------- */
  function stepSpec(t) {
    var m;
    if ((m = t.match(/(\d+)\s*×\s*(\d+)\s*s\b/))) return { k: 'hold', sets: +m[1], s: +m[2] };
    if ((m = t.match(/(\d+)\s*×\s*(\d+)/))) return { k: 'reps', sets: +m[1], reps: +m[2], fixed: true };
    if ((m = t.match(/×\s*(\d+)/))) return { k: 'reps', reps: +m[1] };
    if ((m = t.match(/(\d+)\s*min\b/))) return { k: 'hold', sets: 1, s: +m[1] * 60 };
    if (t.indexOf('+') < 0 && (m = t.match(/(\d+)\s*s\b(\s*\/\s*side)?/))) return { k: 'hold', sets: 3, s: +m[1], side: !!m[2] };
    m = t.replace(/\(.*?\)/g, '').match(/\d+/); return { k: 'reps', reps: m ? +m[0] : 5, side: /\/\s*side/.test(t) };
  }
  function resolve(it) {
    if (!it.lad) return it;
    var k = it.lad, c = st.ladder.cur[k], txt = P.ladder[k].steps[c - 1], sp = stepSpec(txt), o = Object.assign({}, it);
    o.step = k + c; o.stepText = txt; o.m = P.ladderMuscles[k]; o.k = sp.k; o.rest = 90;
    o.c = sp.k === 'hold' ? 'Isometric' : 'Concentric + eccentric';
    if (sp.k === 'hold') { o.sets = sp.sets; o.s = it.light ? Math.max(5, Math.round(sp.s * 0.7 / 5) * 5) : sp.s; o.dose = (o.sets > 1 ? o.sets + ' × ' : '') + o.s + ' s' + (sp.side ? ' / side' : ''); }
    else if (sp.fixed) { o.sets = sp.sets; o.reps = sp.reps; o.dose = sp.sets + ' × ' + sp.reps; }
    else { o.sets = it.light ? 3 : 4; o.reps = Math.max(1, Math.round(sp.reps * 0.6)); o.dose = o.sets + ' × ' + o.reps + (sp.side ? ' / side' : ''); }
    o.name = txt; o.track = P.ladder[k].name + ' · step ' + c;
    o.dose = 'Practise ' + o.dose + (it.light ? '' : ' · test: ' + txt);
    return o;
  }
  function getItem(id) { return resolve(ITEM[id].it); }
  function passCount(k) { return (st.ladder.pass[k] || []).length; }
  function ladPass(k, ds) {
    var L = st.ladder, arr = (L.pass[k] || []).slice();
    if (arr.indexOf(ds) >= 0) { toast('Already counted today. Pass again on another day.'); return; }
    arr.push(ds); L.log = L.log || [];
    if (arr.length >= 2 && L.cur[k] < 20) { L.cur[k]++; L.hist.push({ d: ds, k: k, s: L.cur[k] }); L.log.push({ d: ds, k: k, s: L.cur[k], up: true }); L.pass[k] = []; toast(P.ladder[k].name + ': step ' + L.cur[k] + '. Well earned.'); }
    else { L.pass[k] = arr; L.log.push({ d: ds, k: k, s: L.cur[k] }); toast('Pass 1 of 2. Pass again on another day.'); }
    save();
  }

  function isLite(sid, it) {
    if (it.lad) return false;
    return sid === 'morning' || sid === 'night' || sid === 'recovery' || /warm-up|cool-down/i.test(it.sec || '') || ['bx_class', 'fa_tennis', 'ar_tennis'].indexOf(it.id) >= 0;
  }
  function visibleItems(sid, ds) { var fl = flowOf(ds); return P.sessions[sid].items.filter(function (it) { return !it.flow || it.flow === fl || ui.bothFlows; }).map(resolve); }
  function hasLog(l) {
    if (!l) return false;
    if (l.rpe || (l.pain != null && l.pain !== '') || l.note || l.feel) return true;
    return (l.sets || []).some(function (x) { return x && (x.r || x.l || x.t); });
  }
  function itemDone(ds, id) { var d = dayR(ds); return !!(d.done && d.done[id]) || hasLog(d.logs[id]); }
  function sessionProgress(sid, ds) { var items = visibleItems(sid, ds), n = 0; items.forEach(function (it) { if (itemDone(ds, it.id)) n++; }); return { n: n, total: items.length }; }
  function sessDone(ds, sid) { var d = dayR(ds); return !!(d.sessions[sid] && d.sessions[sid].done); }
  function rank(sid) { return P.loadRank[P.sessions[sid].load] || 0; }
  function lastLog(id, before) {
    var keys = Object.keys(st.days).filter(function (k) { return k < before; }).sort().reverse();
    for (var i = 0; i < keys.length; i++) { var l = st.days[keys[i]].logs && st.days[keys[i]].logs[id]; if (hasLog(l)) return { ds: keys[i], l: l }; }
    return null;
  }
  function benefit(it) { var b = P.benefit[it.id] || (it.lad ? P.benefit._ladder : '') || ''; var i = b.indexOf(' — '); return i < 0 ? ['', b] : [b.slice(0, i), b.slice(i + 3)]; }

  /* ---------- icons ---------- */
  var I = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    journal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    progress: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
    coach: '<circle cx="12" cy="12" r="8.5"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    fwd: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    skip: '<path d="M6 6l8 6-8 6z"/><path d="M18 6v12"/>',
    plus: '<circle cx="12" cy="13" r="7.5"/><path d="M12 10v6M9 13h6M10 2.5h4"/>',
    sound: '<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    watch: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M10.5 9.5v5l4-2.5z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    chev: '<path d="M10 6l6 6-6 6"/>'
  };
  function ic(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2200); }

  /* ---------- UI state, theme ---------- */
  var ui = { tab: 'today', date: TODAY, sid: null, sheet: null, bothFlows: false, week: mondayOf(TODAY), month: TODAY.slice(0, 7), jview: 'month', jday: TODAY, prog: '', ci: null, confirmReset: false };
  var view = document.getElementById('view'), sheetEl = document.getElementById('sheet'), tEl = document.getElementById('timer');
  var T = { segs: [], i: 0, left: 0, up: 0, run: false, iv: null, q: [], qi: 0, item: null };
  function isDark() {
    var t = st.settings.theme || 'auto';
    if (t === 'dark') return true; if (t === 'light') return false;
    var h = new Date().getHours();
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) || h >= 19 || h < 6 || ui.sid === 'night' || (!tEl.hidden && T.sid === 'night');
  }
  function applyTheme() {
    var d = isDark(); document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', d ? '#111513' : '#f2f0eb');
  }

  function render() {
    applyTheme();
    document.querySelectorAll('#tabs button').forEach(function (b) { b.setAttribute('aria-current', !ui.sid && b.dataset.tab === ui.tab ? 'page' : 'false'); });
    var h;
    if (ui.sid) h = vSession();
    else if (ui.tab === 'today') h = vToday();
    else if (ui.tab === 'journal') h = vJournal();
    else if (ui.tab === 'progress') h = vProgress();
    else h = vCoach();
    view.innerHTML = h;
    if (!ui.sid && ui.tab === 'progress') drawCharts();
    renderSheet();
  }

  /* ---------- coach logic (same rules as 0.3) ---------- */
  function hrAvg(ds) {
    var vals = [];
    for (var i = 1; i <= 14 && vals.length < 7; i++) { var d = st.days[addDays(ds, -i)]; if (d && d.hr) vals.push(+d.hr); }
    return vals.length < 3 ? null : vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }
  function middleOf(ds) { var d = dayR(ds), done = P.middle.filter(function (m) { return d.sessions[m] && d.sessions[m].done; }); return done.length ? done : (ds <= TODAY && !d.choice ? [] : planned(ds)); }
  function missedMid(ds) { if (ds >= TODAY || ds < P.phases[0].start) return []; var d = dayR(ds); return planned(ds).filter(function (m) { return !(d.sessions[m] && d.sessions[m].done); }); }
  function sName(sid) { return splitName(P.sessions[sid].name)[0]; }
  function coachMsgs(ds) {
    var out = [], d = dayR(ds), ph = phaseOf(ds), today = planned(ds);
    var miss = missedMid(addDays(ds, -1));
    if (ds <= TODAY && miss.length) out.push(['miss', 'Yesterday, ' + miss.map(sName).join(' and ') + ' was missed. Do not add it to today. Continue the plan.']);
    if (ph.pre) out.push(['', 'Block 0 starts Monday 9 November. Do the baseline tests, and the Morning and Night modules.']);
    if (!ph.pre && !ph.post && ph.week % 4 === 0) out.push(['warn', 'Deload and retest week. Cut volume by about 40%. Keep the intensity.']);
    var avg = hrAvg(ds), easier = false;
    if (d.hr && avg && d.hr - avg >= 7) { easier = true; out.push(['stop', 'Resting HR is ' + Math.round(d.hr - avg) + ' bpm above your average. Make today one level easier.']); }
    if (d.sleep && +d.sleep < 6) { easier = true; out.push(['stop', 'Under 6 hours of sleep. Make today one level easier.']); }
    if (easier) out.push(['warn', 'Easier: a hard session at RPE 6 with plyos and intervals halved, or Field A at Zone 2. A moderate session becomes Recovery.']);
    var prev = middleOf(addDays(ds, -1));
    if (today.indexOf('gymA') >= 0 && prev.indexOf('fieldB') >= 0) out.push(['warn', 'Field B was yesterday. Keep 48 hours before Gym A, or swap today.']);
    if (today.indexOf('fieldB') >= 0 && prev.indexOf('gymA') >= 0) out.push(['warn', 'Gym A was yesterday. Keep 48 hours before Field B, or swap today.']);
    if (today.some(function (s) { return rank(s) >= 3; })) {
      var streak = 0;
      for (var i = 1; i <= 3; i++) { if (middleOf(addDays(ds, -i)).some(function (s) { return rank(s) >= 3; })) streak++; else break; }
      if (streak >= 2) out.push(['warn', streak + ' hard days in a row. Make today light or moderate.']);
    }
    for (var k = 0; k <= 7; k++) {
      var dd = st.days[addDays(ds, -k)]; if (!dd || !dd.logs) continue;
      Object.keys(dd.logs).forEach(function (id) { var l = dd.logs[id]; if (l && l.pain !== '' && l.pain != null && +l.pain > 3 && ITEM[id]) out.push(['stop', 'Pain ' + l.pain + '/10 on ' + getItem(id).name + ' (' + nice(addDays(ds, -k)) + '). Lower the load on it next time.']); });
    }
    if (parse(ds).getDay() === 6) out.push(['', 'A drink tonight only if tomorrow is easy. Max 2, water between, protein first.']);
    var order = { stop: 0, miss: 1, warn: 2, '': 3 };
    return out.sort(function (a, b) { return order[a[0]] - order[b[0]]; });
  }

  /* ---------- Today ---------- */
  function weekStrip(ds) {
    var mon = mondayOf(ds), h = '<div class="week">';
    for (var i = 0; i < 7; i++) {
      var x = addDays(mon, i), mids = planned(x), all = ['morning'].concat(mids, ['night']);
      var nd = all.filter(function (s) { return sessDone(x, s); }).length;
      var cls = nd === all.length ? 'full' : nd ? 'part' : '';
      if (missedMid(x).length && cls !== 'full') cls += ' miss';
      if (x === TODAY) cls += ' today';
      h += '<button class="wd" data-act="pick" data-ds="' + x + '" aria-label="' + longDate(x) + '"><span>' + DOW[parse(x).getDay()].charAt(0) + '</span><span class="c num ' + cls + '">' + parse(x).getDate() + '</span></button>';
    }
    return h + '</div>';
  }
  function vToday() {
    var ds = ui.date, d = dayR(ds), ph = phaseOf(ds), isT = ds === TODAY, hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    var phTxt = ph.pre ? 'Block 0 starts Monday 9 November' : ph.post ? 'Season complete' : 'Block ' + ph.p.n + ' · ' + ph.p.name + ' · week ' + ph.week;
    var h = '<div class="topbar"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Previous day">' + ic('back') + '</button>' +
      (isT ? '<span></span>' : '<button class="btn ghost" data-act="goToday">Back to today</button>') +
      '<button class="iconbtn" data-act="day" data-n="1" aria-label="Next day">' + ic('fwd') + '</button></div>' +
      '<div class="eyebrow">' + longDate(ds) + '</div><h1 class="large">' + (isT ? greet : DOWL[parse(ds).getDay()]) + '</h1><div class="sub">' + esc(phTxt) + '</div>' + weekStrip(ds);

    h += '<div class="stack" style="margin-top:14px">';
    if (d.hr || d.sleep) h += '<button class="li card" data-act="checkin" style="box-shadow:var(--shadow)">' + ic('leaf') + '<div class="sp"><div class="t1">' + [d.sleep ? d.sleep + ' h sleep' : '', d.hr ? d.hr + ' bpm resting' : ''].filter(Boolean).join(' · ') + '</div><div class="t2">Check-in done</div></div>' + ic('chev', 'sm') + '</button>';
    else h += '<button class="li card" data-act="checkin">' + ic('leaf') + '<div class="sp"><div class="t1">Morning check-in</div><div class="t2">Sleep and resting heart rate · 2 taps</div></div>' + ic('chev', 'sm') + '</button>';
    var msgs = coachMsgs(ds);
    if (msgs.length) { var m = msgs[0]; h += '<button class="note coachline ' + (m[0] === 'stop' || m[0] === 'miss' ? 'clay' : '') + '" data-act="coach">' + '<span class="sp">' + esc(m[1]) + (msgs.length > 1 ? ' <span class="muted">· ' + (msgs.length - 1) + ' more</span>' : '') + '</span></button>'; }

    var order = ['morning'].concat(planned(ds), ['night']), next = order.filter(function (s) { return !sessDone(ds, s); })[0];
    if (next) {
      var s = P.sessions[next], pr = sessionProgress(next, ds), tt = splitName(s.name);
      h += '<div class="hero"><div class="k">' + (pr.n ? 'Continue' : 'Up next') + '</div><div class="n">' + esc(tt[0]) + (next === 'morning' ? ' · Flow ' + flowOf(ds) : '') + '</div>' +
        '<div class="m"><span class="num">' + s.mins + ' min</span>' + dots(s.load) + '<span class="num">' + (pr.n ? pr.n + ' of ' : '') + pr.total + ' exercises</span></div>' +
        (tt[1] ? '<div class="cap" style="margin-top:6px">' + esc(tt[1]) + '</div>' : '') +
        '<button class="btn pri big" data-act="play" data-sid="' + next + '">' + ic('play') + (pr.n ? 'Continue' : 'Start') + '</button>' +
        '<button class="btn ghost full" style="margin-top:4px" data-act="open" data-sid="' + next + '">See the exercises</button></div>';
    } else h += '<div class="hero"><div class="k">Today</div><div class="n">All done.</div><div class="m">Quality work. Recover well tonight.</div></div>';
    h += '</div>';

    h += '<div class="sec">Today’s plan</div><div class="list">';
    order.forEach(function (sid) {
      var s = P.sessions[sid], pr = sessionProgress(sid, ds), done = sessDone(ds, sid), tt = splitName(s.name);
      var lab = sid === 'morning' ? 'Morning' : sid === 'night' ? 'Night' : 'Main session';
      h += '<button class="li" data-act="open" data-sid="' + sid + '"><span class="check ' + (done ? 'on' : '') + '">' + (done ? ic('check', 'sm') : '') + '</span><div class="sp"><div class="t1">' + esc(tt[0]) + '</div><div class="t2">' + lab + ' · ' + s.mins + ' min · ' + (pr.n && !done ? pr.n + '/' + pr.total + ' done' : LOAD[s.load][0]) + '</div></div>' + ic('chev', 'sm') + '</button>';
    });
    h += '</div><button class="btn ghost" style="margin-top:8px" data-act="change">Change today’s session</button>';
    return h;
  }

  /* ---------- Session ---------- */
  function vSession() {
    var sid = ui.sid, s = P.sessions[sid], ds = ui.date, d = dayR(ds), n = phaseOf(ds).p.n, tt = splitName(s.name), pr = sessionProgress(sid, ds), sd = d.sessions[sid] || {};
    var h = '<div class="topbar"><button class="btn ghost" data-act="back">' + ic('back', 'sm') + 'Today</button></div>' +
      '<div class="eyebrow">' + longDate(ds) + '</div><h1 class="large">' + esc(tt[0]) + (sid === 'morning' ? ' · Flow ' + flowOf(ds) : '') + '</h1>' +
      '<div class="sub row" style="flex-wrap:wrap;gap:12px">' + (tt[1] ? '<span>' + esc(tt[1]) + '</span>' : '') + '<span class="num">' + s.mins + ' min</span>' + dots(s.load) + '</div>';
    if (sid === 'morning') h += '<div class="chips" style="margin-top:14px"><button class="chip ' + (ui.bothFlows ? '' : 'on') + '" data-act="flow" data-v="0">Flow ' + flowOf(ds) + '</button><button class="chip ' + (ui.bothFlows ? 'on' : '') + '" data-act="flow" data-v="1">Show A and B</button></div>';
    var items = visibleItems(sid, ds), last = null;
    items.forEach(function (it, i) {
      var sec = it.sec || '';
      if (i === 0 || sec !== last) { if (i) h += '</div>'; h += '<div class="sec">' + esc(sec || 'Exercises') + '</div><div class="list">'; last = sec; }
      var ok = itemPhaseOk(it, n), done = itemDone(ds, it.id);
      var note = !ok ? (it.from != null && n < it.from ? ' · starts in Block ' + it.from : ' · Block ' + it.from + (it.to != null && it.to !== it.from ? '–' + it.to : '')) : '';
      h += '<button class="li exrow' + (ok ? '' : ' off') + '" data-act="ex" data-id="' + it.id + '"><span class="check ' + (done ? 'on' : '') + '">' + (done ? ic('check', 'sm') : '') + '</span><div class="sp"><div class="t1">' + esc(it.name) + '</div><div class="t2">' + esc(it.dose) + note + '</div></div>' + ic('chev', 'sm') + '</button>';
    });
    if (items.length) h += '</div>';
    h += '<div class="sec">After the session</div><div class="card stack"><div><div class="lbl">How did it go?</div><textarea data-act="snote" placeholder="Energy, form, anything to remember">' + esc(sd.note || '') + '</textarea></div>' +
      '<button class="btn full" data-act="sdone">' + (sd.done ? ic('check', 'sm') + 'Done · tap to undo' : 'Mark the session done') + '</button></div><div style="height:96px"></div>';
    h += '<div class="sticky"><button class="btn pri big" data-act="play" data-sid="' + sid + '">' + ic('play') + (pr.n ? 'Continue · ' + pr.n + ' of ' + pr.total : 'Start session') + '</button></div>';
    return h;
  }

  /* ---------- sheets ---------- */
  function openSheet(s) { ui.sheet = s; renderSheet(true); }
  function closeSheet() { ui.sheet = null; renderSheet(); }
  function renderSheet(fresh) {
    if (!ui.sheet) { sheetEl.hidden = true; sheetEl.innerHTML = ''; return; }
    var old = sheetEl.querySelector('.panel'), top = old && !fresh ? old.scrollTop : 0, c = '';
    var t = ui.sheet.type;
    if (t === 'ex') c = shEx(ui.sheet.id); else if (t === 'checkin') c = shCheckin(); else if (t === 'coach') c = shCoach();
    else if (t === 'change') c = shChange(); else if (t === 'ladder') c = shLadder(ui.sheet.k); else if (t === 'settings') c = shSettings();
    sheetEl.innerHTML = '<div class="scrim" data-act="closeSheet"></div><div class="panel' + (fresh ? '' : ' still') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + c + '</div>';
    if (!fresh) sheetEl.querySelector('.panel').style.animation = 'none';
    sheetEl.hidden = false; sheetEl.querySelector('.panel').scrollTop = top;
  }
  function shHead(title, sub) { return '<div class="row" style="align-items:flex-start"><div class="sp"><div class="title">' + esc(title) + '</div>' + (sub ? '<div class="sub" style="margin-top:4px">' + sub + '</div>' : '') + '</div><button class="iconbtn" data-act="closeSheet" aria-label="Close">' + ic('close') + '</button></div>'; }

  function stepper(id, i, f, v, ph, unit) {
    return '<div class="stepper"><button data-act="stp" data-id="' + id + '" data-i="' + i + '" data-f="' + f + '" data-d="-1" aria-label="Less">−</button>' +
      '<input type="number" inputmode="decimal" step="any" data-act="set" data-id="' + id + '" data-i="' + i + '" data-f="' + f + '" value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(ph == null ? '' : ph) + '" aria-label="' + unit + ' set ' + (i + 1) + '">' +
      '<button data-act="stp" data-id="' + id + '" data-i="' + i + '" data-f="' + f + '" data-d="1" aria-label="More">+</button><div class="u">' + unit + '</div></div>';
  }
  function chipRow(id, f, v, a, b) { var h = '<div class="scrollx">'; for (var i = a; i <= b; i++) h += '<button class="chip num ' + (v !== '' && v != null && +v === i ? 'on' : '') + '" data-act="lchip" data-id="' + id + '" data-f="' + f + '" data-v="' + i + '">' + i + '</button>'; return h + '</div>'; }

  function shEx(id) {
    var ds = ui.date, d = dayR(ds), it = getItem(id), sid = ITEM[id].s, l = d.logs[id], lite = isLite(sid, it), link = st.links[id];
    var q = encodeURIComponent((it.lad ? it.stepText : it.name).replace(/\(.*?\)/g, '').trim() + ' exercise form');
    var h = shHead(it.name, esc((it.track ? it.track + ' · ' : '') + it.dose));
    h += '<div class="row" style="margin-top:16px"><a class="btn sp" href="' + esc(link || 'https://www.youtube.com/results?search_query=' + q + '+shorts') + '" target="_blank" rel="noopener">' + ic('watch') + 'Watch</a>' +
      '<button class="btn pri sp" data-act="startHere" data-id="' + id + '">' + ic('play', 'sm') + 'Start here</button></div>';
    if (it.m && it.m.length) h += '<div class="lbl" style="margin-top:18px">Feel it in</div><div class="chips">' + it.m.map(function (m) { return '<span class="chip static">' + (MN[m] || m) + '</span>'; }).join('') + '</div>';
    if (it.lad) {
      var nx = st.ladder.cur[it.lad] < 20 ? P.ladder[it.lad].steps[st.ladder.cur[it.lad]] : 'top of the track';
      h += '<div class="note" style="margin-top:16px">Next step: ' + esc(nx) + '. ' + (it.light ? 'Recovery day: practise only.' : 'Test when fresh. Two passes on different days move you up.') + '</div>';
      if (!it.light) h += '<button class="btn full" style="margin-top:10px" data-act="lpass" data-k="' + it.lad + '">' + ic('check', 'sm') + 'Passed the test today · ' + passCount(it.lad) + '/2</button>';
    }
    if (it.k === 'drills') {
      var pn = phaseOf(ds).p.n;
      h += '<div class="lbl" style="margin-top:18px">How to · ' + (it.ds || 60) + ' s each, the player runs them in order</div><ol class="plain drills">' +
        P.drills.map(function (x) { var off = x.from != null && pn < x.from; return '<li' + (off ? ' class="muted"' : '') + '><b>' + esc(x.n) + '</b>' + (off ? ' · from Block ' + x.from : '') + '<div class="cap">' + esc(x.d) + '</div></li>'; }).join('') + '</ol>';
    }
    if (it.ladRef) { var rc = st.ladder.cur[it.ladRef]; h += '<div class="note" style="margin-top:16px">Ladder ' + P.ladder[it.ladRef].name + ', step ' + rc + ': ' + esc(P.ladder[it.ladRef].steps[rc - 1]) + '. Keep these sets far from failure.</div>'; }

    h += '<div class="lbl" style="margin-top:22px">Log</div>';
    if (lite) {
      var dn = !!(d.done && d.done[id]), feel = l && l.feel;
      h += '<button class="btn ' + (dn ? '' : 'pri') + ' full" data-act="ldone" data-id="' + id + '">' + (dn ? ic('check', 'sm') + 'Done · tap to undo' : 'Mark done') + '</button>' +
        '<div class="lbl" style="margin-top:16px">How it felt</div><div class="chips">' + ['Easy', 'Good', 'Tight', 'Pain'].map(function (f) { return '<button class="chip ' + (feel === f ? 'on' : '') + '" data-act="feel" data-id="' + id + '" data-v="' + f + '">' + f + '</button>'; }).join('') + '</div>';
      if (feel === 'Pain') h += '<div class="lbl" style="margin-top:14px">Pain, 0 to 10</div>' + chipRow(id, 'pain', l && l.pain, 0, 10);
    } else {
      var last = lastLog(id, ds), sets = (l && l.sets) || [], rows = Math.max(sets.length, Math.min(it.sets || 1, 8));
      if (last) h += '<div class="cap" style="margin-bottom:10px">Last time, ' + nice(last.ds) + ': ' + esc(summ(last.l)) + '</div>';
      for (var i = 0; i < rows; i++) {
        var x = sets[i] || {}, pl = (last && last.l.sets && last.l.sets[i]) || {};
        h += '<div class="setline"><span class="cap num">' + (i + 1) + '</span>' +
          (it.k === 'reps' ? stepper(id, i, 'r', x.r, pl.r || it.reps, 'reps') + stepper(id, i, 'l', x.l, pl.l || '', 'kg')
            : stepper(id, i, 't', x.t, pl.t || it.s, 'seconds') + stepper(id, i, 'l', x.l, pl.l || '', 'kg')) + '</div>';
      }
      h += '<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="addSet" data-id="' + id + '">+ Add a set</button><span class="sp"></span><button class="btn" data-act="quick" data-id="' + id + '">' + ic('check', 'sm') + 'Done as planned</button></div>';
      h += '<div class="lbl" style="margin-top:16px">Effort (RPE)</div>' + chipRow(id, 'rpe', l && l.rpe, 1, 10);
      h += '<div class="lbl" style="margin-top:14px">Pain, 0 to 10</div>' + chipRow(id, 'pain', l && l.pain, 0, 10);
    }
    if (l && l.pain !== '' && l.pain != null && +l.pain > 3) h += '<div class="note clay" style="margin-top:12px">Pain above 3/10. Stop or lower the load now. Next time, start lighter (rule 2).</div>';
    h += '<div class="lbl" style="margin-top:16px">Note</div><textarea data-act="lnote" data-id="' + id + '" placeholder="Form, side differences, how it felt">' + esc(l && l.note || '') + '</textarea>';
    h += '<details style="margin-top:10px"><summary>' + (link ? 'Your saved video · change' : 'Save your own video link') + '</summary><input type="url" inputmode="url" data-act="link" data-id="' + id + '" value="' + esc(link || '') + '" placeholder="https://… YouTube or Instagram"><p class="cap">When saved, Watch opens your link. Clear it to go back to the search.</p></details>';

    var b = benefit(it), focus = (it.m || []).map(function (m) { return MN[m] || m; }).join(', ');
    h += '<div class="why"><div class="tag">Why · ' + esc(b[0] || 'Your plan') + '</div><div class="b">' + esc(b[1]) + '</div>' + (focus ? '<div class="cap">Focus on: ' + esc(focus) + '</div>' : '') +
      '<details><summary>The science</summary><p class="cap">' + esc(it.why) + '</p><div class="chips" style="margin-top:8px">' + [it.pl ? 'Plane: ' + it.pl : '', it.j ? 'Joint: ' + it.j : '', it.c || ''].filter(Boolean).map(function (t) { return '<span class="chip static">' + esc(t) + '</span>'; }).join('') + '</div></details></div>';
    return h;
  }
  function summ(l) {
    var s = (l.sets || []).filter(function (x) { return x && (x.r || x.l || x.t); }).map(function (x) { return [x.r ? x.r + ' reps' : '', x.l ? x.l + ' kg' : '', x.t ? x.t + ' s' : ''].filter(Boolean).join(' · '); }).join(', ');
    return [s || 'done', l.feel || '', l.rpe ? 'RPE ' + l.rpe : '', l.pain !== '' && l.pain != null ? 'pain ' + l.pain : ''].filter(Boolean).join(' · ');
  }

  function shCheckin() {
    var ds = ui.date, d = dayR(ds), lastHr = null;
    for (var i = 1; i < 30 && !lastHr; i++) { var x = st.days[addDays(ds, -i)]; if (x && x.hr) lastHr = x.hr; }
    if (!ui.ci) ui.ci = { sleep: d.sleep || null, hr: d.hr || lastHr || 60 };
    var h = shHead('Morning check-in', 'Two answers. The coach uses them to set today’s load.');
    h += '<div class="lbl" style="margin-top:20px">Sleep last night</div><div class="chips">';
    [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].forEach(function (v) { h += '<button class="chip num ' + (ui.ci.sleep === v ? 'on' : '') + '" data-act="ciSleep" data-v="' + v + '">' + v + (v === 5 ? ' or less' : v === 9 ? '+' : '') + ' h</button>'; });
    h += '</div><div class="lbl" style="margin-top:22px">Resting heart rate on waking</div>' +
      '<div class="stepper" style="max-width:260px"><button data-act="ciHr" data-d="-1" aria-label="Lower">−</button><input type="number" inputmode="numeric" data-act="ciHrIn" value="' + ui.ci.hr + '" aria-label="Resting heart rate"><button data-act="ciHr" data-d="1" aria-label="Higher">+</button><div class="u">bpm · Polar strap</div></div>' +
      '<button class="btn pri big" style="margin-top:24px" data-act="ciSave">Save</button>';
    return h;
  }
  function shCoach() {
    var msgs = coachMsgs(ui.date);
    return shHead('From your coach', 'Only what matters today.') + '<div class="stack" style="margin-top:16px">' +
      msgs.map(function (m) { return '<div class="note ' + (m[0] === 'stop' || m[0] === 'miss' ? 'clay' : '') + '">' + esc(m[1]) + '</div>'; }).join('') + '</div>' +
      '<p class="cap" style="margin-top:16px">These come from your 7 rules. See them in the Coach tab.</p>';
  }
  function shChange() {
    var ds = ui.date, mids = planned(ds), d = dayR(ds);
    var h = shHead('Change today’s session', 'For travel days, or when the coach says to go easier.');
    mids.forEach(function (cur, slot) {
      h += '<div class="lbl" style="margin-top:18px">' + (slot ? 'Second session' : 'Main session') + '</div><div class="list">';
      P.middle.forEach(function (m) { var s = P.sessions[m]; h += '<button class="li" data-act="choose" data-slot="' + slot + '" data-v="' + m + '"><span class="check ' + (m === cur ? 'on' : '') + '">' + (m === cur ? ic('check', 'sm') : '') + '</span><div class="sp"><div class="t1">' + esc(splitName(s.name)[0]) + '</div><div class="t2">' + esc(splitName(s.name)[1] || '') + ' · ' + LOAD[s.load][0] + '</div></div></button>'; });
      h += '</div>';
    });
    h += '<div class="row" style="margin-top:14px">' + (mids.length < 2 ? '<button class="btn" data-act="addSlot">Add a second session</button>' : '<button class="btn" data-act="dropSlot">Remove the second session</button>') +
      (d.choice ? '<button class="btn ghost" data-act="resetChoice">Back to the week plan</button>' : '') + '</div>';
    return h;
  }
  var POSTURE = { P: 'Pull-up', U: 'Push-up', L: 'Squat', C: 'Hollow', H: 'Handstand' };
  function shLadder(k) {
    var t = P.ladder[k], c = st.ladder.cur[k], pc = passCount(k), pos = P.posture.filter(function (p) { return p[0] === POSTURE[k] || (k === 'U' && p[0] === 'Dip'); });
    var h = shHead(t.name, 'Step ' + c + ' of 20');
    h += '<div class="card" style="margin-top:16px"><div class="cap">Now</div><div class="title" style="margin:2px 0 6px">' + esc(t.steps[c - 1]) + '</div><div class="cap">' + (c < 20 ? 'Next: ' + esc(t.steps[c]) : 'Top of the track') + '</div>' +
      '<div class="row" style="margin-top:12px"><span class="dots"><i class="' + (pc >= 1 ? 'on' : '') + '"></i><i class="' + (pc >= 2 ? 'on' : '') + '"></i></span><span class="cap">' + pc + ' of 2 passes</span></div></div>' +
      '<button class="btn pri big" style="margin-top:14px" data-act="lpass" data-k="' + k + '">' + ic('check') + 'I passed the test today</button>' +
      '<div class="row" style="margin-top:8px"><span class="cap sp">Correct a wrong step</span><button class="btn" data-act="lad" data-k="' + k + '" data-n="-1" aria-label="Step down">−</button><button class="btn" data-act="lad" data-k="' + k + '" data-n="1" aria-label="Step up">+</button></div>';
    if (pos.length) h += '<div class="sec">Posture</div>' + pos.map(function (p) { return '<div class="card"><b>' + p[0] + '</b><p class="cap">' + esc(p[1]) + '</p></div>'; }).join('<div style="height:8px"></div>');
    h += '<div class="sec">All 20 steps</div><div class="list">' + t.steps.map(function (s, i) { return '<div class="li" style="cursor:default' + (i + 1 === c ? ';background:var(--accent-soft)' : '') + '"><span class="cap num" style="width:22px">' + (i + 1) + '</span><div class="sp t1" style="font-size:15px' + (i + 1 < c ? ';color:var(--muted)' : '') + '">' + esc(s) + '</div>' + (i + 1 < c ? ic('check', 'sm') : '') + '</div>'; }).join('') + '</div>';
    return h;
  }
  function shSettings() {
    var s = st.settings;
    var h = shHead('Settings', 'Version ' + VERSION);
    h += '<div class="lbl" style="margin-top:18px">Appearance</div><div class="seg3">' + ['auto', 'light', 'dark'].map(function (v) { return '<button class="' + (s.theme === v ? 'on' : '') + '" data-act="theme" data-v="' + v + '">' + { auto: 'Auto', light: 'Light', dark: 'Dark' }[v] + '</button>'; }).join('') + '</div>' +
      '<p class="cap">Auto is light in the day and dark after 7 pm, in the Night module, or when your iPhone is in dark mode.</p>';
    h += '<div class="lbl" style="margin-top:18px">Voice cues in the player</div><div class="seg3" style="grid-template-columns:1fr 1fr">' + [true, false].map(function (v) { return '<button class="' + (s.voice === v ? 'on' : '') + '" data-act="voice" data-v="' + v + '">' + (v ? 'On' : 'Off') + '</button>'; }).join('') + '</div>' +
      '<p class="cap">Sounds and voice need Silent mode off.</p>';
    h += '<div class="lbl" style="margin-top:18px">Maximum heart rate</div><div class="stepper" style="max-width:260px"><button data-act="hrmax" data-d="-1">−</button><input type="number" inputmode="numeric" data-act="hrmaxIn" value="' + s.hrmax + '"><button data-act="hrmax" data-d="1">+</button><div class="u">bpm · estimate 187 until you test</div></div>';
    h += '<div class="lbl" style="margin-top:22px">Backup</div><p class="cap">Your data lives only on this phone. If you delete the app, the data goes too. Export a backup each week.</p>' +
      '<div class="row"><button class="btn pri sp" data-act="export">Export backup</button><button class="btn sp" data-act="showJson">' + (ui.showJson ? 'Hide text' : 'Show as text') + '</button></div>' +
      (ui.showJson ? '<textarea readonly id="jsonOut" style="margin-top:10px;min-height:120px">' + esc(JSON.stringify(st)) + '</textarea><button class="btn ghost" data-act="copyJson">Copy</button>' : '') +
      '<div class="lbl" style="margin-top:14px">Import a backup</div><input type="file" accept="application/json,.json" data-act="impFile" style="font-size:15px">' +
      '<textarea id="impTxt" style="margin-top:10px" placeholder="Or paste backup text here"></textarea><button class="btn" style="margin-top:8px" data-act="impTxt">Import the pasted text</button>';
    h += '<div class="lbl" style="margin-top:22px">Install on iPhone</div><ol class="plain cap"><li>Open the app link in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Open it from the Home Screen. It then works offline.</li></ol>';
    h += '<div class="lbl" style="margin-top:22px">Reset</div>' + (ui.confirmReset ? '<p>This deletes all logs on this phone. You cannot undo it.</p><div class="row"><button class="btn" style="color:var(--clay);border-color:var(--clay)" data-act="reset2">Delete all data</button><button class="btn" data-act="reset0">Cancel</button></div>' : '<button class="btn" data-act="reset1">Delete all data…</button>');
    return h;
  }

  /* ---------- Journal ---------- */
  /* Journal: month of rings (default) or diary. Rings are read by position and line style, never by color alone:
     outer = Morning, middle = Main session, inner = Night; solid = done, dashed = missed, faint = to do. */
  function modState(ds, m) {
    var sids = m === 'main' ? planned(ds) : [m];
    if (sids.every(function (s) { return sessDone(ds, s); })) return 'done';
    if (ds < TODAY && ds >= P.phases[0].start) return 'miss';
    return 'todo';
  }
  function dayRing(ds, size) {
    var s = '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true" class="dring">';
    [['morning', 16], ['main', 11.5], ['night', 7]].forEach(function (m) {
      var stt = modState(ds, m[0]);
      s += '<circle cx="20" cy="20" r="' + m[1] + '" class="' + (stt === 'done' ? 'rd' : stt === 'miss' ? 'rm' : 'rt') + '"/>';
    });
    return s + '</svg>';
  }
  function ringLegend() {
    function sample(cls) { return '<svg width="28" height="10" aria-hidden="true"><line x1="2" y1="5" x2="26" y2="5" class="' + cls + '"/></svg>'; }
    return '<div class="legend card"><div class="row" style="align-items:center;gap:14px">' +
      '<svg viewBox="0 0 40 40" width="64" height="64" aria-hidden="true" class="dring"><circle cx="20" cy="20" r="16" class="rd"/><circle cx="20" cy="20" r="11.5" class="rm"/><circle cx="20" cy="20" r="7" class="rt"/></svg>' +
      '<div class="sp cap"><div><b>Outer</b> · Morning</div><div><b>Middle</b> · Main session</div><div><b>Inner</b> · Night</div></div></div>' +
      '<div class="row" style="gap:16px;margin-top:10px;flex-wrap:wrap"><span class="row cap" style="gap:6px">' + sample('rd') + 'Solid = done</span><span class="row cap" style="gap:6px">' + sample('rm') + 'Dashed = missed</span><span class="row cap" style="gap:6px">' + sample('rt') + 'Faint = to do</span></div></div>';
  }
  // Tags: every pointer has a symbol and a word, so nothing depends on color.
  function dayTags(ds) {
    var d = dayR(ds), all = ['morning'].concat(planned(ds), ['night']), n = all.filter(function (s) { return sessDone(ds, s); }).length, tags = [];
    var miss = all.filter(function (s) { return !sessDone(ds, s); });
    if (n === all.length) tags.push(['ok', '✓', n + '/' + all.length + ' done']);
    else if (n) tags.push(['', '◐', n + '/' + all.length + ' done']);
    if (ds < TODAY && ds >= P.phases[0].start && miss.length) tags.push(['bad', '×', 'Missed: ' + miss.map(function (s) { return s === 'morning' ? 'Morning' : s === 'night' ? 'Night' : sName(s); }).join(', ')]);
    var feel = null; all.forEach(function (s) { if (d.sessions[s] && d.sessions[s].feel && s !== 'morning' && s !== 'night') feel = d.sessions[s].feel; });
    if (feel) tags.push(['', '☺', 'Felt ' + feel.toLowerCase()]);
    if (d.sleep) tags.push(['', '☾', d.sleep + ' h sleep']);
    if (d.hr) tags.push(['', '♥', d.hr + ' bpm']);
    var pain = null; Object.keys(d.logs || {}).forEach(function (id) { var l = d.logs[id]; if (l && l.pain !== '' && l.pain != null && +l.pain > 0 && (!pain || +l.pain > pain[0]) && ITEM[id]) pain = [+l.pain, getItem(id).name]; });
    if (pain) tags.push([pain[0] > 3 ? 'bad' : '', '!', 'Pain ' + pain[0] + '/10 · ' + pain[1]]);
    (st.ladder.log || []).filter(function (x) { return x.d === ds; }).forEach(function (x) { tags.push(['ok', '▲', P.ladder[x.k].name + ' ' + (x.up ? 'up to step ' + x.s : 'test passed')]); });
    return tags;
  }
  function tagHtml(t) { return '<span class="tg ' + t[0] + '"><b aria-hidden="true">' + t[1] + '</b>' + esc(t[2]) + '</span>'; }
  function dayCard(ds, withOpen) {
    var d = dayR(ds), mids = planned(ds), notes = [];
    ['morning'].concat(mids, ['night']).forEach(function (s) { if (d.sessions[s] && d.sessions[s].note) notes.push(d.sessions[s].note); });
    var tags = dayTags(ds);
    return '<div class="card dcard"><div class="row">' + dayRing(ds, 40) + '<div class="sp"><div class="t1" style="font-weight:600">' + nice(ds) + ' · ' + esc(mids.map(sName).join(' + ')) + '</div>' +
      (ds > TODAY ? '<div class="cap">Planned</div>' : '') + '</div>' + (withOpen ? '<button class="btn ghost" data-act="pick" data-ds="' + ds + '">Open</button>' : '') + '</div>' +
      (tags.length ? '<div class="tgs">' + tags.map(tagHtml).join('') + '</div>' : ds <= TODAY ? '<div class="cap" style="margin-top:8px">Nothing logged.</div>' : '') +
      notes.map(function (n) { return '<div class="quote">“' + esc(n) + '”</div>'; }).join('') + '</div>';
  }
  function vJournal() {
    var mode = ui.jview || 'month';
    var h = '<h1 class="large" style="margin-top:12px">Journal</h1>' +
      '<div class="seg3" style="grid-template-columns:1fr 1fr;margin-top:12px"><button class="' + (mode === 'month' ? 'on' : '') + '" data-act="jview" data-v="month">Month</button><button class="' + (mode === 'diary' ? 'on' : '') + '" data-act="jview" data-v="diary">Diary</button></div>';
    if (mode === 'month') {
      var ym = ui.month.split('-'), y = +ym[0], m = +ym[1] - 1, first = new Date(y, m, 1), start = new Date(first);
      start.setDate(1 - ((first.getDay() + 6) % 7));
      h += '<div class="topbar" style="margin-top:10px"><button class="iconbtn" data-act="mon" data-n="-1" aria-label="Previous month">' + ic('back') + '</button><div class="title" style="font-size:18px">' + MONL[m] + ' ' + y + '</div><button class="iconbtn" data-act="mon" data-n="1" aria-label="Next month">' + ic('fwd') + '</button></div>';
      h += '<div class="mgrid">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<div class="cap" style="text-align:center">' + x + '</div>'; }).join('');
      for (var i = 0; i < 42; i++) {
        var dt = new Date(start); dt.setDate(start.getDate() + i); var ds = iso(dt);
        if (i >= 35 && dt.getMonth() !== m) break;
        h += '<button class="mday' + (dt.getMonth() !== m ? ' out' : '') + (ds === TODAY ? ' today' : '') + (ds === ui.jday ? ' sel' : '') + '" data-act="jday" data-ds="' + ds + '" aria-label="' + longDate(ds) + '"><span class="num">' + dt.getDate() + '</span>' + dayRing(ds, 40) + '</button>';
      }
      h += '</div>';
      if (ui.jday) h += dayCard(ui.jday, true);
      h += ringLegend();
    } else {
      var mon = ui.week, sun = addDays(mon, 6), done = 0, tot = 0, missN = 0, sl = [];
      h += '<div class="topbar" style="margin-top:10px"><button class="iconbtn" data-act="wk" data-n="-7" aria-label="Previous week">' + ic('back') + '</button><div class="title" style="font-size:18px">' + parse(mon).getDate() + ' ' + MON[parse(mon).getMonth()] + ' – ' + parse(sun).getDate() + ' ' + MON[parse(sun).getMonth()] + '</div><button class="iconbtn" data-act="wk" data-n="7" aria-label="Next week">' + ic('fwd') + '</button></div>';
      var cards = '';
      for (var j = 6; j >= 0; j--) {
        var x = addDays(mon, j); if (x > TODAY) continue;
        var all = ['morning'].concat(planned(x), ['night']); tot += all.length; done += all.filter(function (s) { return sessDone(x, s); }).length;
        if (x < TODAY && x >= P.phases[0].start) missN += all.filter(function (s) { return !sessDone(x, s); }).length;
        if (dayR(x).sleep) sl.push(+dayR(x).sleep);
        cards += '<div class="tl-i">' + dayCard(x, true) + '</div>';
      }
      var sum = [['ok', '✓', done + '/' + tot + ' done']];
      if (missN) sum.push(['bad', '×', missN + ' missed']);
      if (sl.length) sum.push(['', '☾', 'avg ' + (Math.round(sl.reduce(function (a, b) { return a + b; }, 0) / sl.length * 10) / 10) + ' h sleep']);
      h += tot ? '<div class="tgs" style="margin:4px 0 12px">' + sum.map(tagHtml).join('') + '</div><div class="tl">' + cards + '</div>' : '<p class="cap">Nothing yet this week. Days appear here as you live them.</p>';
    }
    return h;
  }
  // Ladder list (lives in Progress). Pass count is shown as words, not only dots.
  function ladderList() {
    return '<div class="sec">Ladder · 100 steps</div><div class="list">' + Object.keys(P.ladder).map(function (k) {
      var c = st.ladder.cur[k], pc = passCount(k);
      return '<button class="li" data-act="ladder" data-k="' + k + '"><div style="width:40px" class="num title">' + c + '</div><div class="sp"><div class="t1">' + P.ladder[k].name + '</div><div class="t2">' + esc(P.ladder[k].steps[c - 1]) + '</div></div><span class="cap">' + pc + '/2 passes</span>' + ic('chev', 'sm') + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- Progress ---------- */
  function ring(frac, size) {
    var r = 40, c = 2 * Math.PI * r;
    return '<svg viewBox="0 0 100 100" style="width:' + size + 'px;height:' + size + 'px;transform:rotate(-90deg)"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - Math.min(1, frac)) + '"/></svg>';
  }
  function totalSessions() { var n = 0; Object.keys(st.days).forEach(function (ds) { var s = st.days[ds].sessions || {}; Object.keys(s).forEach(function (k) { if (s[k].done) n++; }); }); return n; }
  function milestones() {
    var days = Object.keys(st.days).sort(), total = totalSessions(), full = false, best = 0, run = 0;
    days.forEach(function (ds) { var all = ['morning'].concat(planned(ds), ['night']); if (all.every(function (s) { return sessDone(ds, s); })) full = true; });
    if (days.length) for (var x = days[0]; x <= TODAY; x = addDays(x, 1)) { var dd = st.days[x], any = dd && Object.keys(dd.sessions || {}).some(function (k) { return dd.sessions[k].done; }); run = any ? run + 1 : 0; best = Math.max(best, run); }
    var steps = 0; Object.keys(P.ladder).forEach(function (k) { steps += Math.max(0, st.ladder.cur[k] - P.ladderStart[k]); });
    return [['First session', total >= 1], ['A full day', full], ['Seven days moving', best >= 7], ['10 sessions', total >= 10], ['50 sessions', total >= 50], ['100 sessions', total >= 100], ['First ladder step', steps >= 1], ['5 ladder steps', steps >= 5], ['Block 0 complete', TODAY > '2026-12-06' && total >= 20]];
  }
  function vProgress() {
    var mon = mondayOf(TODAY), plannedN = 0, doneN = 0, missed = [];
    for (var i = 0; i < 7; i++) {
      var x = addDays(mon, i), all = ['morning'].concat(planned(x), ['night']);
      plannedN += all.length; doneN += all.filter(function (s) { return sessDone(x, s); }).length;
      missedMid(x).forEach(function (m) { missed.push(DOW[parse(x).getDay()] + ' · ' + sName(m)); });
    }
    var frac = plannedN ? doneN / plannedN : 0;
    var words = doneN === 0 ? 'A new week. One session at a time.' : frac >= 0.8 ? 'A steady week. This is how it compounds.' : frac >= 0.5 ? 'Good work. Keep the rhythm.' : 'Every session counts. Keep showing up.';
    var h = '<h1 class="large" style="margin-top:12px">Progress</h1><div class="sub">Quiet numbers, honest trends.</div>';
    h += '<div class="card ringstat" style="margin-top:18px">' + ring(frac, 88) + '<div><div class="cap">This week</div><div class="title num">' + doneN + ' of ' + plannedN + ' sessions</div><div class="cap" style="margin-top:4px">' + words + '</div></div></div>';
    if (missed.length) h += '<div class="note clay" style="margin-top:12px">Missed this week: ' + esc(missed.join(', ')) + '. No need to make it up. Continue the plan.</div>';
    h += ladderList();
    h += '<div class="sec">Milestones</div><div class="badges">' + milestones().map(function (m) { return '<div class="badge ' + (m[1] ? 'on' : '') + '"><div class="m">' + (m[1] ? ic('check', 'sm') : '') + '</div>' + m[0] + '</div>'; }).join('') + '</div>';
    var logged = Object.keys(ITEM).filter(function (id) { return !isLite(ITEM[id].s, ITEM[id].it) && Object.keys(st.days).some(function (ds) { return hasLog(st.days[ds].logs && st.days[ds].logs[id]); }); });
    h += '<div class="sec">Exercise trend</div><div class="card">';
    if (!logged.length) h += '<p class="cap">Log a few strength sets. The trend shows here.</p>';
    else {
      if (logged.indexOf(ui.prog) < 0) ui.prog = logged[0];
      h += '<select data-act="prog" aria-label="Exercise">' + logged.map(function (id) { return '<option value="' + id + '"' + (id === ui.prog ? ' selected' : '') + '>' + esc(getItem(id).name) + '</option>'; }).join('') + '</select>';
      h += '<p class="cap" style="margin:10px 0 4px">Best set each session · ' + { l: 'load (kg)', r: 'reps', t: 'seconds' }[exSeries(ui.prog).metric] + '</p><canvas class="chart" id="cEx"></canvas>';
    }
    h += '</div><div class="sec">Resting heart rate</div><div class="card"><canvas class="chart" id="cHr"></canvas></div>' +
      '<div class="sec">Sleep</div><div class="card"><canvas class="chart" id="cSl"></canvas></div>' +
      '<div class="sec">Highest pain each day</div><div class="card"><canvas class="chart" id="cPa"></canvas><p class="cap">The line marks 3/10, your pain limit.</p></div>';
    return h;
  }
  function exSeries(id) {
    var pts = [];
    Object.keys(st.days).sort().forEach(function (ds) {
      var l = st.days[ds].logs && st.days[ds].logs[id]; if (!hasLog(l)) return;
      var mx = { r: 0, l: 0, t: 0 }; (l.sets || []).filter(Boolean).forEach(function (x) { mx.r = Math.max(mx.r, +x.r || 0); mx.l = Math.max(mx.l, +x.l || 0); mx.t = Math.max(mx.t, +x.t || 0); });
      pts.push({ ds: ds, r: mx.r, l: mx.l, t: mx.t });
    });
    var metric = pts.some(function (p) { return p.l; }) ? 'l' : pts.some(function (p) { return p.r; }) ? 'r' : 't';
    return { metric: metric, pts: pts.map(function (p) { return { ds: p.ds, v: p[metric] }; }).filter(function (p) { return p.v; }) };
  }
  function daySeries(f) { return Object.keys(st.days).sort().map(function (ds) { return { ds: ds, v: st.days[ds][f] ? +st.days[ds][f] : null }; }).filter(function (p) { return p.v; }); }
  function painSeries() {
    return Object.keys(st.days).sort().map(function (ds) { var mx = null, L = st.days[ds].logs || {}; Object.keys(L).forEach(function (k) { if (L[k] && L[k].pain !== '' && L[k].pain != null) mx = Math.max(mx == null ? 0 : mx, +L[k].pain); }); return { ds: ds, v: mx }; }).filter(function (p) { return p.v != null; });
  }
  function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function drawCharts() {
    if (document.getElementById('cEx')) chart('cEx', exSeries(ui.prog).pts);
    chart('cHr', daySeries('hr')); chart('cSl', daySeries('sleep')); chart('cPa', painSeries(), 0, 10, 3);
  }
  function chart(id, pts, ymin, ymax, line) {
    var c = document.getElementById(id); if (!c) return;
    var dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight, acc = cssv('--accent'), mut = cssv('--muted'), ln = cssv('--line'), clay = cssv('--clay');
    c.width = w * dpr; c.height = h * dpr; var g = c.getContext('2d'); g.scale(dpr, dpr);
    g.font = '12px -apple-system, system-ui, sans-serif'; g.fillStyle = mut;
    if (!pts.length) { g.fillText('No data yet.', 0, 20); return; }
    var vs = pts.map(function (p) { return p.v; }), lo = ymin != null ? ymin : Math.min.apply(null, vs), hi = ymax != null ? ymax : Math.max.apply(null, vs);
    if (lo === hi) { lo -= 1; hi += 1; }
    var pL = 30, pR = 6, pT = 8, pB = 22, W = w - pL - pR, H = h - pT - pB;
    var t0 = parse(pts[0].ds).getTime(), t1 = parse(pts[pts.length - 1].ds).getTime(); if (t1 === t0) t1 = t0 + 86400000;
    function X(p) { return pL + (parse(p.ds).getTime() - t0) / (t1 - t0) * W; }
    function Y(v) { return pT + (1 - (v - lo) / (hi - lo)) * H; }
    g.strokeStyle = ln; g.lineWidth = 1;
    for (var i = 0; i <= 3; i++) { var v = lo + (hi - lo) * i / 3, y = Y(v); g.beginPath(); g.moveTo(pL, y); g.lineTo(w - pR, y); g.stroke(); g.fillText(String(Math.round(v * 10) / 10), 0, y + 4); }
    if (line != null) { g.strokeStyle = clay; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pL, Y(line)); g.lineTo(w - pR, Y(line)); g.stroke(); g.setLineDash([]); }
    g.fillStyle = mut; g.fillText(nice(pts[0].ds), pL, h - 4);
    if (pts.length > 1) { var lt = nice(pts[pts.length - 1].ds); g.fillText(lt, w - pR - g.measureText(lt).width, h - 4); }
    g.strokeStyle = acc; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
    pts.forEach(function (p, i) { if (i) g.lineTo(X(p), Y(p.v)); else g.moveTo(X(p), Y(p.v)); }); g.stroke();
    g.fillStyle = acc; var lp = pts[pts.length - 1]; g.beginPath(); g.arc(X(lp), Y(lp.v), 4, 0, 7); g.fill();
  }

  /* ---------- Coach ---------- */
  function vCoach() {
    var hm = st.settings.hrmax || 187, ph = phaseOf(TODAY);
    function z(a, b) { return Math.round(hm * a) + '–' + Math.round(hm * b); }
    var h = '<div class="topbar"><span></span><button class="iconbtn" data-act="settings" aria-label="Settings">' + ic('gear') + '</button></div>' +
      '<h1 class="large">Coach</h1><div class="sub">Russian method. Longevity first. Muscle is the result.</div>';
    h += '<div class="sec">Philosophy</div><div class="card"><ol class="plain">' + P.philosophy.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>';
    h += '<div class="sec">The 7 rules</div><div class="list">' + P.rules.map(function (r, i) { return '<div class="li" style="cursor:default;align-items:flex-start"><span class="num title" style="width:24px;font-size:17px">' + (i + 1) + '</span><div class="sp"><div class="t1">' + r[0] + '</div><div class="t2">' + esc(r[1]) + '</div></div></div>'; }).join('') + '</div>';
    h += '<div class="sec">Season</div><div class="list">' + P.phases.map(function (p) { var cur = p.n === ph.p.n && !ph.pre; return '<div class="li" style="cursor:default;align-items:flex-start' + (cur ? ';background:var(--accent-soft)' : '') + '"><span class="num title" style="width:24px;font-size:17px">' + p.n + '</span><div class="sp"><div class="t1">' + esc(p.name) + (cur ? ' · now' : '') + '</div><div class="t2">' + nice(p.start) + ' – ' + nice(p.end) + '</div><div class="t2">' + esc(p.focus) + '</div></div></div>'; }).join('') + '</div>';
    h += '<div class="sec">Heart-rate zones · HRmax ' + hm + '</div><div class="list">' +
      [['Zone 2 · easy', '65–75%', z(.65, .75)], ['Threshold', '80–88%', z(.8, .88)], ['VO2max', '90–95%', z(.9, .95)]].map(function (r) { return '<div class="li" style="cursor:default"><div class="sp"><div class="t1">' + r[0] + '</div><div class="t2">' + r[1] + '</div></div><span class="num">' + r[2] + ' bpm</span></div>'; }).join('') + '</div>';
    h += '<div class="sec">Posture standards</div><div class="list">' + P.posture.map(function (p) { return '<div class="li" style="cursor:default;align-items:flex-start"><div class="sp"><div class="t1">' + p[0] + '</div><div class="t2">' + esc(p[1]) + '</div></div></div>'; }).join('') + '</div>';
    return h;
  }

  /* ---------- player ---------- */
  var ac = null, wl = null;
  function tone(f, d, gain, when, type) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (when || 0);
      o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain || .4, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.start(t); o.stop(t + d + .03);
    } catch (e) {}
  }
  function tick3() { tone(784, .09, .35); }
  // Stopwatch-style alarm: three double beeps you can hear from a pocket.
  function alarm() { [0, .14, .5, .64, 1.0, 1.14].forEach(function (w) { tone(1318, .1, .8, w, 'triangle'); }); }
  function say(text) {
    if (!st.settings.voice || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1; speechSynthesis.speak(u); } catch (e) {}
  }
  function spoken(s) { s = Math.round(s); if (s < 60) return s + ' seconds'; var m = Math.floor(s / 60), r = s % 60; return m + (m === 1 ? ' minute' : ' minutes') + (r ? ' ' + r + ' seconds' : ''); }
  function speakName(it) { return it.name.replace(/\(.*?\)/g, '').replace(/[·:]/g, ',').trim(); }
  function lock() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () {}); } catch (e) {} }
  function unlock() { try { if (wl) wl.release(); } catch (e) {} wl = null; }
  document.addEventListener('visibilitychange', function () { if (!tEl.hidden && document.visibilityState === 'visible') lock(); });

  function buildSegs(it, lite, hasNext) {
    var segs = [], n = it.sets || 1, rest = it.rest || 0;
    if (lite && rest > 10) rest = 10;
    for (var i = 0; i < n; i++) {
      var of = n > 1 ? ' ' + (i + 1) + ' of ' + n : '';
      if (it.k === 'drills') {
        var pn = phaseOf(T.ds || ui.date).p.n, dr = P.drills.filter(function (x) { return x.from == null || pn >= x.from; });
        dr.forEach(function (x, j) { segs.push({ label: x.n, secs: it.ds || 60, work: true, dd: x.d, drill: (j + 1) + ' of ' + dr.length }); });
        break;
      }
      if (it.k === 'reps') segs.push({ label: (lite ? 'Go' : 'Set') + of, secs: null, work: true, set: i });
      else if (it.k === 'interval') segs.push({ label: 'Work' + of, secs: it.s, work: true, set: i });
      else segs.push({ label: (it.k === 'hold' ? 'Hold' : 'Go') + of, secs: it.s || 60, work: true, set: i });
      if (i < n - 1 && rest) segs.push({ label: 'Rest', secs: rest, work: false });
      if (it.k === 'interval' && i === n - 1 && rest) segs.push({ label: 'Recovery', secs: rest, work: false });
    }
    if (hasNext) segs.push({ label: 'Rest', secs: lite ? 8 : Math.max(30, it.rest || 60), work: false, trans: true });
    return segs;
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60); return m + ':' + pad(s % 60); }
  function openPlayer(sid, startId) {
    closeSheet();
    var n = phaseOf(ui.date).p.n, d = dayR(ui.date);
    var q = visibleItems(sid, ui.date).filter(function (it) { return itemPhaseOk(it, n) || it.id === startId; }).map(function (it) { return it.id; });
    if (!q.length) return;
    var qi = 0;
    if (startId) qi = Math.max(0, q.indexOf(startId));
    else for (var k = 0; k < q.length; k++) if (!itemDone(ui.date, q[k])) { qi = k; break; }
    T.sid = sid; T.q = q; T.ds = ui.date; T.finished = false; T.t0 = Date.now(); T.sfeel = '';
    tEl.hidden = false; applyTheme(); tone(1, .001, .0001); loadEx(qi);
  }
  function loadEx(qi) {
    stopTick();
    T.qi = qi; T.item = getItem(T.q[qi]); T.lite = isLite(T.sid, T.item); T.finished = false;
    T.segs = buildSegs(T.item, T.lite, qi < T.q.length - 1); T.i = 0; T.up = 0; T.left = T.segs[0].secs || 0;
    initVals(); startTick(); drawTimer(); announce(true);
  }
  function initVals() {
    var s = T.segs[T.i]; T.vals = null; if (!s || s.secs != null || T.lite) return;
    var l = dayR(T.ds).logs[T.item.id], cur = (l && l.sets && l.sets[s.set]) || {}, last = lastLog(T.item.id, T.ds), ls = (last && last.l.sets && last.l.sets[s.set]) || {};
    T.vals = { r: cur.r || ls.r || T.item.reps || 0, l: cur.l || ls.l || 0 };
  }
  function announce(first) {
    var s = T.segs[T.i], it = T.item; if (!s) return;
    var nextIt = T.q[T.qi + 1] ? getItem(T.q[T.qi + 1]) : null;
    if (s.dd) say(s.label + '.');
    else if (s.trans) say('Rest. Next: ' + speakName(nextIt) + '.');
    else if (!s.work) say('Rest. ' + spoken(s.secs) + '.');
    else if (first) say(speakName(it) + '. ' + (s.secs ? spoken(s.secs) : it.reps ? it.reps + ' reps' : '') + '.');
    else say(s.label + '. ' + (s.secs ? spoken(s.secs) : '') );
  }
  function segBar() {
    var d = dayR(T.ds), h = '<div class="segs" aria-hidden="true">';
    T.q.forEach(function (id, i) {
      var f = 0;
      if (i < T.qi || (i !== T.qi && itemDone(T.ds, id))) f = 1;
      else if (i === T.qi) { var w = T.segs.filter(function (x) { return x.work; }).length, wd = T.segs.slice(0, T.i).filter(function (x) { return x.work; }).length; f = T.finished ? 1 : w ? wd / w : 0; }
      h += '<i class="' + (i === T.qi && !T.finished ? 'cur' : '') + '"><b style="width:' + Math.round(f * 100) + '%"></b></i>';
    });
    return h + '</div>';
  }
  var RC = 2 * Math.PI * 46;
  function ringOffset() { var s = T.segs[T.i]; if (!s || s.secs == null) return 0; return RC * (1 - Math.max(0, T.left) / s.secs); }
  function drawTimer() {
    var it = T.item, s = T.segs[T.i], S = P.sessions[T.sid];
    var head = segBar() + '<div class="pHead"><button class="iconbtn" data-t="close" aria-label="Close">' + ic('close') + '</button><div class="cap num">' + (T.qi + 1) + ' of ' + T.q.length + ' · ' + esc(splitName(S.name)[0]) + '</div>' +
      '<button class="iconbtn" data-t="sound" aria-label="' + (st.settings.voice ? 'Voice on' : 'Voice off') + '">' + ic(st.settings.voice ? 'sound' : 'mute') + '</button></div>';
    if (T.finished) {
      var d = dayR(T.ds), mins = Math.max(1, Math.round((Date.now() - T.t0) / 60000)), exDone = T.q.filter(function (id) { return itemDone(T.ds, id); }).length, sets = 0;
      T.q.forEach(function (id) { var l = d.logs[id]; if (l && l.sets) sets += l.sets.filter(function (x) { return x && (x.r || x.l || x.t); }).length; });
      tEl.innerHTML = head + '<div style="margin:auto 0;text-align:center"><div class="eyebrow">' + esc(splitName(S.name)[0]) + '</div><div class="large">Session complete</div><p class="sub">Quality work. Recover well.</p>' +
        '<div class="card" style="margin:18px 0;display:grid;grid-template-columns:repeat(3,1fr);text-align:center"><div><div class="title num">' + mins + '</div><div class="cap">minutes</div></div><div><div class="title num">' + exDone + '</div><div class="cap">exercises</div></div><div><div class="title num">' + sets + '</div><div class="cap">sets logged</div></div></div>' +
        '<div class="lbl">How did it feel?</div><div class="chips" style="justify-content:center">' + ['Easy', 'Good', 'Hard', 'Too hard'].map(function (f) { return '<button class="chip ' + (T.sfeel === f ? 'on' : '') + '" data-t="sfeel" data-v="' + f + '">' + f + '</button>'; }).join('') + '</div></div>' +
        '<button class="btn pri big" data-t="finish">Finish</button><button class="btn ghost full" style="margin-top:6px" data-t="prevEx">Back to the last exercise</button>';
      return;
    }
    var manual = s.secs == null, nextIt = T.q[T.qi + 1] ? getItem(T.q[T.qi + 1]) : null;
    var title = s.trans ? 'Next: ' + nextIt.name : it.name, sub = s.trans ? nextIt.dose : (it.track ? it.track + ' · ' : '') + it.dose;
    var lab = s.trans ? 'Rest' : s.label + (T.run ? '' : ' · paused');
    var lab2 = s.dd ? 'Drill ' + s.drill : manual ? (T.lite ? 'Tap Done when finished' : 'Tap Set done when finished') : s.trans ? 'Breathe. Get ready.' : !s.work ? 'Breathe out slowly' : '';
    if (s.dd) sub = s.dd;
    var after = s.trans ? '' : T.segs[T.i + 1] && !T.segs[T.i + 1].trans ? 'Then ' + T.segs[T.i + 1].label.toLowerCase() + (T.segs[T.i + 1].secs ? ' · ' + fmt(T.segs[T.i + 1].secs) : '') : nextIt ? 'Next exercise · ' + nextIt.name : 'Last exercise';
    var h = head + '<div class="pEx"><button class="iconbtn" data-t="prevEx" aria-label="Previous exercise"' + (T.qi === 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('back') + '</button>' +
      '<div><div class="n">' + esc(title) + '</div><div class="d">' + esc(sub) + '</div>' + (it.lad && !it.light && !s.trans ? '<button class="pill" data-t="lpass">' + ic('check', 'sm') + 'Passed test · ' + passCount(it.lad) + '/2</button>' : '') + '</div>' +
      '<button class="iconbtn" data-t="nextEx" aria-label="Next exercise">' + ic('fwd') + '</button></div>';
    h += '<div class="ringwrap ' + (s.work ? '' : 'rest') + '"><div class="breath"></div><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" id="ringFg" cx="50" cy="50" r="46" stroke-dasharray="' + RC + '" stroke-dashoffset="' + ringOffset() + '"' + (manual ? ' style="stroke:var(--accent-soft)"' : '') + '/></svg>' +
      '<div><div class="lab">' + esc(lab) + '</div><div class="tm" id="tTime">' + (manual ? fmt(T.up) : fmt(T.left)) + '</div><div class="lab2">' + esc(lab2) + '</div></div></div>';
    h += '<div class="pNext">' + esc(after) + '</div>';
    if (manual && T.vals) h += '<div class="pSteps"><div class="stepper"><button data-t="tstp" data-f="r" data-d="-1" aria-label="Fewer reps">−</button><input type="number" inputmode="numeric" id="tR" value="' + T.vals.r + '" aria-label="Reps"><button data-t="tstp" data-f="r" data-d="1" aria-label="More reps">+</button><div class="u">reps</div></div>' +
      '<div class="stepper"><button data-t="tstp" data-f="l" data-d="-1" aria-label="Less load">−</button><input type="number" inputmode="decimal" id="tL" value="' + (T.vals.l || '') + '" placeholder="body" aria-label="Load in kg"><button data-t="tstp" data-f="l" data-d="1" aria-label="More load">+</button><div class="u">kg</div></div></div>';
    h += '<div class="pCtl" style="grid-template-columns:1fr 1fr">' + (manual
      ? '<button class="btn" data-t="toggle">' + ic(T.run ? 'pause' : 'play', 'sm') + (T.run ? 'Pause' : 'Resume') + '</button><button class="btn" data-t="skip">' + ic('skip', 'sm') + 'Skip</button>'
      : '<button class="btn" data-t="plus">' + ic('plus', 'sm') + '+15 s</button><button class="btn" data-t="skip">' + ic('skip', 'sm') + (s.work ? 'Skip' : 'Skip rest') + '</button>') + '</div>';
    h += manual ? '<button class="btn pri big" data-t="setdone">' + ic('check') + (T.lite ? 'Done' : 'Set done') + '</button>'
      : '<button class="btn pri big" data-t="toggle">' + ic(T.run ? 'pause' : 'play') + (T.run ? 'Pause' : 'Resume') + '</button>';
    tEl.innerHTML = h;
  }
  function tick() {
    var now = performance.now(), dt = (now - T.last) / 1000; T.last = now;
    var s = T.segs[T.i]; if (!s) return;
    if (s.secs == null) { T.up += dt; var e0 = document.getElementById('tTime'); if (e0) e0.textContent = fmt(T.up); return; }
    var before = Math.ceil(T.left); T.left -= dt; var after = Math.ceil(T.left);
    if (after !== before && after <= 3 && after > 0) tick3();
    if (T.left <= 0) { alarm(); nextSeg(); return; }
    var e = document.getElementById('tTime'); if (e) e.textContent = fmt(T.left);
    var r = document.getElementById('ringFg'); if (r) r.setAttribute('stroke-dashoffset', ringOffset());
  }
  function startTick() { if (T.iv) return; T.last = performance.now(); T.iv = setInterval(tick, 200); T.run = true; lock(); }
  function stopTick() { clearInterval(T.iv); T.iv = null; T.run = false; }
  function markDone(id) { var d = dayW(T.ds); d.done = d.done || {}; d.done[id] = true; save(); }
  function finishSession() { stopTick(); unlock(); T.finished = true; drawTimer(); say('Session complete. Good work.'); }
  function nextSeg() {
    T.i++;
    if (!T.segs.slice(T.i).some(function (x) { return x.work; })) markDone(T.item.id);
    var s = T.segs[T.i];
    if (!s) { if (T.qi < T.q.length - 1) loadEx(T.qi + 1); else finishSession(); return; }
    T.left = s.secs || 0; T.up = 0; T.last = performance.now(); initVals();
    if (!T.iv) startTick();
    drawTimer(); announce(false);
  }
  function logAt(ds, id) { var d = dayW(ds); d.logs[id] = d.logs[id] || { sets: [] }; d.logs[id].sets = d.logs[id].sets || []; return d.logs[id]; }
  function saveSetFromPlayer() {
    var s = T.segs[T.i]; if (!s || s.set == null || T.lite || !T.vals) return;
    var r = document.getElementById('tR'), k = document.getElementById('tL');
    if (r && r.value !== '') T.vals.r = +r.value; if (k) T.vals.l = k.value === '' ? 0 : +k.value;
    var l = logAt(T.ds, T.item.id); if (T.item.step) l.step = T.item.step; while (l.sets.length <= s.set) l.sets.push({});
    if (T.vals.r) l.sets[s.set].r = T.vals.r; if (T.vals.l) l.sets[s.set].l = T.vals.l;
    save();
  }
  tEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b || b.disabled) return; var a = b.dataset.t;
    tone(1, .001, .0001); // unlocks audio on iOS inside the tap
    if (a === 'close' || a === 'finish') {
      if (a === 'finish') { var d = dayW(T.ds); d.sessions[T.sid] = d.sessions[T.sid] || {}; d.sessions[T.sid].done = true; if (T.sfeel) d.sessions[T.sid].feel = T.sfeel; save(); toast('Session done. Well done.'); }
      stopTick(); unlock(); try { speechSynthesis.cancel(); } catch (x) {}
      tEl.hidden = true; ui.date = T.ds; ui.sid = a === 'finish' ? null : T.sid; if (a === 'finish') ui.tab = 'today'; render(); window.scrollTo(0, 0); return;
    }
    if (a === 'sound') { st.settings.voice = !st.settings.voice; save(); drawTimer(); if (st.settings.voice) say('Voice on.'); }
    if (a === 'toggle') { if (T.run) stopTick(); else startTick(); drawTimer(); }
    if (a === 'plus') { T.left += 15; drawTimer(); }
    if (a === 'skip') nextSeg();
    if (a === 'setdone') { saveSetFromPlayer(); tone(988, .15, .5); nextSeg(); }
    if (a === 'tstp') { var f = b.dataset.f, inp = document.getElementById(f === 'r' ? 'tR' : 'tL'); var v = +(inp.value || 0) + (+b.dataset.d) * (f === 'r' ? 1 : 2.5); v = Math.max(0, Math.round(v * 10) / 10); inp.value = v || (f === 'l' ? '' : 0); T.vals[f] = v; }
    if (a === 'lpass') { saveSetFromPlayer(); ladPass(T.item.lad, T.ds); T.item = getItem(T.item.id); drawTimer(); }
    if (a === 'nextEx') { saveSetFromPlayer(); markDone(T.item.id); if (T.qi < T.q.length - 1) loadEx(T.qi + 1); else finishSession(); }
    if (a === 'prevEx') { if (T.finished) loadEx(T.qi); else if (T.qi > 0) loadEx(T.qi - 1); }
    if (a === 'sfeel') { T.sfeel = T.sfeel === b.dataset.v ? '' : b.dataset.v; drawTimer(); }
  });
  tEl.addEventListener('change', function (e) { if (!T.vals) return; if (e.target.id === 'tR') T.vals.r = +e.target.value || 0; if (e.target.id === 'tL') T.vals.l = +e.target.value || 0; });

  /* ---------- events (main view and sheet) ---------- */
  function logW(id) { var d = dayW(ui.date); d.logs[id] = d.logs[id] || { sets: [] }; d.logs[id].sets = d.logs[id].sets || []; var gi = getItem(id); if (gi.step) d.logs[id].step = gi.step; return d.logs[id]; }
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.dataset.act;
    if ((b.tagName === 'INPUT' || b.tagName === 'TEXTAREA' || b.tagName === 'SELECT')) return;
    var id = b.dataset.id;
    switch (a) {
      case 'open': ui.sid = b.dataset.sid; render(); window.scrollTo(0, 0); break;
      case 'play': if (ui.sid !== b.dataset.sid) ui.sid = null; ui.sid = ui.sid || null; ui.sid = b.dataset.sid; render(); openPlayer(b.dataset.sid); break;
      case 'back': ui.sid = null; render(); window.scrollTo(0, 0); break;
      case 'ex': openSheet({ type: 'ex', id: id }); break;
      case 'startHere': openPlayer(ITEM[id].s, id); break;
      case 'closeSheet': ui.ci = null; closeSheet(); break;
      case 'day': ui.date = addDays(ui.date, +b.dataset.n); render(); break;
      case 'goToday': ui.date = TODAY; render(); break;
      case 'pick': ui.date = b.dataset.ds; ui.tab = 'today'; ui.sid = null; render(); window.scrollTo(0, 0); break;
      case 'flow': ui.bothFlows = b.dataset.v === '1'; render(); break;
      case 'checkin': ui.ci = null; openSheet({ type: 'checkin' }); break;
      case 'ciSleep': ui.ci.sleep = +b.dataset.v; renderSheet(); break;
      case 'ciHr': ui.ci.hr = Math.max(30, Math.min(120, (+ui.ci.hr || 60) + (+b.dataset.d))); renderSheet(); break;
      case 'ciSave': var dc = dayW(ui.date); if (ui.ci.sleep) dc.sleep = ui.ci.sleep; if (ui.ci.hr) dc.hr = ui.ci.hr; save(); ui.ci = null; ui.sheet = null; render(); toast('Check-in saved'); break;
      case 'coach': openSheet({ type: 'coach' }); break;
      case 'change': openSheet({ type: 'change' }); break;
      case 'choose': var dch = dayW(ui.date); dch.choice = planned(ui.date); dch.choice[+b.dataset.slot] = b.dataset.v; save(); render(); break;
      case 'addSlot': var d1 = dayW(ui.date); d1.choice = planned(ui.date); d1.choice.push('fieldA'); save(); render(); break;
      case 'dropSlot': var d2 = dayW(ui.date); d2.choice = planned(ui.date).slice(0, 1); save(); render(); break;
      case 'resetChoice': delete dayW(ui.date).choice; save(); render(); break;
      case 'ldone': var dl = dayW(ui.date); dl.done = dl.done || {}; if (dl.done[id]) delete dl.done[id]; else dl.done[id] = true; save(); render(); break;
      case 'feel': var lf = logW(id); lf.feel = lf.feel === b.dataset.v ? '' : b.dataset.v; if (lf.feel !== 'Pain') lf.pain = ''; var dd = dayW(ui.date); dd.done = dd.done || {}; dd.done[id] = true; save(); render(); break;
      case 'lchip': var lc = logW(id); lc[b.dataset.f] = String(lc[b.dataset.f]) === b.dataset.v ? '' : +b.dataset.v; save(); render(); break;
      case 'stp':
        var inp = b.parentNode.querySelector('input'), f = b.dataset.f, stepv = f === 'l' ? 2.5 : f === 't' ? 5 : 1;
        var cur = inp.value !== '' ? +inp.value : (+inp.placeholder || 0), nv = Math.max(0, Math.round((cur + (+b.dataset.d) * stepv) * 10) / 10);
        var ls = logW(id), i = +b.dataset.i; while (ls.sets.length <= i) ls.sets.push({}); ls.sets[i][f] = nv || ''; save(); render(); break;
      case 'addSet': var la = logW(id), ia = getItem(id); while (la.sets.length < Math.min(ia.sets || 1, 8)) la.sets.push({}); la.sets.push({}); save(); render(); break;
      case 'quick':
        var iq = getItem(id), lq = logW(id);
        if (!(lq.sets || []).some(function (x) { return x && (x.r || x.l || x.t); })) { lq.sets = []; for (var k = 0; k < (iq.sets || 1); k++) lq.sets.push(iq.k === 'reps' ? { r: iq.reps || '' } : { t: iq.s || '' }); }
        save(); render(); toast('Logged as planned'); break;
      case 'sdone': var ds3 = dayW(ui.date); ds3.sessions[ui.sid] = ds3.sessions[ui.sid] || {}; ds3.sessions[ui.sid].done = !ds3.sessions[ui.sid].done; save(); render(); break;
      case 'wk': ui.week = addDays(ui.week, +b.dataset.n); render(); break;
      case 'jview': ui.jview = b.dataset.v; render(); break;
      case 'jday': ui.jday = b.dataset.ds; render(); break;
      case 'mon': var pm = ui.month.split('-'), nd = new Date(+pm[0], +pm[1] - 1 + (+b.dataset.n), 1); ui.month = nd.getFullYear() + '-' + pad(nd.getMonth() + 1); render(); break;
      case 'ladder': openSheet({ type: 'ladder', k: b.dataset.k }); break;
      case 'lpass': ladPass(b.dataset.k, ui.sid ? ui.date : TODAY); render(); break;
      case 'lad':
        var kk = b.dataset.k, c = st.ladder.cur[kk] + (+b.dataset.n); if (c < 1 || c > 20) break;
        st.ladder.cur[kk] = c; st.ladder.hist.push({ d: TODAY, k: kk, s: c }); st.ladder.pass[kk] = []; save(); render(); break;
      case 'settings': openSheet({ type: 'settings' }); break;
      case 'theme': st.settings.theme = b.dataset.v; save(); render(); break;
      case 'voice': st.settings.voice = b.dataset.v === 'true'; save(); render(); break;
      case 'hrmax': st.settings.hrmax = Math.max(140, Math.min(220, st.settings.hrmax + (+b.dataset.d))); save(); render(); break;
      case 'export': exportData(); break;
      case 'showJson': ui.showJson = !ui.showJson; renderSheet(); break;
      case 'copyJson': var ta = document.getElementById('jsonOut'); try { navigator.clipboard.writeText(ta.value).then(function () { toast('Copied'); }, function () { ta.select(); }); } catch (x) { ta.select(); } break;
      case 'impTxt': importText(document.getElementById('impTxt').value); break;
      case 'reset1': ui.confirmReset = true; renderSheet(); break;
      case 'reset0': ui.confirmReset = false; renderSheet(); break;
      case 'reset2': st = fresh(); save(); ui.confirmReset = false; ui.sheet = null; render(); toast('All data deleted'); break;
    }
  }
  function onChange(e) {
    var b = e.target, a = b.dataset.act; if (!a) return; var id = b.dataset.id;
    if (a === 'set') { var l = logW(id), i = +b.dataset.i; while (l.sets.length <= i) l.sets.push({}); l.sets[i][b.dataset.f] = b.value === '' ? '' : +b.value; save(); render(); }
    else if (a === 'lnote') { logW(id).note = b.value; save(); }
    else if (a === 'link') { var v = b.value.trim(); if (v && !/^https?:\/\//i.test(v)) { toast('Use a link that starts with https://'); return; } if (v) st.links[id] = v; else delete st.links[id]; save(); render(); toast(v ? 'Video saved' : 'Back to the search'); }
    else if (a === 'snote') { var d = dayW(ui.date); d.sessions[ui.sid] = d.sessions[ui.sid] || {}; d.sessions[ui.sid].note = b.value; save(); }
    else if (a === 'prog') { ui.prog = b.value; render(); }
    else if (a === 'ciHrIn') { ui.ci.hr = +b.value || ui.ci.hr; }
    else if (a === 'hrmaxIn') { var h = +b.value; if (h >= 140 && h <= 220) { st.settings.hrmax = h; save(); render(); } else toast('Enter 140 to 220'); }
    else if (a === 'impFile') { var f = b.files && b.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { importText(r.result); }; r.readAsText(f); }
  }
  [view, sheetEl].forEach(function (el) { el.addEventListener('click', onClick); el.addEventListener('change', onChange); });

  function exportData() {
    var txt = JSON.stringify(st, null, 1), name = 'kobe-backup-' + TODAY + '.json';
    try { var file = new File([txt], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; } } catch (e) {}
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e2) { ui.showJson = true; renderSheet(); }
  }
  function importText(t) {
    try {
      var s = JSON.parse(t); if (!s || s.v !== 1 || !s.days) throw 0;
      s.links = s.links || {}; s.settings = Object.assign({ hrmax: 187, theme: 'auto', voice: true }, s.settings || {}); s.ladder = s.ladder || { cur: Object.assign({}, P.ladderStart), hist: [] }; s.ladder.pass = s.ladder.pass || {};
      st = s; save(); ui.sheet = null; render(); toast('Backup imported');
    } catch (e) { toast('That is not a backup file from this app.'); }
  }

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    ui.tab = b.dataset.tab; ui.sid = null; ui.sheet = null; if (ui.tab === 'journal') { ui.week = mondayOf(ui.date); ui.month = ui.date.slice(0, 7); ui.jday = ui.date; } render(); window.scrollTo(0, 0);
  });
  document.querySelectorAll('#tabs button').forEach(function (b) { b.insertAdjacentHTML('afterbegin', ic(b.dataset.icon)); });

  // A new day while the app stays open: move Today forward. Otherwise only refresh the theme (never re-render under your fingers).
  setInterval(function () { var t = iso(new Date()); if (t !== TODAY) { if (ui.date === TODAY) ui.date = t; TODAY = t; if (tEl.hidden && !ui.sheet && !ui.sid) render(); } else applyTheme(); }, 60000);
  if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  render();
})();
