/* Let's be Kobe · app 0.7.0. Vanilla JS, offline, all data on this phone.
   Data format v:1 (see CLAUDE.md). */
(function () {
  'use strict';
  var P = window.PLAN;
  var KEY = 'coach.v1';
  var VERSION = '0.7.0';

  /* ---------- storage ---------- */
  function fresh() { return { v: 1, settings: { hrmax: 187, theme: 'auto', voice: true }, days: {}, links: {}, ladder: { cur: Object.assign({}, P.ladderStart), hist: [], pass: {} } }; }
  // Fill any missing part of v:1 data. Used by load() and importText(), so old backups always open.
  function norm(s) {
    s.settings = Object.assign({ hrmax: 187, theme: 'auto', voice: true }, s.settings || {});
    s.days = s.days && typeof s.days === 'object' ? s.days : {};
    s.links = s.links || {};
    s.ladder = s.ladder || {};
    s.ladder.cur = Object.assign({}, P.ladderStart, s.ladder.cur || {});
    s.ladder.hist = s.ladder.hist || [];
    s.ladder.pass = s.ladder.pass || {};
    return s;
  }
  // Never replace saved data with a fresh state without a copy. If the saved text cannot be read, keep it under KEY + '.unreadable'.
  var loadWarn = false;
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return fresh(); }
    if (!raw) return fresh();
    try { var s = JSON.parse(raw); if (s && s.v === 1) return norm(s); } catch (e) {}
    try { localStorage.setItem(KEY + '.unreadable', raw); } catch (e) {}
    loadWarn = true;
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
    chev: '<path d="M10 6l6 6-6 6"/>',
    swap: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'
  };
  function ic(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t, ms) { var el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.remove(); }, ms || 2200); }

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
    // A message can carry steps (third item): they show as a list, one instruction per line.
    if (ph.pre) out.push(['', 'Before Block ' + P.phases[0].n + ' starts', ['Do the baseline tests.', 'Do the Morning module.', 'Do the Night module.']]);
    if (!ph.pre && !ph.post && ph.week % 4 === 0) out.push(['warn', 'Deload and retest week. Cut volume by about 40%. Keep the intensity.']);
    var avg = hrAvg(ds), easier = false;
    if (d.hr && avg && d.hr - avg >= 7) { easier = true; out.push(['stop', 'Resting HR is ' + Math.round(d.hr - avg) + ' bpm above your average. Make today one level easier.']); }
    if (d.sleep && +d.sleep < 6) { easier = true; out.push(['stop', 'Under 6 hours of sleep. Make today one level easier.']); }
    if (easier) out.push(['warn', 'Make today one level easier', ['A hard session: RPE 6, with plyos and intervals halved.', 'Or Field A at Zone 2.', 'A moderate session becomes Recovery.']]);
    var prev = middleOf(addDays(ds, -1));
    if (today.indexOf('gymA') >= 0 && prev.indexOf('fieldB') >= 0) out.push(['warn', 'Field B was yesterday. Keep 48 hours before Gym A, or swap today.']);
    if (today.indexOf('fieldB') >= 0 && prev.indexOf('gymA') >= 0) out.push(['warn', 'Gym A was yesterday. Keep 48 hours before Field B, or swap today.']);
    if (today.some(function (s) { return rank(s) >= 3; })) {
      var streak = 0;
      for (var i = 1; i <= 3; i++) { if (middleOf(addDays(ds, -i)).some(function (s) { return rank(s) >= 3; })) streak++; else break; }
      if (streak >= 2) out.push(['warn', streak + ' hard days in a row. Make today light or moderate.']);
    }
    // One warning per exercise: the most recent day in the last 8 with pain above 3/10.
    var painSeen = {};
    for (var k = 0; k <= 7; k++) {
      var pds = addDays(ds, -k), dd = st.days[pds]; if (!dd || !dd.logs) continue;
      Object.keys(dd.logs).forEach(function (id) { var l = dd.logs[id]; if (painSeen[id] || !ITEM[id] || !l || l.pain === '' || l.pain == null || +l.pain <= 3) return; painSeen[id] = true; out.push(['stop', 'Pain ' + l.pain + '/10 on ' + getItem(id).name + ' (' + nice(pds) + '). Lower the load on it next time.']); });
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
  // Season block: a pill (block number and name), the week, and a bar with one segment per week.
  // Done weeks are solid, this week has an outline, later weeks are an empty track: shape carries the meaning, not color.
  // Date line: weekday in the accent, date in grey, small tracked capitals (an eyebrow, like a magazine dateline).
  // On another day the title is already the weekday, so the dateline says how far that day is from today.
  function dateLine(ds) {
    var d = parse(ds), n = diffDays(TODAY, ds);
    var w = n === 0 ? DOWL[d.getDay()] : n === -1 ? 'Yesterday' : n === 1 ? 'Tomorrow' : n < 0 ? -n + ' days ago' : 'In ' + n + ' days';
    return '<div class="dateline"><span class="dw">' + w + '</span><span class="dm">' + d.getDate() + ' ' + MONL[d.getMonth()] + '</span></div>';
  }
  function msgHtml(m) { return (m[2] ? '<b class="mt">' + esc(m[1]) + '</b><ul class="cb">' + m[2].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : esc(m[1])); }
  function blockEl(ds) {
    var ph = phaseOf(ds), p = ph.p, weeks = Math.ceil((diffDays(p.start, p.end) + 1) / 7), bars = '';
    var right = ph.pre ? (diffDays(ds, p.start) === 1 ? 'Starts tomorrow' : 'Starts ' + nice(p.start)) : ph.post ? 'Season complete' : 'Week ' + ph.week + ' of ' + weeks;
    for (var i = 1; i <= weeks; i++) bars += '<i class="' + (ph.post || (!ph.pre && i < ph.week) ? 'done' : !ph.pre && i === ph.week ? 'now' : '') + '"></i>';
    return '<div class="block"><div class="top"><span class="bpill"><b>Block ' + p.n + '</b>· ' + esc(p.name) + '</span><span class="bweek">' + right + '</span></div>' +
      '<div class="bbar" aria-hidden="true">' + bars + '</div></div>';
  }
  function vToday() {
    var ds = ui.date, d = dayR(ds), ph = phaseOf(ds), isT = ds === TODAY, hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    var h = '<div class="topbar"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Previous day">' + ic('back') + '</button>' +
      (isT ? '<span></span>' : '<button class="btn ghost" data-act="goToday">Back to today</button>') +
      '<button class="iconbtn" data-act="day" data-n="1" aria-label="Next day">' + ic('fwd') + '</button></div>' +
      dateLine(ds) + '<h1 class="large">' + (isT ? greet : DOWL[parse(ds).getDay()]) + '</h1>' + blockEl(ds) + weekStrip(ds);

    h += '<div class="stack" style="margin-top:14px">';
    if (d.hr || d.sleep) h += '<button class="li card" data-act="checkin" style="box-shadow:var(--shadow)">' + ic('leaf') + '<div class="sp"><div class="t1">' + [d.sleep ? d.sleep + ' h sleep' : '', d.hr ? d.hr + ' bpm resting' : ''].filter(Boolean).join(' · ') + '</div><div class="t2">Check-in done</div></div>' + ic('chev', 'sm') + '</button>';
    else h += '<button class="li card" data-act="checkin">' + ic('leaf') + '<div class="sp"><div class="t1">Morning check-in</div><div class="t2">Sleep and resting heart rate · 2 taps</div></div>' + ic('chev', 'sm') + '</button>';
    var msgs = coachMsgs(ds);
    if (msgs.length) { var m = msgs[0]; h += '<button class="note coachline ' + (m[0] === 'stop' || m[0] === 'miss' ? 'clay' : '') + '" data-act="coach">' + '<span class="sp">' + msgHtml(m) + (msgs.length > 1 ? '<span class="more">' + (msgs.length - 1) + ' more from your coach ›</span>' : '') + '</span></button>'; }

    var order = ['morning'].concat(planned(ds), ['night']), next = order.filter(function (s) { return !sessDone(ds, s); })[0];
    h += '</div>';
    // Up next: label outside the card. Inside: module + flow tag, title, purpose, then 3 values with labels.
    if (next) {
      var s = P.sessions[next], pr = sessionProgress(next, ds), tt = splitName(s.name);
      var kick = next === 'morning' ? 'Morning' : next === 'night' ? 'Night' : 'Main session';
      h += '<div class="sec">' + (pr.n ? 'Continue' : 'Up next') + '</div><div class="hero">' +
        '<div class="kick">' + kick + (next === 'morning' ? '<span class="tagp">Flow ' + flowOf(ds) + '</span>' : '') + '</div>' +
        '<div class="n">' + esc(tt[0]) + '</div>' + (tt[1] ? '<div class="s2">' + esc(tt[1]) + '</div>' : '') +
        '<div class="stats"><div><b class="num">' + s.mins + ' min</b><span>Time</span></div><div><b>' + dots(s.load) + '</b><span>Load</span></div>' +
        '<div><b class="num">' + (pr.n ? pr.n + ' of ' + pr.total : pr.total) + '</b><span>' + (pr.n ? 'Exercises done' : 'Exercises') + '</span></div></div>' +
        '<button class="btn pri big" data-act="play" data-sid="' + next + '">' + ic('play') + (pr.n ? 'Continue' : 'Start') + '</button>' +
        '<button class="btn ghost full" style="margin-top:4px" data-act="open" data-sid="' + next + '">See the exercises</button></div>';
    } else h += '<div class="sec">Today</div><div class="hero"><div class="n">All done.</div><div class="s2">Quality work. Recover well tonight.</div></div>';

    h += '<div class="sec">Today’s plan</div><div class="list">';
    order.forEach(function (sid) {
      var s = P.sessions[sid], pr = sessionProgress(sid, ds), done = sessDone(ds, sid), tt = splitName(s.name);
      var lab = sid === 'morning' ? 'Morning' : sid === 'night' ? 'Night' : 'Main session';
      h += '<button class="li" data-act="open" data-sid="' + sid + '"><span class="check ' + (done ? 'on' : '') + '">' + (done ? ic('check', 'sm') : '') + '</span><div class="sp"><div class="t1">' + esc(tt[0]) + '</div><div class="t2">' + lab + ' · ' + s.mins + ' min · ' + (pr.n && !done ? pr.n + '/' + pr.total + ' done' : LOAD[s.load][0]) + '</div></div>' + ic('chev', 'sm') + '</button>';
    });
    h += '<button class="li" data-act="change"><span class="ic">' + ic('swap') + '</span><div class="sp"><div class="t1">Change the main session</div><div class="t2">Travel day, or an easier day</div></div>' + ic('chev', 'sm') + '</button></div>';
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
    var pn = phaseOf(ds).p.n, parts = partsOf(it, pn, true);
    // With steps, each step has its own Watch. The whole-exercise Watch shows only for a saved link.
    h += '<div class="row" style="margin-top:16px">' + (!parts || link ? '<a class="btn sp" href="' + esc(link || ytUrl(q)) + '" target="_blank" rel="noopener">' + ic('watch') + 'Watch</a>' : '') +
      '<button class="btn pri sp" data-act="startHere" data-id="' + id + '">' + ic('play', 'sm') + 'Start here</button></div>';
    // Your own video link lives with Watch, the thing it changes.
    h += '<details class="vlink"><summary>' + (link ? 'Your video is saved · change' : 'Use your own video link') + '</summary><input type="url" inputmode="url" data-act="link" data-id="' + id + '" value="' + esc(link || '') + '" placeholder="https://… YouTube or Instagram" style="margin-top:8px"><p class="cap">When saved, Watch opens your link. Clear it to go back to the search.</p></details>';
    if (parts) {
      h += '<div class="lbl" style="margin-top:18px">Steps · the player runs them in order</div><div class="list">' + parts.map(function (p, i) {
        var off = p.from != null && pn < p.from, pq = encodeURIComponent((p.q || p.n.replace(/\(.*?\)/g, '') + ' exercise form').trim());
        return '<div class="li step' + (off ? ' muted' : '') + '"><span class="cap num" style="width:20px;align-self:flex-start;padding-top:2px">' + (i + 1) + '</span><div class="sp"><div class="t1">' + esc(p.n) + '</div><div class="t2 num">' + esc(dur(p)) + (off ? ' · from Block ' + p.from : '') + '</div>' +
          (p.d ? '<div class="cap" style="margin-top:2px">' + esc(p.d) + '</div>' : '') + '</div><a class="iconbtn" href="' + esc(ytUrl(pq)) + '" target="_blank" rel="noopener" aria-label="Watch ' + esc(p.n) + '">' + ic('watch') + '</a></div>';
      }).join('') + '</div>';
    }
    if (it.m && it.m.length) h += '<div class="lbl" style="margin-top:18px">Feel it in</div><div class="chips">' + it.m.map(function (m) { return '<span class="chip static">' + (MN[m] || m) + '</span>'; }).join('') + '</div>';
    if (it.lad) {
      var nx = st.ladder.cur[it.lad] < 20 ? P.ladder[it.lad].steps[st.ladder.cur[it.lad]] : 'top of the track';
      h += '<div class="note" style="margin-top:16px">Next step: ' + esc(nx) + '. ' + (it.light ? 'Recovery day: practise only.' : 'Test when fresh. Two passes on different days move you up.') + '</div>';
      if (!it.light) h += '<button class="btn full" style="margin-top:10px" data-act="lpass" data-k="' + it.lad + '">' + ic('check', 'sm') + 'Passed the test today · ' + passCount(it.lad) + '/2</button>';
    }
    if (it.ladRef) { var rc = st.ladder.cur[it.ladRef]; h += '<div class="note" style="margin-top:16px">Ladder ' + P.ladder[it.ladRef].name + ', step ' + rc + ': ' + esc(P.ladder[it.ladRef].steps[rc - 1]) + '. Keep these sets far from failure.</div>'; }

    h += '<div class="lbl" style="margin-top:22px">Log</div>';
    if (lite) {
      var dn = !!(d.done && d.done[id]), feel = l && l.feel;
      h += '<button class="btn ' + (dn ? '' : 'pri') + ' full" data-act="ldone" data-id="' + id + '">' + (dn ? ic('check', 'sm') + 'Done · tap to undo' : 'Mark done') + '</button>' +
        '<div class="lbl" style="margin-top:16px">How it felt</div><div class="chips">' + ['Easy', 'Good', 'Tight', 'Pain'].map(function (f) { return '<button class="chip ' + (feel === f ? 'on' : '') + '" data-act="feel" data-id="' + id + '" data-v="' + f + '">' + f + '</button>'; }).join('') + '</div>';
      if (feel === 'Pain') h += '<div class="lbl" style="margin-top:14px">Pain, 0 to 10</div>' + chipRow(id, 'pain', l && l.pain, 0, 10);
    } else {
      // With steps: one row per set of each step, under the step name. Rows are numbered inside each step.
      var flat = parts ? flatParts(parts) : null;
      var last = lastLog(id, ds), sets = (l && l.sets) || [], rows = Math.max(sets.length, flat ? flat.length : Math.min(it.sets || 1, 8));
      if (last) h += '<div class="cap" style="margin-bottom:10px">Last time, ' + nice(last.ds) + ': ' + esc(summ(last.l)) + '</div>';
      for (var i = 0; i < rows; i++) {
        var x = sets[i] || {}, pl = (last && last.l.sets && last.l.sets[i]) || {}, f = flat && flat[i];
        if (f && f.k === 1) h += '<div class="cap" style="margin:' + (i ? 14 : 0) + 'px 0 6px;font-weight:600">' + esc(f.p.n) + ' · ' + esc(dur(f.p)) + '</div>';
        var timed = f ? !!f.p.s : it.k !== 'reps';
        h += '<div class="setline"><span class="cap num">' + (f ? f.k : i + 1) + '</span>' +
          (!timed ? stepper(id, i, 'r', x.r, pl.r || (f ? f.p.r : it.reps), 'reps') + stepper(id, i, 'l', x.l, pl.l || '', 'kg')
            : stepper(id, i, 't', x.t, pl.t || (f ? f.p.s : it.s), 'seconds') + stepper(id, i, 'l', x.l, pl.l || '', 'kg')) + '</div>';
      }
      h += '<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="addSet" data-id="' + id + '">+ Add a set</button><span class="sp"></span><button class="btn" data-act="quick" data-id="' + id + '">' + ic('check', 'sm') + 'Done as planned</button></div>';
      h += '<div class="lbl" style="margin-top:16px">Effort (RPE)</div>' + chipRow(id, 'rpe', l && l.rpe, 1, 10);
      h += '<div class="lbl" style="margin-top:14px">Pain, 0 to 10</div>' + chipRow(id, 'pain', l && l.pain, 0, 10);
    }
    if (l && l.pain !== '' && l.pain != null && +l.pain > 3) h += '<div class="note clay" style="margin-top:12px">Pain above 3/10. Stop or lower the load now. Next time, start lighter (rule 2).</div>';
    h += '<div class="lbl" style="margin-top:16px">Note</div><textarea data-act="lnote" data-id="' + id + '" placeholder="Form, side differences, how it felt">' + esc(l && l.note || '') + '</textarea>';
    // Why card: category pill, the benefit as one sentence, the coach's reason in full, and a fact grid. Nothing folded.
    var b = benefit(it), lead = b[1] ? b[1].charAt(0).toUpperCase() + b[1].slice(1) : '';
    var facts = [['Plane', it.pl], ['Joint', it.j], ['Type', it.c]].filter(function (f) { return f[1] && f[1] !== 'n/a'; });
    h += '<div class="sec">Why this exercise</div><div class="card why">' + (b[0] ? '<span class="bpill">' + esc(b[0]) + '</span>' : '') +
      (lead ? '<div class="b">' + esc(lead) + '</div>' : '') + '<p class="w"' + (lead || b[0] ? '' : ' style="margin-top:0"') + '>' + esc(it.why) + '</p>' +
      (facts.length ? '<div class="facts" style="grid-template-columns:repeat(' + facts.length + ',1fr)">' + facts.map(function (f) { return '<div><span>' + f[0] + '</span><b>' + esc(f[1]) + '</b></div>'; }).join('') + '</div>' : '') + '</div>';
    return h;
  }
  function ytUrl(q) { return 'https://www.youtube.com/results?search_query=' + q + '+shorts'; }
  function dur(p) {
    var s = p.s, t = !s ? String(p.x || p.r || '') : s < 60 ? s + ' s' : Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '');
    return p.sets > 1 ? p.sets + ' × ' + t : t;
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
      msgs.map(function (m) { return '<div class="note ' + (m[0] === 'stop' || m[0] === 'miss' ? 'clay' : '') + '">' + msgHtml(m) + '</div>'; }).join('') + '</div>' +
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
  /* Day pie: one slice per module, clockwise from the top: Morning, the main session(s), Night.
     Read by texture, never by color alone: solid = done, diagonal lines = missed, pale = to do. */
  function modules(ds) { return ['morning'].concat(planned(ds), ['night']); }
  function modStates(ds) {
    return modules(ds).map(function (s) { return sessDone(ds, s) ? 'pd' : ds < TODAY && ds >= P.phases[0].start ? 'pm' : 'pt'; });
  }
  function pieSvg(states, size) {
    var n = states.length, s = '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '" class="pie" aria-hidden="true">';
    function pt(a) { var r = a * Math.PI / 180; return (20 + 19 * Math.cos(r)).toFixed(2) + ' ' + (20 + 19 * Math.sin(r)).toFixed(2); }
    states.forEach(function (c, i) {
      var a = -90 + i * 360 / n, b = a + 360 / n;
      s += '<path class="' + c + '" d="M20 20 L' + pt(a) + ' A19 19 0 0 1 ' + pt(b) + ' Z"/>';
    });
    return s + '</svg>';
  }
  function dayPie(ds, size) { return pieSvg(modStates(ds), size); }
  function daySummary(ds) {
    var st2 = modStates(ds), done = st2.filter(function (x) { return x === 'pd'; }).length, miss = st2.filter(function (x) { return x === 'pm'; }).length;
    return done + ' of ' + st2.length + ' done' + (miss ? ', ' + miss + ' missed' : '');
  }
  function pieLegend() {
    function sw(c, t) { return '<span class="row cap" style="gap:6px"><svg width="14" height="14" class="pie" aria-hidden="true"><rect class="' + c + '" x="1" y="1" width="12" height="12" rx="3"/></svg>' + t + '</span>'; }
    return '<div class="legend card"><div class="row" style="align-items:center;gap:14px">' + pieSvg(['pd', 'pm', 'pt'], 56) +
      '<div class="sp cap"><div>One slice per module, clockwise from the top:</div><div style="margin-top:2px"><b>Morning</b> · <b>Main session</b> · <b>Night</b></div></div></div>' +
      '<div class="row" style="gap:16px;margin-top:12px;flex-wrap:wrap">' + sw('pd', 'Solid = done') + sw('pm', 'Lines = missed') + sw('pt', 'Pale = to do') + '</div></div>';
  }
  // One day in the journal: a quiet line of facts, and problems apart. A problem always has a symbol and a word.
  function dayInfo(ds) {
    var d = dayR(ds), all = ['morning'].concat(planned(ds), ['night']), n = all.filter(function (s) { return sessDone(ds, s); }).length, line = [], probs = [];
    var miss = all.filter(function (s) { return !sessDone(ds, s); });
    if (n) line.push(n === all.length ? 'All ' + n + ' done' : n + ' of ' + all.length + ' done');
    if (ds < TODAY && ds >= P.phases[0].start && miss.length) probs.push(['×', 'Missed: ' + miss.map(function (s) { return s === 'morning' ? 'Morning' : s === 'night' ? 'Night' : sName(s); }).join(', ')]);
    var feel = null; all.forEach(function (s) { if (d.sessions[s] && d.sessions[s].feel && s !== 'morning' && s !== 'night') feel = d.sessions[s].feel; });
    if (feel) line.push('Felt ' + feel.toLowerCase());
    if (d.sleep) line.push(d.sleep + ' h sleep');
    if (d.hr) line.push(d.hr + ' bpm');
    var pain = null; Object.keys(d.logs || {}).forEach(function (id) { var l = d.logs[id]; if (l && l.pain !== '' && l.pain != null && +l.pain > 0 && (!pain || +l.pain > pain[0]) && ITEM[id]) pain = [+l.pain, getItem(id).name]; });
    if (pain) { if (pain[0] > 3) probs.push(['!', 'Pain ' + pain[0] + '/10 · ' + pain[1]]); else line.push('Pain ' + pain[0] + '/10'); }
    (st.ladder.log || []).filter(function (x) { return x.d === ds; }).forEach(function (x) { line.push('▲ ' + P.ladder[x.k].name + (x.up ? ' step ' + x.s : ' test passed')); });
    return { line: line, probs: probs };
  }
  function probHtml(p) { return '<div class="dp">' + p.map(function (x) { return '<span><b aria-hidden="true">' + x[0] + '</b>' + esc(x[1]) + '</span>'; }).join('') + '</div>'; }
  // Your words for the day: session notes (from the session page or the end of the player).
  // With no session note, the first exercise note, with the exercise name under it.
  function dayQuotes(ds) {
    var d = dayR(ds), out = [];
    modules(ds).forEach(function (s) { if (d.sessions[s] && d.sessions[s].note) out.push({ t: d.sessions[s].note, by: sName(s) }); });
    if (!out.length) Object.keys(d.logs || {}).some(function (id) { var l = d.logs[id]; if (l && l.note && ITEM[id]) { out.push({ t: l.note, by: getItem(id).name }); return true; } return false; });
    return out;
  }
  // Diary day: date (accent) with a Today tag, title (ink), one quiet line (grey), the day pie on the right,
  // problems apart (symbol + word), and your own words in quotes. Tap the card to open the day.
  function dayCard(ds) {
    var mids = planned(ds), inf = dayInfo(ds), q = dayQuotes(ds);
    var line = ds > TODAY ? 'Planned' : inf.line.length ? inf.line.join(' · ') : 'Nothing logged yet';
    return '<button class="card dcard" data-act="pick" data-ds="' + ds + '" aria-label="Open ' + longDate(ds) + ': ' + daySummary(ds) + '">' +
      '<div class="dh"><div class="sp"><div class="ddate">' + nice(ds) + (ds === TODAY ? '<span class="tagp now">Today</span>' : '') + '</div>' +
      '<div class="dt">' + esc(mids.map(sName).join(' + ')) + '</div><div class="dl">' + esc(line) + '</div></div>' + dayPie(ds, 36) + '</div>' +
      (inf.probs.length ? probHtml(inf.probs) : '') +
      q.map(function (x) { return '<blockquote class="quote">“' + esc(x.t) + '”<cite>' + esc(x.by) + '</cite></blockquote>'; }).join('') + '</button>';
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
        h += '<button class="mday' + (dt.getMonth() !== m ? ' out' : '') + (ds === TODAY ? ' today' : '') + (ds === ui.jday ? ' sel' : '') + '" data-act="jday" data-ds="' + ds + '" aria-label="' + longDate(ds) + ': ' + daySummary(ds) + '"><span class="num">' + dt.getDate() + '</span>' + dayPie(ds, 34) + '</button>';
      }
      h += '</div>';
      if (ui.jday) h += dayCard(ui.jday);
      h += pieLegend();
    } else {
      var mon = ui.week, sun = addDays(mon, 6), done = 0, tot = 0, missN = 0, sl = [];
      h += '<div class="topbar" style="margin-top:10px"><button class="iconbtn" data-act="wk" data-n="-7" aria-label="Previous week">' + ic('back') + '</button><div class="title" style="font-size:18px">' + parse(mon).getDate() + ' ' + MON[parse(mon).getMonth()] + ' – ' + parse(sun).getDate() + ' ' + MON[parse(sun).getMonth()] + '</div><button class="iconbtn" data-act="wk" data-n="7" aria-label="Next week">' + ic('fwd') + '</button></div>';
      var cards = '';
      for (var j = 6; j >= 0; j--) {
        var x = addDays(mon, j); if (x > TODAY) continue;
        var all = ['morning'].concat(planned(x), ['night']); tot += all.length; done += all.filter(function (s) { return sessDone(x, s); }).length;
        if (x < TODAY && x >= P.phases[0].start) missN += all.filter(function (s) { return !sessDone(x, s); }).length;
        if (dayR(x).sleep) sl.push(+dayR(x).sleep);
        cards += '<div class="tl-i' + (x === TODAY ? ' now' : '') + '">' + dayCard(x) + '</div>';
      }
      // Week summary: the same quiet line as a day, with missed sessions apart.
      var sum = [done + ' of ' + tot + ' done'];
      if (sl.length) sum.push('avg ' + (Math.round(sl.reduce(function (a, b) { return a + b; }, 0) / sl.length * 10) / 10) + ' h sleep');
      h += tot ? '<div class="wsum" style="margin:0 2px 4px">' + esc(sum.join(' · ')) + (missN ? probHtml([['×', missN + ' missed']]) : '') + '</div><div class="tl">' + cards + '</div>' : '<p class="cap">Nothing yet this week. Days appear here as you live them.</p>';
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
    return [['First session', total >= 1], ['A full day', full], ['Seven days moving', best >= 7], ['10 sessions', total >= 10], ['50 sessions', total >= 50], ['100 sessions', total >= 100], ['First ladder step', steps >= 1], ['5 ladder steps', steps >= 5], ['Block ' + P.phases[0].n + ' complete', TODAY > P.phases[0].end && total >= 20]];
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
    g.font = '12px ' + cssv('--font'); g.fillStyle = mut;
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
    // Philosophy as a creed: principle 1 is the statement on the accent color; principles 2 onward each get a large
    // number, the claim in bold, and the reason under it. The text is the coach's; only the layout splits it at the first "." or ":".
    function claim(p) { var m = p.match(/^(.+?)[.:]\s+(.+)$/); return m ? [m[1] + (p.charAt(m[1].length) === '.' ? '.' : ''), m[2].charAt(0).toUpperCase() + m[2].slice(1)] : [p, '']; }
    var c0 = claim(P.philosophy[0]);
    h += '<div class="sec">Philosophy</div><div class="creed"><div class="qm" aria-hidden="true">“</div><div class="ck">The creed</div>' +
      '<div class="c1">' + esc(c0[0]) + '</div>' + (c0[1] ? '<div class="c2">' + esc(c0[1]) + '</div>' : '') + '</div>' +
      '<div class="card principles">' + P.philosophy.slice(1).map(function (p, i) { var c = claim(p); return '<div class="pr"><div class="pn num">' + pad(i + 2) + '</div><div><div class="pl">' + esc(c[0]) + '</div>' + (c[1] ? '<div class="pb">' + esc(c[1]) + '</div>' : '') + '</div></div>'; }).join('') + '</div>';
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
    if (T.quiet || !st.settings.voice || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1; speechSynthesis.speak(u); } catch (e) {}
  }
  function spoken(s) { s = Math.round(s); if (s < 60) return s + ' seconds'; var m = Math.floor(s / 60), r = s % 60; return m + (m === 1 ? ' minute' : ' minutes') + (r ? ' ' + r + ' seconds' : ''); }
  function speakText(t) { return t.replace(/\(.*?\)/g, '').replace(/(\d)\s*s\b/g, '$1 seconds').replace(/(\d)\s*m\b/g, '$1 metres').replace(/\s*[·:]\s*/g, ', ').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim(); }
  function speakName(it) { return speakText(it.name); }
  // A soft two-note chime between steps of one exercise. The full alarm is for the end of a work or rest period.
  function chime() { tone(988, .12, .5); tone(1318, .18, .5, .14); }
  function lock() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () {}); } catch (e) {} }
  function unlock() { try { if (wl) wl.release(); } catch (e) {} wl = null; }
  // Back from the background: keep the screen on and catch the timer up at once (iOS stops timers while the app is hidden).
  document.addEventListener('visibilitychange', function () { if (!tEl.hidden && document.visibilityState === 'visible') { lock(); if (T.iv) tick(); } });

  // Steps inside one exercise: the tennis drills (from P.drills) or an item's own `parts`. Each step gets its own
  // timer, voice cue, and video search. withOff keeps the steps of later blocks (the sheet shows them muted).
  function partsOf(it, pn, withOff) {
    var list = it.k === 'drills' ? P.drills.map(function (x) { return { n: x.n, s: it.ds || 60, d: x.d, q: x.q, from: x.from }; }) : it.parts;
    if (!list) return null;
    return withOff ? list : list.filter(function (p) { return p.from == null || pn >= p.from; });
  }
  // A part with `s` runs on a timer (word "Hold"). A part with `r` (reps) or `x` (text such as '20 m') waits for a tap (word "Set").
  // `set` is the row in the log: one row per set of every part, in order.
  function flatParts(parts) {
    var out = [];
    parts.forEach(function (p) { var n = p.sets || 1; for (var k = 0; k < n; k++) out.push({ p: p, k: k + 1, of: n }); });
    return out;
  }
  function partSegs(it, parts) {
    var segs = [], gi = 0;
    parts.forEach(function (p, j) {
      var n = p.sets || 1, pt = (j + 1) + ' of ' + parts.length, word = p.s ? 'Hold' : 'Set';
      for (var k = 0; k < n; k++) {
        var setOf = n > 1 ? (k + 1) + ' of ' + n : '', last = k === n - 1, nextP = last ? parts[j + 1] : p;
        segs.push({ label: k ? word + ' ' + setOf : p.n + (setOf ? ' · ' + setOf : ''), secs: p.s || null, work: true, set: gi++, word: word, r: p.r, x: p.x, pn: p.n, pt: pt, setOf: setOf, k0: !k, dd: p.d || '', drill: it.k === 'drills' });
        if (p.rest && nextP) segs.push({ label: 'Rest', secs: p.rest, work: false, pn: nextP.n, newPart: last });
      }
    });
    return segs;
  }
  function buildSegs(it, lite, hasNext) {
    var segs = [], n = it.sets || 1, rest = it.rest || 0;
    if (lite && rest > 10) rest = 10;
    var parts = partsOf(it, phaseOf(T.ds || ui.date).p.n);
    if (parts) segs = partSegs(it, parts);
    else for (var i = 0; i < n; i++) {
      var of = n > 1 ? ' ' + (i + 1) + ' of ' + n : '';
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
    T.sid = sid; T.q = q; T.ds = ui.date; T.finished = false; T.t0 = Date.now(); T.sfeel = ''; T.snote = null;
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
    T.vals = { r: cur.r || ls.r || s.r || T.item.reps || 0, l: cur.l || ls.l || 0 };
  }
  function announce(first) {
    var s = T.segs[T.i], it = T.item; if (!s) return;
    var nextIt = T.q[T.qi + 1] ? getItem(T.q[T.qi + 1]) : null;
    if (s.pn && s.work) {
      var amt = s.secs ? spoken(s.secs) : s.x ? speakText(s.x.replace(/\s*\/\s*/g, ' per ')) : s.r ? s.r + ' reps' : '';
      say((first ? speakName(it) + '. ' : '') + (s.k0 ? speakText(s.pn) + '. ' : s.word + ' ' + s.setOf + '. ') + (amt ? amt + '.' : ''));
    }
    else if (s.pn) say(s.newPart ? 'Rest. Next: ' + speakText(s.pn) + '.' : 'Rest. ' + spoken(s.secs) + '.');
    else if (s.trans) say('Rest. Next: ' + speakName(nextIt) + '.');
    else if (!s.work) say('Rest. ' + spoken(s.secs) + '.');
    else if (first) say(speakName(it) + '. ' + (s.secs ? spoken(s.secs) : it.reps ? it.reps + ' reps' : '') + '.');
    else say(s.label + '.' + (s.secs ? ' ' + spoken(s.secs) + '.' : it.reps && !T.lite ? ' ' + it.reps + ' reps.' : ''));
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
        '<div class="lbl">How did it feel?</div><div class="chips" style="justify-content:center">' + ['Easy', 'Good', 'Hard', 'Too hard'].map(function (f) { return '<button class="chip ' + (T.sfeel === f ? 'on' : '') + '" data-t="sfeel" data-v="' + f + '">' + f + '</button>'; }).join('') + '</div>' +
        // One line in your own words. It shows in the Journal, in quotes.
        '<div class="lbl" style="margin-top:18px;text-align:left">One line about today (optional)</div><input type="text" id="tNote" maxlength="140" value="' + esc(T.snote != null ? T.snote : ((dayR(T.ds).sessions[T.sid] || {}).note || '')) + '" placeholder="A thought to keep" style="text-align:left"></div>' +
        '<button class="btn pri big" data-t="finish">Finish</button><button class="btn ghost full" style="margin-top:6px" data-t="prevEx">Back to the last exercise</button>';
      return;
    }
    var manual = s.secs == null, nextIt = T.q[T.qi + 1] ? getItem(T.q[T.qi + 1]) : null;
    var title = s.trans ? 'Next: ' + nextIt.name : it.name, sub = s.trans ? nextIt.dose : (it.track ? it.track + ' · ' : '') + it.dose;
    var lab = s.trans ? 'Rest' : s.label, lab2 = manual ? (T.lite ? 'Tap Done when finished' : 'Tap Set done when finished') : s.trans ? 'Breathe. Get ready.' : !s.work ? 'Breathe out slowly' : '';
    // A step inside the exercise: its name is the title, the exercise name sits under it.
    if (s.pn) {
      title = s.newPart ? 'Next: ' + s.pn : s.pn; sub = s.dd || it.name;
      if (s.work) { lab = s.setOf ? s.word + ' ' + s.setOf : (s.drill ? 'Drill ' : 'Step ') + s.pt; if (!manual) lab2 = s.setOf ? 'Step ' + s.pt : ''; }
      if (s.work && manual) sub = [s.x || (s.r ? s.r + ' reps' : ''), it.name].filter(Boolean).join(' · ');
    }
    lab += T.run || s.trans ? '' : ' · paused';
    var after = s.trans ? '' : T.segs[T.i + 1] && !T.segs[T.i + 1].trans ? 'Then ' + (T.segs[T.i + 1].k0 ? T.segs[T.i + 1].label : T.segs[T.i + 1].label.toLowerCase()) +(T.segs[T.i + 1].secs ? ' · ' + fmt(T.segs[T.i + 1].secs) : '') : nextIt ? 'Next exercise · ' + nextIt.name : 'Last exercise';
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
  // Wall-clock time: on iOS, performance.now() can stop while the phone sleeps, Date.now() does not.
  function tick() {
    var now = Date.now(), dt = Math.max(0, (now - T.last) / 1000); T.last = now;
    var s = T.segs[T.i]; if (!s) return;
    if (s.secs == null) { T.up += dt; var e0 = document.getElementById('tTime'); if (e0) e0.textContent = fmt(T.up); return; }
    var before = Math.ceil(T.left); T.left -= dt; var after = Math.ceil(T.left);
    if (T.left > 0) {
      if (dt < 1.5 && after !== before && after <= 3) tick3();
      var e = document.getElementById('tTime'); if (e) e.textContent = fmt(T.left);
      var r = document.getElementById('ringFg'); if (r) r.setAttribute('stroke-dashoffset', ringOffset());
      return;
    }
    catchUp(-T.left);
  }
  // The segment ended. If the app was asleep, more time may have passed: move through every timed
  // segment that ended in that time. Stop at a set the user must tap (reps), or at the end of the session.
  // Only one alarm and one voice cue play, for the segment you arrive at.
  function catchUp(over) {
    var startQi = T.qi;
    T.quiet = true;
    for (var guard = 0; guard < 500; guard++) {
      nextSeg();
      if (T.finished) break;
      var c = T.segs[T.i];
      if (!c || c.secs == null) break;
      if (over < c.secs) { T.left = c.secs - over; break; }
      over -= c.secs;
    }
    T.quiet = false;
    var cur = T.segs[T.i];
    // Chime only inside a flow item. In a strength item the end of a rest stays the full alarm (the phone may be on the floor).
    if (!T.finished && T.qi === startQi && cur && cur.pn && T.lite) chime(); else alarm();
    if (T.finished) { say('Session complete. Good work.'); return; }
    drawTimer(); announce(T.i === 0);
  }
  function startTick() { if (T.iv) return; T.last = Date.now(); T.iv = setInterval(tick, 200); T.run = true; lock(); }
  function stopTick() { clearInterval(T.iv); T.iv = null; T.run = false; }
  function markDone(id) { var d = dayW(T.ds); d.done = d.done || {}; d.done[id] = true; save(); }
  function finishSession() { stopTick(); unlock(); T.finished = true; drawTimer(); say('Session complete. Good work.'); }
  function nextSeg() {
    T.i++;
    if (!T.segs.slice(T.i).some(function (x) { return x.work; })) markDone(T.item.id);
    var s = T.segs[T.i];
    if (!s) { if (T.qi < T.q.length - 1) loadEx(T.qi + 1); else finishSession(); return; }
    T.left = s.secs || 0; T.up = 0; T.last = Date.now(); initVals();
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
      if (a === 'finish') {
        var d = dayW(T.ds), tn = document.getElementById('tNote'); d.sessions[T.sid] = d.sessions[T.sid] || {}; d.sessions[T.sid].done = true; if (T.sfeel) d.sessions[T.sid].feel = T.sfeel;
        if (tn) { var nv2 = tn.value.trim(); if (nv2) d.sessions[T.sid].note = nv2; else delete d.sessions[T.sid].note; }
        T.snote = null; save(); toast('Session done. Well done.');
      }
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
  tEl.addEventListener('input', function (e) { if (e.target.id === 'tNote') T.snote = e.target.value; });
  tEl.addEventListener('change', function (e) { if (!T.vals) return; if (e.target.id === 'tR') T.vals.r = +e.target.value || 0; if (e.target.id === 'tL') T.vals.l = +e.target.value || 0; });

  /* ---------- events (main view and sheet) ---------- */
  function logW(id) { var d = dayW(ui.date); d.logs[id] = d.logs[id] || { sets: [] }; d.logs[id].sets = d.logs[id].sets || []; var gi = getItem(id); if (gi.step) d.logs[id].step = gi.step; return d.logs[id]; }
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.dataset.act;
    if ((b.tagName === 'INPUT' || b.tagName === 'TEXTAREA' || b.tagName === 'SELECT')) return;
    var id = b.dataset.id;
    switch (a) {
      case 'open': ui.sid = b.dataset.sid; render(); window.scrollTo(0, 0); break;
      case 'play': ui.sid = b.dataset.sid; render(); openPlayer(b.dataset.sid); break;
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
        var qp = partsOf(iq, phaseOf(ui.date).p.n);
        if (!(lq.sets || []).some(function (x) { return x && (x.r || x.l || x.t); })) {
          lq.sets = [];
          if (qp) flatParts(qp).forEach(function (f) { lq.sets.push(f.p.s ? { t: f.p.s } : { r: f.p.r || '' }); });
          else for (var k = 0; k < (iq.sets || 1); k++) lq.sets.push(iq.k === 'reps' ? { r: iq.reps || '' } : { t: iq.s || '' });
        }
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
      st = norm(s); save(); ui.sheet = null; render(); toast('Backup imported');
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
  if (loadWarn) toast('Saved data could not be read. A copy is kept. Import your last backup in Settings.', 6000);
})();
