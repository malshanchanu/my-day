/* My Day — app.js (v3)
   Single-file vanilla JS app. Data lives in localStorage (key `myday:data`, schema unchanged so
   existing installs keep their data). Sections:
   1 utils · 2 store · 3 domain logic · 4 views · 5 sheets & forms · 6 toasts · 7 PIN lock
   8 backup · 9 events · 10 notifications · 11 service worker · 12 boot                      */
(() => {
'use strict';

const BUILD = '20261110g';
// Smart AI assistant is paused. Set to false to bring the chat back (and re-enable the Netlify function).
const AI_COMING_SOON = true;
// Branded preloader flashes briefly on navigation clicks. Set CLICK_PRELOADER to false to turn it off.
const CLICK_PRELOADER = true, CLICK_PRE_MS = 450;
const VERSION = '3.6.0';
const KEY = 'myday:data';
const SCHEMA_VERSION = 1;
const _t  = (k, p) => window.t(k, p);
const _tn = (k, n, p) => window.tn(k, n, p);

/* ═══ 1 · utils ═══════════════════════════════════════════════════════ */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hmOf = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const parse = s => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^\d{2}:\d{2}$/, ID_RE = /^[\w-]{1,40}$/;
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
const ico = (n, c) => `<svg class="i${c ? ' ' + c : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const MON = () => window.L.strings[window.L.lang].months;
const DAY = () => window.L.strings[window.L.lang].days;
const DAYS = () => window.L.strings[window.L.lang].days_s;
const sum  = a => a.reduce((t, x) => t + (+x.amount || 0), 0);
const sumM = a => a.reduce((t, x) => t + (+x.mins || 0), 0);
const money = n => S.settings.cur + ' ' + (() => { const v = Number(n) || 0; return v.toLocaleString('en-US', {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2}); })();
const compact = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + _t('u_mil') : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + _t('u_thou') : String(Math.round(n));
const fmtDate = ms => { const d = new Date(ms); return d.getDate() + ' ' + MON()[d.getMonth()] + ' ' + d.getFullYear(); };
const hm = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60;
  return h ? h + ' ' + _t('u_h') + (r ? ' ' + r + ' ' + _t('u_m') : '') : m + ' ' + _t('u_m'); };
const clock = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };
const monthShift = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return ymd(d).slice(0, 7); };
const daysIn = (y, m0) => new Date(y, m0 + 1, 0).getDate();

/* ═══ 2 · store ═══════════════════════════════════════════════════════ */
const CAT_DEF  = [['food','cat_food','#E8604C','food'],['trans','cat_trans','#3B82C4','bus'],['bill','cat_bill','#D99A12','receipt'],
                  ['learn','cat_learn','#1FA97A','book'],['health','cat_health','#8A5CF6','heart'],['stay','cat_stay','#0E9AB0','bed'],['fun','cat_fun','#F0742E','spark'],['other','cat_other','#6F7F8A','dots']];
const KIND_DEF = [['study','kind_study','cap'],['pay','kind_pay','receipt'],['task','kind_task','task']];
const MEM_KINDS = [['memory','mem_memory'],['experience','mem_experience'],['lesson','mem_lesson']];
const MOODS = ['', '😄', '🙂', '😐', '😔', '😢'];
const REP_IDS  = ['none','daily','weekly','monthly'];
const catOf  = id => { const c = CAT_DEF.find(x => x[0] === id) || CAT_DEF[CAT_DEF.length - 1]; return {id: c[0], name: _t(c[1]), color: c[2], icon: c[3]}; };
const kindOf = id => { const k = KIND_DEF.find(x => x[0] === id) || KIND_DEF[2]; return {id: k[0], name: _t(k[1]), icon: k[2]}; };
const repOpts = () => REP_IDS.map(r => [r, _t('rep_' + r)]);

function defaults() {
  return {budget: 0, cur: 'Rs.', notify: false, lang: 'en', theme: 'auto', updatedAt: 0, lastBackupAt: 0, storePersisted: false, studyGoal: 600, ai: false};
}
function blank() {
  return {version: SCHEMA_VERSION, expenses: [], reminders: [], birthdays: [], study: [], exams: [], todos: [], memories: [], tombstones: [], settings: defaults(), updated: 0};
}

/* Validates & normalises ANY incoming data (localStorage, import, undo) so a bad record can never crash a view. */
function clean(raw) {
  const o = blank();
  if (!raw || typeof raw !== 'object') return o;
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const ts  = v => isFinite(+v) ? +v : 0;
  const seen = new Set();
  const idOf = r => { let id = (typeof r.id === 'string' && ID_RE.test(r.id)) ? r.id : uid(); while (seen.has(id)) id = uid(); seen.add(id); return id; };
  const arr = k => Array.isArray(raw[k]) ? raw[k] : [];
  const ok = r => r && typeof r === 'object';

  arr('expenses').forEach(r => {
    if (!ok(r)) return;
    const amount = Math.round(parseFloat(r.amount) * 100) / 100;
    if (!(amount >= 0) || !DATE_RE.test(r.date)) return;
    const e = {id: idOf(r), amount, cat: CAT_DEF.some(c => c[0] === r.cat) ? r.cat : 'other', note: str(r.note, 200), date: r.date,
               recurring: REP_IDS.includes(r.recurring) ? r.recurring : 'none', updatedAt: ts(r.updatedAt)};
    if (typeof r.recurringParent === 'string' && ID_RE.test(r.recurringParent)) e.recurringParent = r.recurringParent;
    o.expenses.push(e);
  });
  arr('reminders').forEach(r => {
    if (!ok(r)) return;
    const title = str(r.title, 200).trim();
    if (!title || !DATE_RE.test(r.date)) return;
    const x = {id: idOf(r), title, kind: KIND_DEF.some(k => k[0] === r.kind) ? r.kind : 'task', date: r.date, time: TIME_RE.test(r.time) ? r.time : '',
               repeat: REP_IDS.includes(r.repeat) ? r.repeat : 'none', done: !!r.done, lastDone: DATE_RE.test(r.lastDone) ? r.lastDone : '', updatedAt: ts(r.updatedAt)};
    if (ok(r.snooze) && DATE_RE.test(r.snooze.date)) x.snooze = {date: r.snooze.date, time: TIME_RE.test(r.snooze.time) ? r.snooze.time : ''};
    o.reminders.push(x);
  });
  arr('birthdays').forEach(r => {
    if (!ok(r)) return;
    const name = str(r.name, 100).trim();
    if (!name || !DATE_RE.test(r.date)) return;
    o.birthdays.push({id: idOf(r), name, date: r.date, updatedAt: ts(r.updatedAt)});
  });
  arr('study').forEach(r => {
    if (!ok(r)) return;
    const mins = Math.round(+r.mins), subject = str(r.subject, 100).trim();
    if (!(mins > 0) || !subject || !DATE_RE.test(r.date)) return;
    o.study.push({id: idOf(r), subject, mins, note: str(r.note, 200), date: r.date, updatedAt: ts(r.updatedAt)});
  });
  arr('exams').forEach(r => {
    if (!ok(r)) return;
    const title = str(r.title, 200).trim();
    if (!title || !DATE_RE.test(r.date)) return;
    o.exams.push({id: idOf(r), title, subject: str(r.subject, 100), date: r.date, updatedAt: ts(r.updatedAt)});
  });
  arr('todos').forEach(r => {
    if (!ok(r)) return;
    const title = str(r.title, 200).trim();
    if (!title) return;
    o.todos.push({id: idOf(r), title, subject: str(r.subject, 100), done: !!r.done, updatedAt: ts(r.updatedAt)});
  });
  arr('memories').forEach(r => {
    if (!ok(r)) return;
    const title = str(r.title, 120).trim();
    if (!title || !DATE_RE.test(r.date)) return;
    const mood = Math.round(+r.mood);
    o.memories.push({id: idOf(r), title, body: str(r.body, 4000), date: r.date, kind: MEM_KINDS.some(k => k[0] === r.kind) ? r.kind : 'memory',
                     mood: mood >= 1 && mood <= 5 ? mood : 0, fav: !!r.fav, updatedAt: ts(r.updatedAt)});
  });
  arr('tombstones').forEach(r => {
    if (!ok(r) || typeof r.id !== 'string' || !ID_RE.test(r.id)) return;
    const tb = {id: r.id, deletedAt: ts(r.deletedAt)};
    if (typeof r.parent === 'string' && ID_RE.test(r.parent) && DATE_RE.test(r.date)) { tb.parent = r.parent; tb.date = r.date; }
    o.tombstones.push(tb);
  });
  const s = ok(raw.settings) ? raw.settings : {}, d = defaults();
  o.settings = {
    budget: isFinite(+s.budget) && +s.budget >= 0 ? +s.budget : d.budget,
    cur: typeof s.cur === 'string' && s.cur.trim() ? s.cur.slice(0, 6) : d.cur,
    notify: !!s.notify, lang: s.lang === 'si' ? 'si' : 'en', theme: ['light','dark'].includes(s.theme) ? s.theme : 'auto',
    updatedAt: ts(s.updatedAt), lastBackupAt: ts(s.lastBackupAt), storePersisted: !!s.storePersisted,
    studyGoal: isFinite(+s.studyGoal) && +s.studyGoal > 0 ? Math.round(+s.studyGoal) : d.studyGoal,
    ai: !!s.ai
  };
  o.updated = ts(raw.updated);
  return o;
}

function load() {
  const str = lsGet(KEY);
  if (!str) return blank();
  try { return clean(JSON.parse(str)); }
  catch (e) { lsSet(KEY + ':corrupt', str); return blank(); }   // keep the unreadable copy instead of silently destroying it
}

let S = load();
let mq = '', mkind = 'all';
let tab = 'today', lastTab = '', month = ymd(new Date()).slice(0, 7), q = '';
let timerStart = +lsGet('myday:timer') || 0, timerInt = null;
let deferredInstall = null;

/* Second copy of the data in IndexedDB: if localStorage alone gets wiped, the app restores itself from this. */
const idbRun = (mode, fn) => new Promise(res => {
  try {
    const r = indexedDB.open('myday-mirror', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => res(null);
    r.onsuccess = () => {
      try {
        const tx = r.result.transaction('kv', mode), req = fn(tx.objectStore('kv'));
        tx.oncomplete = () => { r.result.close(); res(req ? req.result : true); };
        tx.onerror = tx.onabort = () => res(null);
      } catch (e) { res(null); }
    };
  } catch (e) { res(null); }
});
let mirrorT = 0;
const mirrorSave = () => { clearTimeout(mirrorT); mirrorT = setTimeout(() => idbRun('readwrite', st => st.put(JSON.stringify(S), 'data')), 400); };

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); mirrorSave(); return true; }
  catch (e) {
    let full = false; try { full = e && (e.name === 'QuotaExceededError' || e.code === 22); } catch (x) {}
    toast(_t(full ? 'toast_storage_full' : 'toast_storage_err'), {err: true, ms: 8000});
    return false;
  }
}
function commit() { S.updated = Date.now(); persist(); render(); }

/* Run a mutation, save, re-render, and offer Undo (snapshot-based, so it is always exact). */
function mutate(msgKey, fn) {
  const prev = JSON.stringify(S);
  fn();
  S.updated = Date.now(); persist(); render();
  if (msgKey) toast(_t(msgKey), {undo: () => { S = clean(JSON.parse(prev)); persist(); applyTheme(S.settings.theme); render(); }});
}
const stamp = o => { o.updatedAt = Date.now(); return o; };

/* theme */
function applyTheme(th) {
  if (th !== 'light' && th !== 'dark') th = 'auto';
  const el = document.documentElement;
  if (th === 'auto') delete el.dataset.theme; else el.dataset.theme = th;
  lsSet('myday:theme', th);
  const dark = th === 'dark' || (th === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
  const mc = $('#themeColor'); if (mc) mc.setAttribute('content', dark ? '#0A3D38' : '#0A4F49');
}

/* ═══ 3 · domain logic ════════════════════════════════════════════════ */
function occurs(r, d) {                       // does repeating item r fall on date d?
  if (d < r.date) return false;
  if (r.repeat === 'daily') return true;
  const a = parse(r.date), b = parse(d);
  if (r.repeat === 'weekly') return a.getDay() === b.getDay();
  if (r.repeat === 'monthly') return b.getDate() === Math.min(a.getDate(), daysIn(b.getFullYear(), b.getMonth()));
  return r.date === d;
}
const remTime = r => (r.snooze ? r.snooze.time : r.time) || '';
function remDone(r, t) { return r.repeat === 'none' ? !!r.done : r.lastDone === t; }
function isDue(r, t) {
  if (r.repeat === 'none') return !r.done && r.date <= t;
  if (r.snooze) return r.snooze.date <= t;
  return occurs(r, t) && r.lastDone !== t;
}
function nextDate(r, t) {
  if (r.repeat === 'none') return r.date;
  if (r.snooze) return r.snooze.date;
  let start = r.lastDone === t ? ymd(addDays(parse(t), 1)) : t;
  if (start < r.date) start = r.date;
  for (let i = 0; i < 400; i++) { const d = ymd(addDays(parse(start), i)); if (occurs(r, d)) return d; }
  return r.date;
}
function overdueBy(r, t) {                    // days overdue (0 if not overdue)
  const d = r.repeat === 'none' ? (r.done ? t : r.date) : (r.snooze ? r.snooze.date : t);
  return d < t ? daysBetween(d, t) : 0;
}
function when(d, t) {
  const n = daysBetween(t, d);
  if (n === 0) return _t('when_today');
  if (n === 1) return _t('when_tomorrow');
  return MON()[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8));
}

function upcoming(limit) {
  const now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return S.birthdays.map(b => {
    const p = b.date.split('-'), mon = +p[1] - 1, day = +p[2];
    let n = new Date(t0.getFullYear(), mon, Math.min(day, daysIn(t0.getFullYear(), mon)));
    if (n < t0) n = new Date(t0.getFullYear() + 1, mon, Math.min(day, daysIn(t0.getFullYear() + 1, mon)));
    return {b, days: Math.round((n - t0) / 864e5), age: n.getFullYear() - +p[0], mon, day: n.getDate()};
  }).filter(x => x.days <= limit).sort((a, b) => a.days - b.days);
}

/* Recurring expenses → materialise past occurrences (also back-fills months the app wasn't opened). */
function ensureRecurring() {
  const t = ymd(new Date()), floor = ymd(addDays(new Date(), -400));
  const have = new Set(S.expenses.filter(x => x.recurringParent).map(x => x.recurringParent + '|' + x.date));
  S.tombstones.forEach(tb => { if (tb.parent) have.add(tb.parent + '|' + tb.date); });
  let changed = false;
  S.expenses.filter(x => x.recurring !== 'none' && !x.recurringParent).forEach(tm => {
    const start = tm.date > floor ? tm.date : floor, rule = {date: tm.date, repeat: tm.recurring};
    for (let i = 0; i < 420; i++) {
      const ds = ymd(addDays(parse(start), i));
      if (ds > t) break;
      if (ds <= tm.date || !occurs(rule, ds) || have.has(tm.id + '|' + ds)) continue;
      S.expenses.push({id: uid(), amount: tm.amount, cat: tm.cat, note: tm.note, date: ds, recurring: 'none', recurringParent: tm.id, updatedAt: Date.now()});
      have.add(tm.id + '|' + ds); changed = true;
    }
  });
  if (changed) { S.updated = Date.now(); persist(); }
  return changed;
}

function studyStats() {
  const now = new Date(), t = ymd(now), ws = ymd(addDays(now, -((now.getDay() + 6) % 7)));
  const wk = S.study.filter(x => x.date >= ws && x.date <= t), days = {};
  S.study.forEach(x => days[x.date] = 1);
  let streak = 0, d = days[t] ? now : addDays(now, -1);
  while (days[ymd(d)]) { streak++; d = addDays(d, -1); }
  const goal = +S.settings.studyGoal || 600, wmin = sumM(wk);
  return {t, wk, wmin, today: sumM(S.study.filter(x => x.date === t)), goal, pct: wmin / goal, streak};
}

/* ═══ 4 · views ═══════════════════════════════════════════════════════ */
const empty = (ic, tk, dk, btn) => `<div class="empty"><div class="e-ic">${ico(ic)}</div><b>${_t(tk)}</b><p>${_t(dk)}</p>${btn || ''}</div>`;
const secH = (title, cnt, first) => `<div class="sec-h${first ? ' first' : ''}"><h2>${title}</h2>${cnt ? `<span class="cnt num">${cnt}</span>` : ''}</div>`;
const ringSvg = (pct, label, over) => {
  const C = 2 * Math.PI * 46;
  return `<svg class="ring" viewBox="0 0 110 110" role="img" aria-label="${esc(label)}"><circle class="rt" cx="55" cy="55" r="46"/><circle class="rf${over ? ' over' : ''}" cx="55" cy="55" r="46" stroke-dasharray="${(C * Math.min(pct, 1)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/><text x="55" y="63" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
};

const editBtn = (type, id) => `<button class="ibtn edit" data-act="edit" data-t="${type}" data-id="${esc(id)}" aria-label="${_t('aria_edit')}">${ico('edit', 'sm')}</button>`;

function remRow(r, t) {
  const done = remDone(r, t), tm = remTime(r), late = overdueBy(r, t), nd = nextDate(r, t);
  const meta = [`<span class="tag">${kindOf(r.kind).name}</span>`];
  if (late) meta.push(`<span class="tag late">${late === 1 ? _t('late_1') : _t('late_n', {n: late})}</span>`);
  else if (!done || r.repeat !== 'none') meta.push(`<span>${when(nd, t)}${tm ? ' · ' + tm : ''}</span>`);
  if (r.repeat !== 'none') meta.push(`<span>${ico('repeat', 'sm')} ${_t('rep_' + r.repeat)}</span>`);
  return `<li class="row${done ? ' is-done' : ''}">
    <button class="chk" data-act="done" data-id="${esc(r.id)}" aria-pressed="${done}" aria-label="${_t(done ? 'aria_undone' : 'aria_done')}"><i>${ico('check')}</i></button>
    <button class="row-main" data-act="edit" data-t="rem" data-id="${esc(r.id)}"><span class="row-t"><b>${esc(r.title)}</b><small>${meta.join('')}</small></span></button>
    ${done ? '' : `<button class="ibtn" data-act="snooze" data-id="${esc(r.id)}" aria-label="${_t('aria_snooze')}">${ico('clock')}</button>`}
    ${editBtn('rem', r.id)}
  </li>`;
}

function bdRow(x) {
  const end = x.days === 0 ? `<span class="tag gold">${_t('bday_today')}</span>` : x.days === 1 ? _t('bday_tomorrow') : _tn('bday_days', x.days);
  const nth = x.age > 0 && x.age < 120 ? ' · ' + _t('bday_nth', {n: window.ordinal(x.age)}) : '';
  return `<li class="row"><button class="row-main" data-act="edit" data-t="bday" data-id="${esc(x.b.id)}">
    <span class="badge gold" aria-hidden="true">${esc(([...x.b.name][0] || '?').toUpperCase())}</span>
    <span class="row-t"><b>${esc(x.b.name)}</b><small>${MON()[x.mon]} ${x.day}${nth}</small></span>
    <span class="row-end">${end}</span></button>${editBtn('bday', x.b.id)}</li>`;
}

function examRow(e, t) {
  const n = daysBetween(t, e.date);
  const end = n === 0 ? _t('when_today') : n === 1 ? _t('when_tomorrow') : _t('exam_in', {n});
  return `<li class="row"><button class="row-main" data-act="edit" data-t="exam" data-id="${esc(e.id)}">
    <span class="badge ${n <= 7 ? 'hot' : ''} num" aria-hidden="true">${n}</span>
    <span class="row-t"><b>${esc(e.title)}</b><small>${esc(e.subject)}${e.subject ? ' · ' : ''}${MON()[+e.date.slice(5, 7) - 1]} ${+e.date.slice(8)}</small></span>
    <span class="row-end">${end}</span></button>${editBtn('exam', e.id)}</li>`;
}

function todoRow(x) {
  return `<li class="row${x.done ? ' is-done' : ''}">
    <button class="chk" data-act="todo" data-id="${esc(x.id)}" aria-pressed="${x.done}" aria-label="${_t(x.done ? 'aria_todo_undone' : 'aria_todo_done')}"><i>${ico('check')}</i></button>
    <button class="row-main" data-act="edit" data-t="todo" data-id="${esc(x.id)}"><span class="row-t"><b>${esc(x.title)}</b>${x.subject ? `<small>${esc(x.subject)}</small>` : ''}</span></button>
    ${editBtn('todo', x.id)}
  </li>`;
}

function vToday() {
  const now = new Date(), t = ymd(now), m = t.slice(0, 7);
  const monthExp = S.expenses.filter(x => x.date.slice(0, 7) === m);
  const spent = sum(monthExp), todaySpent = sum(S.expenses.filter(x => x.date === t));
  const bud = +S.settings.budget || 0, pct = bud ? spent / bud : 0, over = bud && spent > bud;
  const dl = daysIn(now.getFullYear(), now.getMonth()) - now.getDate() + 1, left = bud ? (bud - spent) / dl : 0;
  const due = S.reminders.filter(r => isDue(r, t)).sort((a, b) => (remTime(a) || '99').localeCompare(remTime(b) || '99'));
  const overdueN = due.filter(r => overdueBy(r, t)).length;
  const st = studyStats();
  const bd = upcoming(30).slice(0, 4);
  const ex = S.exams.filter(e => e.date >= t && daysBetween(t, e.date) <= 30).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);

  const wk = [6,5,4,3,2,1,0].map(i => { const d = addDays(now, -i); return {v: sum(S.expenses.filter(x => x.date === ymd(d))), d: DAYS()[d.getDay()], full: DAY()[d.getDay()], now: i === 0}; });
  const wmax = Math.max.apply(null, wk.map(w => w.v).concat(1)), wtot = wk.reduce((a, w) => a + w.v, 0);

  const foot = bud
    ? (over ? `<span class="hchip warn">${ico('warn', 'sm')} ${_t('over_bud')} · <b class="num">${money(spent - bud)}</b></span>`
            : `<span class="hchip">${_t('safe_day')} <b class="num">${money(left)}</b></span><span class="hchip">${_tn('days_left', dl)}</span>`)
    : `<button class="hchip cta" data-act="goset">${ico('coin', 'sm')} ${_t('hero_set_budget')}</button>`;

  return `<div class="cols">
  <div class="col-a">
    <section class="hero" aria-label="${_t('hero_month', {mon: MON()[+m.slice(5) - 1]})}">
      <div class="hero-row">
        <div style="min-width:0"><p class="lbl">${_t('hero_month', {mon: MON()[+m.slice(5) - 1]})}</p><p class="big num">${money(spent)}</p><p class="sub num">${_t('hero_today', {amt: money(todaySpent)})}</p></div>
        ${bud ? ringSvg(pct, _t('ring_aria', {p: Math.round(pct * 100)}), over) : ''}
      </div>
      <div class="hero-foot">${foot}</div>
    </section>
    <div class="tiles">
      <button class="tile" data-act="tab" data-tab="study"><span class="t-ic">${ico('cap')}</span><b class="num">${hm(st.today)}</b><span class="l">${_t('stat_study')}</span></button>
      <button class="tile" data-act="tab" data-tab="study"><span class="t-ic gold">${ico('flame')}</span><b class="num">${st.streak}</b><span class="l">${_t('stat_streak')}</span></button>
      <button class="tile" data-act="tab" data-tab="remind"><span class="t-ic ${overdueN ? 'rose' : ''}">${ico('task')}</span><b class="num">${due.length}</b><span class="l">${_t('stat_tasks')}</span></button>
    </div>
    ${secH(_t('h_tasks'), due.length || '')}
    ${due.length ? `<ul class="list">${due.map(r => remRow(r, t)).join('')}</ul>`
      : empty('check', 'empty_today_t', 'empty_today_d', `<button class="btn pri sm" data-act="add" data-t="rem">${ico('plus', 'sm')} ${_t('btn_add_rem')}</button>`)}
  </div>
  <div class="col-b">
    ${secH(_t('h_week'), wtot ? money(wtot) : '')}
    <div class="card"><div class="week" role="img" aria-label="${_t('h_week')}">${wk.map(w => `<div class="col ${w.now ? 'now' : ''}" title="${esc(w.full + ': ' + money(w.v))}"><div class="bw">${w.v ? `<span class="bv num">${compact(w.v)}</span>` : ''}<i class="b" style="height:${Math.max(5, Math.round(w.v / wmax * 78))}px"></i></div><span>${w.d}</span></div>`).join('')}</div></div>
    ${ex.length ? secH(_t('h_exams')) + `<ul class="list">${ex.map(e => examRow(e, t)).join('')}</ul>` : ''}
    ${secH(_t('h_bdays'))}
    ${bd.length ? `<ul class="list">${bd.map(bdRow).join('')}</ul>` : `<div class="empty slim">${_t('empty_bdays_soon')}</div>`}
  </div></div>`;
}

function expRow(x) {
  const c = catOf(x.cat);
  const rec = (x.recurring !== 'none' || x.recurringParent) ? `<span class="tag">${ico('repeat', 'sm')} ${_t('recurring_tag')}</span>` : '';
  return `<li class="row"><button class="row-main" data-act="edit" data-t="exp" data-id="${esc(x.id)}">
    <span class="cat-ic big" style="background:${c.color}" aria-hidden="true">${ico(c.icon)}</span>
    <span class="row-t"><b>${esc(x.note || c.name)}</b><small>${x.note ? `<span>${c.name}</span>` : ''}${rec}</small></span>
    <span class="row-end num">${money(x.amount)}</span></button>${editBtn('exp', x.id)}</li>`;
}

function spendListHTML() {
  const t = ymd(new Date()), yest = ymd(addDays(new Date(), -1)), needle = q.trim().toLowerCase();
  let list = S.expenses.filter(x => x.date.slice(0, 7) === month);
  const monthCount = list.length;
  if (needle) list = list.filter(x => (x.note || '').toLowerCase().includes(needle) || catOf(x.cat).name.toLowerCase().includes(needle));
  if (!list.length) return needle ? `<div class="empty slim">${esc(_t('search_none', {q: q.trim()}))}</div>`
    : (monthCount ? '' : empty('wallet', 'empty_spend_t', 'empty_spend_d', `<button class="btn pri sm" data-act="add" data-t="exp">${ico('plus', 'sm')} ${_t('btn_add_exp')}</button>`));
  const groups = {};
  list.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt).forEach(x => (groups[x.date] = groups[x.date] || []).push(x));
  return Object.keys(groups).map(d => {
    const p = parse(d), lb = d === t ? _t('when_today') : d === yest ? _t('yesterday') : DAY()[p.getDay()] + ', ' + MON()[p.getMonth()] + ' ' + p.getDate();
    return `<div class="day"><span>${lb}</span><b class="num">${money(sum(groups[d]))} <button class="chip-btn" data-act="addon" data-date="${d}" aria-label="${_t('add_exp')}">+</button></b></div><ul class="list">${groups[d].map(expRow).join('')}</ul>`;
  }).join('');
}

function vSpend() {
  const now = new Date(), cur = ymd(now).slice(0, 7);
  const list = S.expenses.filter(x => x.date.slice(0, 7) === month), total = sum(list);
  const by = {}; list.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
  const prevTotal = sum(S.expenses.filter(x => x.date.slice(0, 7) === monthShift(month, -1))), diff = total - prevTotal;
  const elapsed = month === cur ? now.getDate() : month < cur ? daysIn(+month.slice(0, 4), +month.slice(5) - 1) : 1;
  const cats = Object.keys(by).sort((a, b) => by[b] - by[a]);
  const top = cats[0] ? catOf(cats[0]).name : '–';
  const vs = prevTotal ? (diff >= 0 ? _t('sp_vs_up', {amt: money(Math.abs(diff))}) : _t('sp_vs_down', {amt: money(Math.abs(diff))})) : '';
  return `<div class="cols eq"><div class="col-a">
    <div class="mbar"><button class="iconbtn" data-act="mo" data-n="-1" aria-label="${_t('prev_mon')}">${ico('chev-l')}</button><b>${month.slice(0, 4)} ${MON()[+month.slice(5) - 1]}</b><button class="iconbtn" data-act="mo" data-n="1" aria-label="${_t('next_mon')}">${ico('chev-r')}</button></div>
    <div class="rep-row"><button class="btn sm" data-act="report">${ico('download', 'sm')} ${_t('rep_btn')}</button></div>
    <section class="hero"><p class="lbl">${_t('sp_total')}</p><p class="big num">${money(total)}</p>${vs ? `<p class="sub">${diff >= 0 ? '▲' : '▼'} ${esc(vs)}</p>` : ''}
      <div class="stat3"><div><small>${_t('sp_avg')}</small><b class="num">${money(total / elapsed)}</b></div><div><small>${_t('sp_count')}</small><b class="num">${list.length}</b></div><div><small>${_t('sp_top')}</small><b>${esc(top)}</b></div></div></section>
    ${cats.length ? secH(_t('h_by_cat')) + `<div class="card">${cats.map(id => { const c = catOf(id);
      return `<div class="bar"><div class="bar-top"><span class="nm"><span class="cat-ic" style="background:${c.color}">${ico(c.icon)}</span><span>${c.name}</span></span><b class="num">${money(by[id])}</b><em class="num">${Math.round(by[id] / total * 100)}%</em></div><div class="trk"><i style="width:${(by[id] / total * 100).toFixed(1)}%;background:${c.color}"></i></div></div>`; }).join('')}</div>` : ''}
  </div><div class="col-b">
    <div class="search">${ico('search')}<input id="spendSearch" type="search" enterkeyhint="search" placeholder="${esc(_t('search_ph'))}" value="${esc(q)}" aria-label="${esc(_t('search_ph'))}" maxlength="80" autocomplete="off"><button class="clr" id="spendClr" data-act="clrsearch" aria-label="${_t('search_clear')}" ${q ? '' : 'hidden'}>${ico('x', 'sm')}</button></div>
    <div id="spendList">${spendListHTML()}</div>
  </div></div>`;
}

function vStudy() {
  const st = studyStats(), t = st.t;
  const by = {}; st.wk.forEach(x => by[x.subject] = (by[x.subject] || 0) + x.mins);
  const subs = Object.keys(by).sort((a, b) => by[b] - by[a]), top = by[subs[0]] || 1;
  const ex = S.exams.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  const recent = S.study.slice().sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt).slice(0, 8);
  const todos = S.todos.filter(x => !x.done).concat(S.todos.filter(x => x.done)), todoDone = S.todos.filter(x => x.done).length;
  const todoSec = secH(_t('h_todos'), S.todos.length ? S.todos.length - todoDone + '/' + S.todos.length : '')
    + (todos.length ? `<ul class="list">${todos.map(todoRow).join('')}</ul>` : empty('check', 'todo_empty_t', 'todo_empty_d'))
    + `<div class="todo-acts"><button class="btn sm" data-act="add" data-t="todo">${ico('plus', 'sm')} ${_t('todo_add')}</button>${todoDone ? `<button class="link" data-act="todoclear">${_t('todo_clear')}</button>` : ''}</div>`;
  const running = !!timerStart;
  const timerCard = `<div class="card timer${running ? ' run' : ''}"><div><small>${running ? '<span class="pulse"></span>' + _t('st_timer_run') : _t('st_timer')}</small><span class="tv num" id="tmr" role="timer">${running ? clock(Math.floor((Date.now() - timerStart) / 1000)) : '00:00'}</span></div>
    <div class="timer-acts"><button class="btn pri" data-act="timer">${ico(running ? 'stop' : 'play', 'sm')} ${_t(running ? 'st_stop' : 'st_start')}</button>${running ? `<button class="link" data-act="timerdiscard">${_t('st_discard')}</button>` : ''}</div></div>`;
  return `<div class="cols"><div class="col-a">
    <section class="hero"><div class="hero-row"><div style="min-width:0"><p class="lbl">${_t('st_week')}</p><p class="big num">${hm(st.wmin)}</p><p class="sub">${_t('st_today', {v: hm(st.today)})}</p></div>
      <button class="ringbtn" data-act="goal" aria-label="${_t('st_goal')}">${ringSvg(st.pct, _t('goal_aria', {p: Math.round(st.pct * 100)}), false)}</button></div>
      <div class="hero-foot"><span class="hchip">${ico('flame', 'sm')} ${_tn('st_streak', st.streak)}</span><button class="hchip" data-act="goal">${ico('target', 'sm')} ${_t('st_goal')}: <b class="num">${hm(st.goal)}</b></button></div></section>
    ${timerCard}
    ${subs.length ? secH(_t('h_subjects')) + `<div class="card">${subs.map((s, i) => `<div class="bar"><div class="bar-top"><span class="nm"><span class="dot" style="background:hsl(${(i * 47 + 165) % 360} 52% 46%)"></span><span>${esc(s)}</span></span><b class="num">${hm(by[s])}</b></div><div class="trk"><i style="width:${(by[s] / top * 100).toFixed(1)}%;background:hsl(${(i * 47 + 165) % 360} 52% 46%)"></i></div></div>`).join('')}</div>` : ''}
  </div><div class="col-b">
    ${todoSec}
    ${secH(_t('h_exams'), ex.length || '')}
    ${ex.length ? `<ul class="list">${ex.map(e => examRow(e, t)).join('')}</ul>` : empty('calendar', 'st_no_exam_t', 'st_no_exam_d', `<button class="btn sm" data-act="add" data-t="exam">${ico('plus', 'sm')} ${_t('add_exam')}</button>`)}
    ${secH(_t('h_recent'))}
    ${recent.length ? `<ul class="list">${recent.map(x => `<li class="row"><button class="row-main" data-act="edit" data-t="study" data-id="${esc(x.id)}"><span class="badge" aria-hidden="true">${ico('book')}</span><span class="row-t"><b>${esc(x.subject)}</b><small>${MON()[+x.date.slice(5, 7) - 1]} ${+x.date.slice(8)}${x.note ? ' · ' + esc(x.note) : ''}</small></span><span class="row-end num">${hm(x.mins)}</span></button>${editBtn('study', x.id)}</li>`).join('')}</ul>`
      : empty('cap', 'st_empty_t', 'st_empty_d')}
  </div></div>`;
}

function vRemind() {
  const t = ymd(new Date());
  if (!S.reminders.length) return empty('bell', 'empty_rem_t', 'empty_rem_d', `<button class="btn pri" data-act="add" data-t="rem">${ico('plus', 'sm')} ${_t('btn_add_rem')}</button>`);
  const g = {over: [], today: [], soon: [], done: []};
  S.reminders.forEach(r => {
    const nd = nextDate(r, t), item = {r, nd, k: nd + (remTime(r) || '99:99')};
    if (r.repeat === 'none' && r.done) g.done.push(item);
    else if (overdueBy(r, t)) g.over.push(item);
    else if (isDue(r, t) || (r.repeat !== 'none' && r.lastDone === t)) g.today.push(item);
    else g.soon.push(item);
  });
  const sec = (title, items, first) => items.length ? secH(title, items.length, first) + `<ul class="list">${items.sort((a, b) => a.k.localeCompare(b.k)).map(i => remRow(i.r, t)).join('')}</ul>` : '';
  let first = true; const out = [];
  [['h_overdue', g.over], ['h_today', g.today], ['h_upcoming', g.soon], ['h_done', g.done]].forEach(([k, items]) => { if (items.length) { out.push(sec(_t(k), items, first)); first = false; } });
  return out.join('');
}

function vBday() {
  const l = upcoming(366);
  if (!l.length) return empty('gift', 'empty_bday_t', 'empty_bday_d', `<button class="btn pri" data-act="add" data-t="bday">${ico('plus', 'sm')} ${_t('btn_add_bday')}</button>`);
  const soon = l.filter(x => x.days <= 30), later = l.filter(x => x.days > 30);
  return (soon.length ? secH(_t('h_bdays'), soon.length, true) + `<ul class="list">${soon.map(bdRow).join('')}</ul>` : '')
       + (later.length ? secH(_t('h_later'), later.length, !soon.length) + `<ul class="list">${later.map(bdRow).join('')}</ul>` : '');
}

function memListHTML() {
  const needle = mq.trim().toLowerCase();
  const all = S.memories;
  const l = all.filter(m => (mkind === 'all' || (mkind === 'fav' ? m.fav : m.kind === mkind)) && (!needle || (m.title + ' ' + m.body).toLowerCase().includes(needle)));
  if (!l.length) return all.length ? `<div class="empty slim">${_t('mem_none')}</div>`
    : empty('spark', 'empty_mem_t', 'empty_mem_d', `<button class="btn pri" data-act="add" data-t="mem">${ico('plus', 'sm')} ${_t('btn_add_mem')}</button>`);
  l.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  const groups = {}; l.forEach(m => (groups[m.date.slice(0, 7)] = groups[m.date.slice(0, 7)] || []).push(m));
  return Object.keys(groups).map(k => `<div class="day"><span>${k.slice(0, 4)} ${MON()[+k.slice(5) - 1]}</span><b class="num">${groups[k].length}</b></div><ul class="list">${groups[k].map(m => `<li class="row">
    <button class="row-main" data-act="edit" data-t="mem" data-id="${esc(m.id)}"><span class="badge gold" aria-hidden="true">${m.mood ? `<span class="emo">${MOODS[m.mood]}</span>` : ico('spark')}</span>
    <span class="row-t"><b>${esc(m.title)}</b>${m.body ? `<small class="memtxt">${esc(m.body)}</small>` : ''}<small><span class="tag gold">${_t('mem_' + m.kind)}</span><span>${+m.date.slice(8)} ${MON()[+m.date.slice(5, 7) - 1]}</span></small></span></button>
 ${editBtn('mem', m.id)}
    <button class="ibtn star${m.fav ? ' on' : ''}" data-act="memfav" data-id="${esc(m.id)}" aria-pressed="${!!m.fav}" aria-label="${_t('aria_fav')}">${ico('star')}</button></li>`).join('')}</ul>`).join('');
}
function vMem() {
  const chips = [['all', _t('mem_all')], ['fav', _t('mem_fav')]].concat(MEM_KINDS.map(k => [k[0], _t(k[1])]));
  return `<div class="search">${ico('search')}<input id="memSearch" type="search" placeholder="${esc(_t('mem_search'))}" value="${esc(mq)}" aria-label="${esc(_t('mem_search'))}" maxlength="80" autocomplete="off"></div>
    <div class="fchips" role="group">${chips.map(c => `<button class="chip-btn${mkind === c[0] ? ' on' : ''}" data-act="memkind" data-k="${c[0]}" aria-pressed="${mkind === c[0]}">${c[1]}</button>`).join('')}</div>
    <div id="memList">${memListHTML()}</div>`;
}

function fmtBytes(n) { return n < 1024 ? n + ' ' + _t('u_b') : n < 1048576 ? (n / 1024).toFixed(1) + ' ' + _t('u_kb') : (n / 1048576).toFixed(1) + ' ' + _t('u_mb'); }
const seg = (name, opts, val, dataset) => `<div class="seg" role="radiogroup">${opts.map(([v, l, ic]) => `<label><input type="radio" name="s_${name}" value="${v}" data-set="${dataset}" ${v === val ? 'checked' : ''}><span class="sg">${ic ? ico(ic, 'sm') : ''}${l}</span></label>`).join('')}</div>`;

function vSet() {
  const st = S.settings, hasPin = !!lsGet(PIN_KEY);
  const lastBk = st.lastBackupAt ? fmtDate(st.lastBackupAt) : _t('backup_never');
  const row = (ic, title, desc, act, cls) => `<button class="setrow ${cls || ''}" data-act="${act}"><span class="si">${ico(ic)}</span><span class="st"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</span></button>`;
  const denied = 'Notification' in window && Notification.permission === 'denied';
  return `<div class="cols eq"><div class="col-a">
  <div class="setgrp" style="margin-top:0"><h2>${_t('s_general')}</h2><div class="setcard">
    <label class="setrow stack1"><span class="srh"><span class="si">${ico('coin')}</span><span class="st"><b>${_t('set_budget')}</b></span></span><input class="inp num" type="number" min="0" step="any" inputmode="decimal" value="${st.budget || ''}" placeholder="0" data-set="budget"></label>
    <label class="setrow stack1"><span class="srh"><span class="si">${ico('receipt')}</span><span class="st"><b>${_t('set_cur')}</b></span></span><input class="inp" value="${esc(st.cur)}" maxlength="6" data-set="cur"></label>
    <div class="setrow stack1"><span class="srh"><span class="si">${ico('globe')}</span><span class="st"><b>${_t('set_lang')}</b></span></span>${seg('lang', [['si', 'සිංහල'], ['en', 'English']], st.lang, 'lang')}</div>
    <div class="setrow stack1"><span class="srh"><span class="si">${ico('sun')}</span><span class="st"><b>${_t('set_theme')}</b></span></span>${seg('theme', [['auto', _t('theme_auto'), 'auto'], ['light', _t('theme_light'), 'sun'], ['dark', _t('theme_dark'), 'moon']], st.theme, 'theme')}</div>
  </div></div>
  <div class="setgrp"><h2>${_t('s_notif')}</h2><div class="setcard">
    <div class="setrow"><span class="si">${ico('bellon')}</span><span class="st"><b>${_t('set_notif')}</b><small>${_t('set_notif_d')}</small></span><button class="switch" role="switch" aria-checked="${!!st.notify}" data-act="notif" aria-label="${_t('set_notif')}"></button></div>
    ${denied ? `<div class="setnote">${_t('toast_notif_denied')}</div>` : ''}
    ${st.notify && !denied ? row('bell', _t('notif_test'), '', 'testnotif') : ''}
    <div class="setnote">${_t('notif_limit')}${IS_IOS && !IS_STANDALONE ? ' ' + _t('notif_ios') : ''}</div>
  </div></div>
  ${AI_COMING_SOON ? '' : `  <div class="setgrp"><h2>${_t('s_ai')}</h2><div class="setcard">
    <div class="setrow"><span class="si">${ico('chat')}</span><span class="st"><b>${_t('set_ai')}</b><small>${_t('set_ai_d')}</small></span><button class="switch" role="switch" aria-checked="${!!st.ai}" data-act="aitoggle" aria-label="${_t('set_ai')}"></button></div>
    ${st.ai ? `<label class="setrow stack1"><span class="srh"><span class="si">${ico('lock')}</span><span class="st"><b>${_t('set_ai_code')}</b></span></span><input class="inp" type="password" autocomplete="off" maxlength="60" value="${esc(lsGet(AI_CODE) || '')}" data-set="aicode"></label>` : ''}
  </div></div>`}
  <div class="setgrp"><h2>${_t('s_security')}</h2><div class="setcard">
    ${row('lock', hasPin ? _t('pin_lock_on') : _t('pin_lock'), _t('pin_lock_d'), 'pinset')}
    ${hasPin ? row('x', _t('btn_pin_remove'), '', 'pinremove') : ''}
  </div></div>
  </div><div class="col-b">
  <div class="setgrp"><h2>${_t('s_data')}</h2><div class="setcard">
    ${row('download', _t('btn_export'), _t('set_backup_last', {d: lastBk}), 'export')}
    ${row('upload', _t('btn_import'), '', 'import')}
    <div class="setnote">${_t('set_data_d')}<br><span id="storageInfo"></span></div>
  </div></div>
  ${deferredInstall ? `<div class="setgrp"><h2>${_t('s_app')}</h2><div class="setcard">${row('phone', _t('btn_install'), _t('set_install_d'), 'install')}</div></div>` : ''}
  <div class="setgrp"><h2>${_t('s_danger')}</h2><div class="setcard">${row('trash', _t('btn_clear_data'), _t('set_clear_d'), 'cleardata', 'danger')}</div></div>
  <p class="mut num" style="text-align:center;font-size:12px;margin-top:22px">${_t('app_name')} · ${_t('set_version', {v: VERSION})}</p>
  <p class="mut powered">Powered By Chanuka Malshan</p>
  </div></div>`;
}

function loadStorageInfo() {
  const el = $('#storageInfo'); if (!el) return;
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { if (el.isConnected) el.textContent = _t('set_storage', {used: fmtBytes(e.usage || 0), quota: fmtBytes(e.quota || 0)}); }).catch(() => {});
}

const VIEWS = {today: vToday, spend: vSpend, study: vStudy, remind: vRemind, bday: vBday, mem: vMem, chat: vChat, set: vSet};
const SUBS  = {remind: 'sub_remind', bday: 'sub_bday', mem: 'sub_mem', chat: 'sub_chat', set: 'sub_set'};
const MORE_TABS = ['bday', 'mem', 'chat', 'set'];

function render() {
  const now = new Date(), h = now.getHours();
  const greet = h < 5 ? 'greet_night' : h < 12 ? 'greet_morn' : h < 17 ? 'greet_day' : h < 21 ? 'greet_eve' : 'greet_night';
  const dateStr = DAY()[now.getDay()] + ', ' + MON()[now.getMonth()] + ' ' + now.getDate();
  document.documentElement.dataset.tab = tab;
  document.title = _t('app_name');
  $('#hi').textContent = tab === 'today' ? _t(greet) : _t('title_' + tab);
  $('#dt').textContent = SUBS[tab] ? _t(SUBS[tab]) : dateStr;

  $$('[data-i18n]').forEach(el => { el.textContent = _t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', _t(el.dataset.i18nAria)); });
  $$('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', _t(el.dataset.i18nPh)); });
  $$('#nav [data-tab]').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const mb = $('#moreBtn'); if (mb) { if (['bday', 'mem', 'set'].includes(tab)) mb.setAttribute('aria-current', 'page'); else mb.removeAttribute('aria-current'); }
  $('#aiBtn').classList.toggle('on', tab === 'chat');
  $('#composer').hidden = tab !== 'chat' || AI_COMING_SOON;

  const v = $('#view');
  const lastTabBefore = lastTab;
  v.innerHTML = VIEWS[tab]();
  if (tab !== lastTab) { v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); lastTab = tab; }

  const ban = $('#backupBanner'), total = S.expenses.length + S.reminders.length + S.birthdays.length + S.study.length + S.memories.length;
  const needBk = tab === 'today' && total >= 3 && (!S.settings.lastBackupAt || (Date.now() - S.settings.lastBackupAt) / 864e5 > 7);
  ban.hidden = !needBk;
  if (needBk) ban.innerHTML = `<span>${_t('backup_banner')}</span><button class="chip-btn" data-act="export">${_t('btn_backup_now')}</button>`;

  if (tab === 'set') setTimeout(loadStorageInfo, 0);
  if (tab === 'chat') chatAfterRender(tab !== lastTabBefore);
  if (timerStart) startTick();
}
window.renderApp = render;

/* live study timer (updates only the #tmr node — no re-render) */
function tickTimer() { const el = $('#tmr'); if (el && timerStart) el.textContent = clock(Math.floor((Date.now() - timerStart) / 1000)); }
function startTick() { clearInterval(timerInt); timerInt = setInterval(tickTimer, 1000); tickTimer(); }

/* ═══ 4b · assistant chat ═════════════════════════════════════════════
   On-device engine (assistant.js) answers from the user's data. If "Smart AI" is enabled in Settings,
   questions go to the Netlify function /.netlify/functions/chat instead (falls back to on-device on any failure). */
const CHAT_KEY = 'myday:chat', AI_CODE = 'myday:aicode', AI_DISMISS = 'myday:ai:no';
let chat = (() => {
  try {
    const a = JSON.parse(lsGet(CHAT_KEY));
    return Array.isArray(a) ? a.filter(m => m && (m.r === 'u' || m.r === 'a') && typeof m.t === 'string').slice(-40)
      .map(m => ({r: m.r, t: m.t.slice(0, 4000), a: m.a && m.a.type === 'exp' && m.a.d && typeof m.a.d === 'object' ? {type: 'exp', d: m.a.d, done: !!m.a.done} : null})) : [];
  } catch (e) { return []; }
})();
let chatBusy = false, aiDown = false;
const chatSave = () => lsSet(CHAT_KEY, JSON.stringify(chat.slice(-40)));
const fmtMsg = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

function aiEnv() {
  const t = ymd(new Date()), st = studyStats(), by = {};
  st.wk.forEach(x => by[x.subject] = (by[x.subject] || 0) + x.mins);
  return {
    lang: window.L.lang, today: t, S, money, hm, catName: id => catOf(id).name,
    due: S.reminders.filter(r => isDue(r, t)).sort((a, b) => (remTime(a) || '99').localeCompare(remTime(b) || '99')).map(r => ({title: r.title, time: remTime(r), late: overdueBy(r, t) > 0})),
    bdays: upcoming(60).map(x => ({name: x.b.name, days: x.days, age: x.age})),
    exams: S.exams.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(e => ({title: e.title, subject: e.subject, days: daysBetween(t, e.date)})),
    study: {today: st.today, wmin: st.wmin, goal: st.goal, streak: st.streak, subjects: Object.keys(by).sort((a, b) => by[b] - by[a]).map(k => [k, by[k]])}
  };
}

function chatMsgHTML(m, i) {
  if (m.r === 'u') return `<div class="msg me"><div class="bub">${esc(m.t).replace(/\n/g, '<br>')}</div></div>`;
  const act = m.a ? (m.a.done ? `<span class="tag ok">${ico('check', 'sm')} ${_t('chat_saved')}</span>` : `<button class="btn pri sm" data-act="chatadd" data-i="${i}">${ico('check', 'sm')} ${_t('chat_save')}</button>`) : '';
  return `<div class="msg bot"><span class="av">${ico('chat', 'sm')}</span><div class="bub">${fmtMsg(m.t)}${act ? `<div class="bub-act">${act}</div>` : ''}</div></div>`;
}

function vChat() {
  if (AI_COMING_SOON) return `<div class="chat"><div class="chat-hero"><span class="ch-ic">${ico('chat', 'lg')}</span><h2>${_t('cs_t')}</h2><p>${_t('cs_d')}</p></div></div>`;
  const aiOn = S.settings.ai && !aiDown;
  const bar = `<div class="chat-bar"><span class="mode${aiOn ? ' ai' : ''}">${ico(aiOn ? 'spark' : 'phone', 'sm')} ${_t(aiOn ? 'chat_mode_ai' : 'chat_mode_local')}</span>${chat.length ? `<button class="chip-btn" data-act="chatclear">${ico('trash', 'sm')} ${_t('chat_clear')}</button>` : ''}</div>`;
  const sugg = [1, 2, 3, 4, 5, 6].map(i => `<button class="chip-btn" data-act="chatq" data-q="${esc(_t('chat_q' + i))}">${_t('chat_q' + i)}</button>`).join('');
  const welcome = `<div class="chat-hero"><span class="ch-ic">${ico('chat', 'lg')}</span><h2>${_t('chat_welcome_t')}</h2><p>${_t('chat_welcome_d')}</p></div>
    ${!S.settings.ai && !lsGet(AI_DISMISS) ? `<div class="aicard"><b>${ico('spark', 'sm')} ${_t('chat_ai_t')}</b><p>${_t('chat_ai_d')}</p><div class="aic-acts"><button class="btn pri sm" data-act="aienable">${_t('chat_ai_on')}</button><button class="btn ghostb sm" data-act="ailater">${_t('chat_ai_later')}</button></div></div>` : ''}
    <div class="sugg">${sugg}</div>`;
  const typing = chatBusy ? `<div class="msg bot"><span class="av">${ico('chat', 'sm')}</span><div class="bub typing" role="status" aria-label="${_t('chat_thinking')}"><i></i><i></i><i></i></div></div>` : '';
  return `${bar}<div class="chat" id="chatLog" role="log" aria-live="polite">${chat.length ? chat.map(chatMsgHTML).join('') : welcome}${typing}</div>`;
}
function chatScroll(instant) { requestAnimationFrame(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: instant ? 'auto' : 'smooth'})); }
function chatAfterRender(switched) { if (switched && chat.length) chatScroll(true); }

async function askAI() {
  const fixed = [];
  chat.slice(-9).map(m => ({role: m.r === 'u' ? 'user' : 'assistant', content: m.t.slice(0, 1200)})).forEach(m => {
    const l = fixed[fixed.length - 1];
    if (!fixed.length && m.role !== 'user') return;
    if (l && l.role === m.role) l.content += '\n' + m.content; else fixed.push(m);
  });
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch('/.netlify/functions/chat', {method: 'POST', signal: ctl.signal,
      headers: {'content-type': 'application/json', 'x-access-code': lsGet(AI_CODE) || ''},
      body: JSON.stringify({messages: fixed, context: window.MyDayAI.summary(aiEnv()), lang: window.L.lang})});
    if (res.status === 404 || res.status === 405 || res.status === 501) { aiDown = true; throw {code: res.status, why: 'chat_err_nofn'}; }
    if (!res.ok) {
      let j = {}; try { j = await res.json(); } catch (x) {}
      throw {code: res.status, why: res.status === 401 ? 'chat_auth' : res.status === 403 ? 'chat_err_origin' : j.error === 'no_key' ? 'chat_err_key' : 'chat_err_up', detail: j.status ? j.status + (j.detail ? ' · ' + j.detail : '') : ''};
    }
    const j = await res.json();
    if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw {code: 0};
    return j.reply.trim().slice(0, 4000);
  } finally { clearTimeout(to); }
}

async function chatSend(text) {
  if (AI_COMING_SOON) return;
  text = String(text || '').trim().slice(0, 500);
  if (!text || chatBusy) return;
  chat.push({r: 'u', t: text});
  const local = window.MyDayAI.answer(text, aiEnv());
  const useAI = S.settings.ai && !aiDown && navigator.onLine && !local.action;   // "add expense" is always handled on-device
  chatBusy = useAI; chatSave(); render(); chatScroll();
  let out = '', note = '';
  if (useAI) { try { out = await askAI(); } catch (e) { note = _t('chat_fallback') + (e && e.why ? '\n⚠️ ' + _t(e.why) + (e.detail ? ' (' + e.detail + ')' : '') : e && e.name === 'AbortError' ? '\n⚠️ ' + _t('chat_err_slow') : '\n⚠️ ' + _t('chat_err_net')); } }
  chatBusy = false;
  chat.push(out ? {r: 'a', t: out} : {r: 'a', t: (note ? note + '\n\n' : '') + local.text, a: local.action ? {type: 'exp', d: local.action.d, done: false} : null});
  chat = chat.slice(-40); chatSave(); if (tab === 'chat') { render(); chatScroll(); }
}

/* ═══ 5 · sheets & forms ══════════════════════════════════════════════ */
let sheetOpen = false, lastFocus = null, trapFn = null, confirmCb = null;

function openSheet(html, focusSel) {
  const sh = $('#ov .sheet');
  if (!sheetOpen) { sheetOpen = true; lastFocus = document.activeElement; try { history.pushState({sheet: 1}, ''); } catch (e) {} }
  sh.innerHTML = '<div class="sheet-grab"></div>' + html;
  $('#ov').classList.add('on');
  document.body.style.overflow = 'hidden'; document.body.classList.add('sheet-open');
  const f = sh.querySelector(focusSel || 'input:not([type=radio]):not([type=hidden]),select,textarea');
  if (f && !matchMedia('(pointer:coarse)').matches) f.focus();
  else if (f && focusSel) f.focus();
  trapFocus(sh);
}
function closeSheet(fromPop) {
  if (!sheetOpen) return;
  sheetOpen = false; confirmCb = null;
  $('#ov').classList.remove('on');
  document.body.style.overflow = ''; document.body.classList.remove('sheet-open');
  releaseTrap();
  if (!fromPop) { try { if (history.state && history.state.sheet) history.back(); } catch (e) {} }
  if (lastFocus && lastFocus.focus && lastFocus.isConnected) try { lastFocus.focus({preventScroll: true}); } catch (e) {}
}
function trapFocus(el) {
  releaseTrap();
  trapFn = e => {
    if (e.key !== 'Tab') return;
    const f = Array.from(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=radio]),select,textarea,[tabindex]:not([tabindex="-1"])')).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };
  document.addEventListener('keydown', trapFn);
}
function releaseTrap() { if (trapFn) { document.removeEventListener('keydown', trapFn); trapFn = null; } }

const sheetHead = title => `<div class="sheet-h"><h2 id="sheet-title">${title}</h2><button type="button" class="iconbtn" data-act="close" aria-label="${_t('btn_close')}">${ico('x')}</button></div>`;

/* field builders */
const fText = (name, label, v, o) => { o = o || {};
  return `<label class="field" data-f="${name}"><span class="lb">${label}</span><input name="${name}" type="${o.type || 'text'}" value="${esc(v)}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.req ? ' required' : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.list ? ` list="${o.list}"` : ''}${o.attrs ? ' ' + o.attrs : ''}><span class="ferr" data-e="${name}"></span></label>`; };
const fSeg = (name, label, opts, val) => `<div class="field"><span class="lb">${label}</span><div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${v === val ? ' checked' : ''}><span class="sg">${l}</span></label>`).join('')}</div></div>`;

const fDate = (name, label, v, o) => { o = o || {};
  const chips = [[0, 'when_today'], [1, 'yesterday'], [2, 'day_before']].map(c => { const d = ymd(addDays(new Date(), -c[0]));
    return `<button type="button" class="chip-btn${v === d ? ' on' : ''}" data-act="setdate" data-name="${name}" data-v="${d}">${_t(c[1])}</button>`; }).join('');
  return `<div class="field" data-f="${name}"><span class="lb">${label}</span><div class="fchips dq">${chips}</div><input name="${name}" type="date" value="${esc(v)}" required aria-label="${esc(label)}"${o.max ? ` max="${o.max}"` : ''}><span class="ferr" data-e="${name}"></span></div>`; };
function syncDateChips(inp) { const f = inp.closest('.field'); if (f) f.querySelectorAll('[data-act=setdate]').forEach(b => b.classList.toggle('on', b.dataset.v === inp.value)); }

const FORMS = {
  exp: {
    def: () => ({amount: '', cat: 'food', note: '', date: ymd(new Date()), recurring: 'none'}),
    html: v => `<div class="amt-field" data-f="amount"><span class="cur">${esc(S.settings.cur)}</span><input name="amount" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value="${esc(v.amount)}" required aria-label="${_t('fld_amount')}"></div>
      <div class="ferr" data-e="amount" style="text-align:center;margin:-6px 0 10px"></div>
      ${fDate('date', _t('fld_date'), v.date)}
      <div class="field"><span class="lb">${_t('fld_cat')}</span><div class="cat-grid" role="radiogroup" aria-label="${_t('fld_cat')}">${CAT_DEF.map(c => { const k = catOf(c[0]);
        return `<label><input type="radio" name="cat" value="${k.id}"${v.cat === k.id ? ' checked' : ''}><span class="ct"><span class="cat-ic" style="background:${k.color}">${ico(k.icon)}</span>${k.name}</span></label>`; }).join('')}</div></div>
      ${fText('note', _t('fld_note_opt'), v.note, {max: 200, ph: _t('ph_note')})}
      ${fSeg('recurring', _t('fld_repeat'), repOpts(), v.recurring)}`,
    read(d) { const a = Math.round(parseFloat(String(d.amount).replace(',', '.')) * 100) / 100;
      if (!(a > 0) || a > 1e10) return {err: {amount: 'err_amount'}};
      return {d: {amount: a, cat: catOf(d.cat).id, note: d.note.trim().slice(0, 200), date: d.date, recurring: REP_IDS.includes(d.recurring) ? d.recurring : 'none'}}; }
  },
  rem: {
    def: () => ({title: '', kind: 'study', date: ymd(new Date()), time: '', repeat: 'none'}),
    html: v => `${fText('title', _t('fld_title'), v.title, {req: true, max: 200, ph: _t('ph_title')})}
      ${fSeg('kind', _t('fld_kind'), KIND_DEF.map(k => [k[0], _t(k[1])]), v.kind)}
      <div class="row2">${fText('date', _t('fld_date'), v.date, {type: 'date', req: true})}${fText('time', _t('fld_time'), v.time, {type: 'time'})}</div>
      ${fSeg('repeat', _t('fld_repeat'), repOpts(), v.repeat)}`,
    read(d) { const title = d.title.trim(); if (!title) return {err: {title: 'err_text'}};
      return {d: {title, kind: kindOf(d.kind).id, date: d.date, time: TIME_RE.test(d.time) ? d.time : '', repeat: REP_IDS.includes(d.repeat) ? d.repeat : 'none'}}; }
  },
  study: {
    def: () => ({subject: S.study.length ? S.study.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].subject : '', mins: '', note: '', date: ymd(new Date())}),
    html: v => `${fText('subject', _t('fld_subject'), v.subject, {req: true, max: 100, list: 'subjList', ph: _t('ph_subject')})}
      <datalist id="subjList">${[...new Set(S.study.map(x => x.subject))].slice(0, 20).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
      ${fText('mins', _t('fld_mins'), v.mins, {type: 'number', req: true, attrs: 'min="1" max="1440" step="1" inputmode="numeric"'})}
      <div class="field" style="margin-top:-6px;display:flex;flex-wrap:wrap;gap:8px">${[15, 30, 45, 60, 90].map(n => `<button type="button" class="chip-btn" data-act="fill" data-name="mins" data-v="${n}">${n}</button>`).join('')}</div>
      ${fText('note', _t('fld_note_opt'), v.note, {max: 200})}
      ${fDate('date', _t('fld_date'), v.date, {max: ymd(new Date())})}`,
    read(d) { const m = Math.round(+d.mins), s = d.subject.trim();
      if (!s) return {err: {subject: 'err_text'}}; if (!(m >= 1) || m > 1440) return {err: {mins: 'err_mins'}};
      return {d: {subject: s, mins: m, note: d.note.trim().slice(0, 200), date: d.date}}; }
  },
  exam: {
    def: () => ({title: '', subject: '', date: ymd(addDays(new Date(), 14))}),
    html: v => `${fText('title', _t('fld_exam'), v.title, {req: true, max: 200})}${fText('subject', _t('fld_subject'), v.subject, {max: 100, list: 'subjList', ph: _t('ph_subject')})}
      <datalist id="subjList">${[...new Set(S.study.map(x => x.subject))].slice(0, 20).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
      ${fText('date', _t('fld_date'), v.date, {type: 'date', req: true})}`,
    read(d) { const title = d.title.trim(); if (!title) return {err: {title: 'err_text'}};
      return {d: {title, subject: d.subject.trim().slice(0, 100), date: d.date}}; }
  },
  todo: {
    def: () => ({title: '', subject: ''}),
    html: v => `${fText('title', _t('fld_todo'), v.title, {req: true, max: 200})}${fText('subject', _t('fld_subject'), v.subject, {max: 100, list: 'subjList', ph: _t('ph_subject')})}
      <datalist id="subjList">${[...new Set(S.study.map(x => x.subject))].slice(0, 20).map(s => `<option value="${esc(s)}">`).join('')}</datalist>`,
    read(d) { const title = d.title.trim(); if (!title) return {err: {title: 'err_text'}};
      return {d: {title, subject: (d.subject || '').trim().slice(0, 100)}}; }
  },
  bday: {
    def: () => ({name: '', date: ''}),
    html: v => `${fText('name', _t('fld_name'), v.name, {req: true, max: 100, ph: _t('ph_name')})}${fText('date', _t('fld_bdate'), v.date, {type: 'date', req: true, attrs: `max="${ymd(new Date())}"`})}`,
    read(d) { const name = d.name.trim(); if (!name) return {err: {name: 'err_text'}}; return {d: {name, date: d.date}}; }
  },
  mem: {
    def: () => ({title: '', kind: 'memory', mood: 0, date: ymd(new Date()), body: ''}),
    html: v => `${fText('title', _t('fld_mem_title'), v.title, {req: true, max: 120, ph: _t('ph_mem_title')})}
      ${fSeg('kind', _t('fld_kind'), MEM_KINDS.map(k => [k[0], _t(k[1])]), v.kind)}
      <div class="field"><span class="lb">${_t('fld_mood')}</span><div class="seg" role="radiogroup" aria-label="${_t('fld_mood')}">${MOODS.map((m, i) => `<label><input type="radio" name="mood" value="${i}"${+v.mood === i ? ' checked' : ''}><span class="sg mood">${m || '–'}</span></label>`).join('')}</div></div>
      ${fDate('date', _t('fld_date'), v.date, {max: ymd(new Date())})}
      <label class="field" data-f="body"><span class="lb">${_t('fld_mem_body')}</span><textarea name="body" rows="6" maxlength="4000" placeholder="${esc(_t('ph_mem_body'))}">${esc(v.body)}</textarea></label>`,
    read(d) { const title = d.title.trim(); if (!title) return {err: {title: 'err_text'}};
      const mood = Math.round(+d.mood);
      return {d: {title, kind: MEM_KINDS.some(k => k[0] === d.kind) ? d.kind : 'memory', mood: mood >= 1 && mood <= 5 ? mood : 0, date: d.date, body: (d.body || '').trim().slice(0, 4000)}}; }
  }
};
const COL = {exp: 'expenses', rem: 'reminders', bday: 'birthdays', study: 'study', exam: 'exams', todo: 'todos', mem: 'memories'};

function formSheet(type, id, preset) {
  const F = FORMS[type], it = id ? S[COL[type]].find(x => x.id === id) : null;
  if (id && !it) return;
  const v = it || Object.assign(F.def(), preset || {});
  openSheet(`<form id="f" data-t="${type}" data-id="${esc(id || '')}" novalidate>
    ${sheetHead(_t((it ? 'edit_' : 'new_') + type))}
    <div class="sheet-b"><div class="formerr" id="formErr" hidden></div>${F.html(v)}</div>
    <div class="sheet-f">${it ? `<button type="button" class="btn danger icon" data-act="del" data-t="${type}" data-id="${esc(id)}" aria-label="${_t('btn_delete')}">${ico('trash')}</button>` : ''}<button class="btn pri" type="submit">${_t('btn_save')}</button></div></form>`,
    type === 'exp' && !it ? 'input[name=amount]' : null);
}

function chooser() {
  const opts = [['exp', 'wallet', '#E8604C'], ['rem', 'bell', '#0B6B61'], ['study', 'cap', '#1FA97A'], ['exam', 'calendar', '#8A5CF6'], ['bday', 'gift', '#D99A12'], ['mem', 'spark', '#C2410C']];
  openSheet(`${sheetHead(_t('h_add_what'))}<div class="sheet-b"><div class="pick">${opts.map(([k, ic, c]) => `<button class="opt" data-act="add" data-t="${k}"><span class="oi" style="background:${c}">${ico(ic)}</span><b>${_t('add_' + k)}</b><small>${_t('add_' + k + '_d')}</small></button>`).join('')}</div></div>`);
}
function snoozeSheet(id) {
  openSheet(`${sheetHead(_t('h_snooze'))}<div class="sheet-b"><div class="opt-list">${[['10m', 'snooze_10m'], ['1h', 'snooze_1h'], ['tom', 'snooze_tom']].map(([v, k]) => `<button class="btn" data-act="dosnooze" data-id="${esc(id)}" data-sv="${v}">${ico('clock')} ${_t(k)}</button>`).join('')}</div></div>`, '.opt-list .btn');
}
function goalSheet() {
  openSheet(`<form id="f" data-t="goal" novalidate>${sheetHead(_t('st_goal'))}<div class="sheet-b"><p class="sheet-note">${_t('st_goal_ask')}</p>
    ${fText('hours', _t('st_goal_hint'), +(S.settings.studyGoal / 60).toFixed(1), {type: 'number', req: true, attrs: 'min="0.5" max="100" step="0.5" inputmode="decimal"'})}</div>
    <div class="sheet-f"><button class="btn pri" type="submit">${_t('btn_save')}</button></div></form>`);
}
function confirmSheet(o) {
  confirmCb = o.ok;
  openSheet(`${sheetHead(o.title)}<div class="sheet-b"><p class="sheet-note">${o.desc}</p></div>
    <div class="sheet-f"><button class="btn" data-act="close">${_t('btn_cancel')}</button><button class="btn ${o.danger ? 'dangerfill' : 'pri'}" data-act="confirmok">${o.label}</button></div>`, '.sheet-f .btn');
}
function pinSheet(change) {
  openSheet(`<form id="f" data-t="pinset" novalidate>${sheetHead(_t(change ? 'pin_change_t' : 'pin_set_t'))}<div class="sheet-b"><div class="formerr" id="formErr" hidden></div>
    ${change ? fText('old', _t('pin_old'), '', {type: 'password', attrs: 'inputmode="numeric" maxlength="6" autocomplete="current-password"'}) : ''}
    ${fText('new1', _t('pin_new'), '', {type: 'password', req: true, attrs: 'inputmode="numeric" maxlength="6" autocomplete="new-password"'})}
    ${fText('new2', _t('pin_confirm'), '', {type: 'password', req: true, attrs: 'inputmode="numeric" maxlength="6" autocomplete="new-password"'})}
    <p class="sheet-note">${_t('pin_note')}</p></div>
    <div class="sheet-f"><button class="btn pri" type="submit">${_t('btn_save')}</button></div></form>`);
}

function showErrors(form, errs) {
  $$('#ov .field.bad, #ov .amt-field.bad').forEach(x => x.classList.remove('bad'));
  $$('#ov .ferr').forEach(x => x.textContent = '');
  let firstEl = null;
  Object.keys(errs).forEach(k => {
    const e = form.querySelector(`[data-e="${k}"]`), f = form.querySelector(`[data-f="${k}"]`);
    if (e) e.textContent = _t(errs[k]);
    if (f) f.classList.add('bad');
    if (!firstEl) firstEl = form.querySelector(`[name="${k}"]`);
  });
  if (firstEl) firstEl.focus();
}
function formError(msg) { const el = $('#formErr'); if (el) { el.textContent = msg; el.hidden = !msg; } }

function saveForm(type, id, d) {
  mutate(type === 'exp' ? 'toast_exp_saved' : type === 'study' ? 'toast_study_saved' : 'toast_saved', () => {
    const col = S[COL[type]];
    if (id) {
      const it = col.find(x => x.id === id); if (!it) return;
      if (type === 'rem') {
        if (d.date !== it.date) it.done = false;
        if (d.date !== it.date || d.time !== it.time || d.repeat !== it.repeat) { it.lastDone = ''; delete it.snooze; }
      }
      Object.assign(it, d); stamp(it);
    } else {
      const it = Object.assign({id: uid()}, d); stamp(it);
      if (type === 'rem') { it.done = false; it.lastDone = ''; }
      if (type === 'todo') it.done = false;
      col.push(it);
    }
    if (type === 'exp') { ensureRecurring(); if (tab === 'spend') month = d.date.slice(0, 7); }
  });
}

function deleteItem(type, id) {
  mutate('toast_deleted', () => {
    const col = S[COL[type]], it = col.find(x => x.id === id); if (!it) return;
    const tb = {id, deletedAt: Date.now()};
    if (type === 'exp' && it.recurringParent) { tb.parent = it.recurringParent; tb.date = it.date; }
    S.tombstones.push(tb);
    S[COL[type]] = col.filter(x => x.id !== id);
  });
}

/* ═══ 6 · toasts ══════════════════════════════════════════════════════ */
function toast(msg, o) {
  o = o || {};
  const box = $('#toasts'); if (!box) return;
  while (box.children.length >= 2) box.firstChild.remove();
  const el = document.createElement('div'); el.className = 'toast' + (o.err ? ' err' : '');
  const sp = document.createElement('span'); sp.textContent = msg; el.appendChild(sp);
  const kill = () => { el.remove(); };
  if (o.undo) { const b = document.createElement('button'); b.type = 'button'; b.textContent = _t('btn_undo'); b.addEventListener('click', () => { kill(); o.undo(); }); el.appendChild(b); }
  box.appendChild(el);
  setTimeout(kill, o.ms || (o.undo ? 6000 : 3500));
}

/* ═══ 7 · PIN lock ════════════════════════════════════════════════════ */
const PIN_KEY = 'myday:pin', PIN_ATT = 'myday:pin:attempts';
let pinBuf = '', pinBusy = false, waitInt = null;
const hasSubtle = () => !!(window.crypto && crypto.subtle);
const toHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
async function pbkdf2(pin, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256'}, km, 256));
}
async function makePin(pin) { const salt = crypto.getRandomValues(new Uint8Array(16)); return 'v2$' + pin.length + '$' + toHex(salt) + '$' + await pbkdf2(pin, salt); }
async function checkPin(pin, stored) {
  if (stored.indexOf('v2$') === 0) { const p = stored.split('$'); return (await pbkdf2(pin, fromHex(p[2]))) === p[3]; }
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('myday-pin-v1:' + pin))) === stored;   // legacy (v1) hashes still unlock, then get upgraded
}
const pinLen = () => { const s = lsGet(PIN_KEY) || ''; return s.indexOf('v2$') === 0 ? +s.split('$')[1] || 0 : 0; };
const getAtt = () => { try { return JSON.parse(lsGet(PIN_ATT)) || {count: 0, lastAt: 0}; } catch (e) { return {count: 0, lastAt: 0}; } };
const setAtt = o => lsSet(PIN_ATT, JSON.stringify(o));
function waitLeft() { const a = getAtt(); if (a.count < 5) return 0; const w = Math.min(30 * Math.pow(2, a.count - 5), 300); return Math.max(0, w - Math.floor((Date.now() - a.lastAt) / 1000)); }

function buildLock() {
  $('#keypad').innerHTML = ['1','2','3','4','5','6','7','8','9','back','0','go'].map(k => k === 'back'
    ? `<button class="key act" data-act="pinkey" data-k="back" aria-label="${_t('aria_backspace')}">${ico('backspace')}</button>` : k === 'go'
    ? `<button class="key go" data-act="pinkey" data-k="go" aria-label="${_t('aria_ok')}">${ico('check')}</button>`
    : `<button class="key num" data-act="pinkey" data-k="${k}">${k}</button>`).join('');
  drawDots(); tickWait();
}
function drawDots() { const n = Math.max(pinLen() || 4, pinBuf.length); $('#pinDots').innerHTML = Array.from({length: n}, (_, i) => `<i class="${i < pinBuf.length ? 'f' : ''}"></i>`).join(''); }
function tickWait() {
  clearInterval(waitInt);
  const upd = () => { const w = waitLeft(), msg = $('#pinMsg'); $$('#keypad .key').forEach(k => k.disabled = w > 0);
    if (w > 0) msg.textContent = _t('pin_wait', {s: w}); else { if (msg.dataset.w) msg.textContent = ''; clearInterval(waitInt); }
    msg.dataset.w = w > 0 ? '1' : ''; };
  if (waitLeft() > 0) { upd(); waitInt = setInterval(upd, 1000); }
}
function lockApp() {
  if (!lsGet(PIN_KEY)) return;
  closeSheet(); pinBuf = ''; document.documentElement.dataset.locked = '1';
  $('#forgotPanel').hidden = true; $('#keypad').hidden = false; $('#pinForgotBtn').hidden = false; $('#pinMsg').textContent = '';
  buildLock();
}
function unlockApp() {
  pinBuf = ''; delete document.documentElement.dataset.locked; $('#pinMsg').textContent = '';
  render(); check();
}
function pinKey(k) {
  if (pinBusy || waitLeft() > 0) return;
  if (k === 'back') pinBuf = pinBuf.slice(0, -1);
  else if (k === 'go') return submitPin();
  else if (/^\d$/.test(k) && pinBuf.length < 6) pinBuf += k;
  $('#pinMsg').textContent = ''; drawDots();
  const L = pinLen(); if (L && pinBuf.length === L) submitPin();
}
async function submitPin() {
  const stored = lsGet(PIN_KEY);
  if (!stored) return unlockApp();
  if (!pinBuf || pinBusy) return;
  pinBusy = true; let ok = false;
  try { ok = await checkPin(pinBuf, stored); } catch (e) {}
  pinBusy = false;
  if (ok) {
    setAtt({count: 0, lastAt: 0});
    if (stored.indexOf('v2$') !== 0) { try { lsSet(PIN_KEY, await makePin(pinBuf)); } catch (e) {} }
    return unlockApp();
  }
  const a = getAtt(); a.count++; a.lastAt = Date.now(); setAtt(a);
  pinBuf = ''; drawDots();
  const d = $('#pinDots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
  if (navigator.vibrate) navigator.vibrate(120);
  const left = 5 - a.count;
  $('#pinMsg').textContent = _t('pin_wrong') + (left > 0 ? ' · ' + _tn('pin_left', left) : '');
  if (left <= 0) tickWait();
}
async function savePin(d) {
  const stored = lsGet(PIN_KEY);
  if (!hasSubtle()) return formError(_t('pin_https'));
  if (stored && d.old !== undefined) { let ok = false; try { ok = await checkPin(d.old, stored); } catch (e) {} if (!ok) return formError(_t('pin_wrong_old')); }
  if (!/^\d{4,6}$/.test(d.new1)) return formError(_t('pin_short'));
  if (d.new1 !== d.new2) return formError(_t('pin_mismatch'));
  lsSet(PIN_KEY, await makePin(d.new1)); setAtt({count: 0, lastAt: 0});
  closeSheet(); render(); toast(_t('toast_pin_set'));
}
function wipeAll() {
  const keep = {lang: lsGet('myday:lang'), theme: lsGet('myday:theme')};
  try { localStorage.clear(); } catch (e) {}
  if (keep.lang) lsSet('myday:lang', keep.lang); if (keep.theme) lsSet('myday:theme', keep.theme);
  location.replace(location.pathname);
}

/* ═══ 8 · backup (export / import) ════════════════════════════════════ */
async function doExport() {
  const data = JSON.parse(JSON.stringify(S));
  const str = JSON.stringify({version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data}, null, 2);
  const name = 'my-day-' + ymd(new Date()) + '.json';
  let done = false;
  try {
    const file = new File([str], name, {type: 'application/json'});
    if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: _t('share_title')}); done = true; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  if (!done) {
    const u = URL.createObjectURL(new Blob([str], {type: 'application/json'})), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 10000);
  }
  S.settings.lastBackupAt = Date.now(); commit(); toast(_t('toast_export_ok'));
}

function mergeData(local, remote) {
  const tomb = {};
  local.tombstones.concat(remote.tombstones).forEach(t => { if (!tomb[t.id] || t.deletedAt > tomb[t.id].deletedAt) tomb[t.id] = t; });
  const out = JSON.parse(JSON.stringify(local));
  out.tombstones = Object.keys(tomb).map(k => tomb[k]);
  Object.keys(COL).forEach(k => {
    const c = COL[k], map = {};
    local[c].concat(remote[c]).forEach(r => { if (tomb[r.id]) return; if (!map[r.id] || (r.updatedAt || 0) > (map[r.id].updatedAt || 0)) map[r.id] = r; });
    out[c] = Object.keys(map).map(id => map[id]);
  });
  if ((remote.settings.updatedAt || 0) > (local.settings.updatedAt || 0)) out.settings = remote.settings;
  return clean(out);
}

function handleImportFile(file) {
  if (!file) return;
  if (file.size > 5 * 1048576) return toast(_t('imp_big'), {err: true});
  const rd = new FileReader();
  rd.onerror = () => toast(_t('imp_invalid'), {err: true});
  rd.onload = () => {
    let incoming;
    try {
      const p = JSON.parse(rd.result), raw = p && p.data && typeof p.data === 'object' ? p.data : p;   // new {version,data} or legacy raw export
      if (!raw || !(Array.isArray(raw.expenses) || Array.isArray(raw.reminders) || Array.isArray(raw.birthdays) || Array.isArray(raw.study) || Array.isArray(raw.exams) || Array.isArray(raw.memories))) throw 0;
      incoming = clean(raw);
    } catch (e) { return toast(_t('imp_invalid'), {err: true}); }
    const rows = [['imp_exp', incoming.expenses.length], ['imp_rem', incoming.reminders.length], ['imp_bday', incoming.birthdays.length], ['imp_study', incoming.study.length], ['imp_exam', incoming.exams.length], ['imp_todo', incoming.todos.length], ['imp_mem', incoming.memories.length]];
    openSheet(`${sheetHead(_t('imp_title'))}<div class="sheet-b"><p class="sheet-note">${_t('imp_found')}</p>
      <div class="kv">${rows.map(r => `<div><span>${_t(r[0])}</span><b class="num">${r[1]}</b></div>`).join('')}</div><p class="sheet-note">${_t('imp_choose')}</p></div>
      <div class="sheet-f"><button class="btn" id="impReplace">${_t('imp_replace')}</button><button class="btn pri" id="impMerge">${_t('imp_merge')}</button></div>`, '#impMerge');
    $('#impReplace').addEventListener('click', () => { closeSheet(); mutate('toast_import_ok', () => { S = incoming; S.settings.lastBackupAt = Date.now(); applyTheme(S.settings.theme); if (S.settings.lang !== window.L.lang) window.setLang(S.settings.lang); }); });
    $('#impMerge').addEventListener('click', () => { closeSheet(); mutate('toast_import_ok', () => { S = mergeData(S, incoming); }); });
  };
  rd.readAsText(file);
}

/* expense report → print-to-PDF (no libraries: the browser's "Save as PDF" keeps Sinhala text intact) */
const monthRange = (y, m0) => [ymd(new Date(y, m0, 1)), ymd(new Date(y, m0 + 1, 0))];
function reportRange(kind) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  if (kind === 'last') return monthRange(y, m - 1);
  if (kind === '3m') return [monthRange(y, m - 2)[0], monthRange(y, m)[1]];
  if (kind === 'year') return [y + '-01-01', y + '-12-31'];
  return monthRange(y, m);
}
function reportSheet() {
  const [from, to] = monthRange(+month.slice(0, 4), +month.slice(5) - 1);
  const chips = [['this', 'rep_this'], ['last', 'rep_last'], ['3m', 'rep_3m'], ['year', 'rep_year']]
    .map(([k, l]) => `<button type="button" class="chip-btn" data-act="reprange" data-k="${k}">${_t(l)}</button>`).join('');
  openSheet(`<form id="f" data-t="report" novalidate>${sheetHead(_t('rep_title'))}
    <div class="sheet-b"><div class="formerr" id="formErr" hidden></div>
      <div class="field" style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div>
      ${fText('from', _t('rep_from'), from, {type: 'date', req: true})}
      ${fText('to', _t('rep_to'), to, {type: 'date', req: true})}
      <p class="sheet-note">${_t('rep_note')}</p></div>
    <div class="sheet-f"><button class="btn pri" type="submit">${ico('download', 'sm')} ${_t('rep_make')}</button></div></form>`);
}
function buildReport(from, to) {
  const list = S.expenses.filter(x => x.date >= from && x.date <= to).sort((a, b) => a.date.localeCompare(b.date) || (a.updatedAt || 0) - (b.updatedAt || 0));
  const total = sum(list), days = Math.max(1, daysBetween(from, to) + 1);
  const by = {}; list.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
  const cats = Object.keys(by).sort((a, b) => by[b] - by[a]);
  const dt = d => +d.slice(8) + ' ' + MON()[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4);
  return {n: list.length, html: `<div class="rp">
    <header class="rp-h"><div><h1>${_t('app_name')} · ${_t('rep_title')}</h1><p>${dt(from)} – ${dt(to)}</p></div><p class="rp-gen">${_t('rep_generated')}: ${dt(ymd(new Date()))}</p></header>
    <div class="rp-sum"><div><small>${_t('sp_total')}</small><b>${money(total)}</b></div><div><small>${_t('sp_count')}</small><b>${list.length}</b></div><div><small>${_t('sp_avg')}</small><b>${money(total / days)}</b></div><div><small>${_t('sp_top')}</small><b>${cats[0] ? esc(catOf(cats[0]).name) : '-'}</b></div></div>
    <h2>${_t('h_by_cat')}</h2>
    <table><thead><tr><th>${_t('rep_cat')}</th><th class="r">${_t('rep_amount')}</th><th class="r">%</th></tr></thead><tbody>${cats.map(id => `<tr><td>${esc(catOf(id).name)}</td><td class="r">${money(by[id])}</td><td class="r">${Math.round(by[id] / (total || 1) * 100)}%</td></tr>`).join('')}</tbody></table>
    <h2>${_t('rep_tx')}</h2>
    <table><thead><tr><th>${_t('rep_date')}</th><th>${_t('rep_cat')}</th><th>${_t('rep_note_col')}</th><th class="r">${_t('rep_amount')}</th></tr></thead><tbody>${list.map(x => `<tr><td>${dt(x.date)}</td><td>${esc(catOf(x.cat).name)}</td><td>${esc(x.note || '')}</td><td class="r">${money(x.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3">${_t('sp_total')}</td><td class="r">${money(total)}</td></tr></tfoot></table>
    <p class="rp-by">Powered By Chanuka Malshan</p></div>`};
}
function printReport(from, to) {
  const area = $('#printArea'); if (!area) return;
  const r = buildReport(from, to);
  area.innerHTML = r.html;
  const oldTitle = document.title;
  document.title = 'My-Day-Expenses_' + from + '_to_' + to;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); document.title = oldTitle; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { try { window.print(); } catch (e) { done(); } }, 250);
}

/* branded preloader flash on navigation clicks (static #clickPre markup lives in index.html) */
let clickPreT = 0;
function clickPreload() {
  const p = document.getElementById('clickPre');
  if (!CLICK_PRELOADER || !p || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  p.classList.remove('done'); clearTimeout(clickPreT);
  clickPreT = setTimeout(() => p.classList.add('done'), CLICK_PRE_MS);
}

/* ═══ 9 · events ══════════════════════════════════════════════════════ */
const ACT = {
  more() {
    openSheet(`${sheetHead(_t('title_more'))}<div class="sheet-b"><div class="pick">${[['bday', 'gift', '#D99A12'], ['mem', 'spark', '#C2410C'], ['chat', 'chat', '#0B6B61'], ['set', 'sliders', '#475569']].map(([k, ic, c]) =>
      `<button class="opt" data-act="moretab" data-tab="${k}"><span class="oi" style="background:${c}">${ico(ic)}</span><b>${_t('tab_' + k)}</b><small>${_t('more_' + k + '_d')}</small></button>`).join('')}</div></div>`);
  },
  moretab(el) { closeSheet(); ACT.tab(el); },
  chatq(el) { chatSend(el.dataset.q); },
  chatadd(el) {
    const m = chat[+el.dataset.i]; if (!m || !m.a || m.a.done || !m.a.d) return;
    const d = m.a.d; if (!DATE_RE.test(String(d.date))) return;
    const r = FORMS.exp.read({amount: String(d.amount), cat: String(d.cat), note: String(d.note || ''), date: String(d.date), recurring: 'none'});
    if (r.err) return;
    m.a.done = true; chatSave(); saveForm('exp', null, r.d);
  },
  chatclear() { confirmSheet({title: _t('chat_clear_t'), desc: _t('chat_clear_d'), label: _t('chat_clear'), danger: true, ok: () => { chat = []; chatSave(); closeSheet(); render(); }}); },
  aienable() { S.settings.ai = true; S.settings.updatedAt = Date.now(); aiDown = false; lsDel(AI_DISMISS); commit(); },
  ailater() { lsSet(AI_DISMISS, '1'); render(); },
  aitoggle() { S.settings.ai = !S.settings.ai; S.settings.updatedAt = Date.now(); aiDown = false; commit(); },
  report() { reportSheet(); },
  safeclose() { const b = $('#safeBar'); if (b) b.remove(); lsSet('myday:safe:no', String(Date.now())); },
  safebackup() { ACT.safeclose(); doExport(); },
  testnotif() { showNotif(_t('notif_test_t'), _t('notif_test_b'), 'test'); },
  reprange(el) {
    const [a, b] = reportRange(el.dataset.k), f = $('#f'); if (!f) return;
    f.querySelector('[name=from]').value = a; f.querySelector('[name=to]').value = b;
  },
  todo(el) {
    const x = S.todos.find(t => t.id === el.dataset.id); if (!x) return;
    if (navigator.vibrate && !x.done) navigator.vibrate(15);
    mutate(null, () => { x.done = !x.done; stamp(x); });
  },
  todoclear() {
    mutate('toast_deleted', () => {
      S.todos.filter(x => x.done).forEach(x => S.tombstones.push({id: x.id, deletedAt: Date.now()}));
      S.todos = S.todos.filter(x => !x.done);
    });
  },
  tab(el) { clickPreload(); tab = el.dataset.tab; q = ''; render(); window.scrollTo(0, 0); $('#view').focus({preventScroll: true}); },
  goset() { clickPreload(); tab = 'set'; render(); window.scrollTo(0, 0); setTimeout(() => { const i = $('[data-set=budget]'); if (i) i.focus(); }, 60); },
  add(el) {
    if (el.dataset.t) return formSheet(el.dataset.t);
    const d = {spend: 'exp', remind: 'rem', bday: 'bday', study: 'study', mem: 'mem'}[tab];
    d ? formSheet(d) : chooser();
  },
  edit(el) { formSheet(el.dataset.t, el.dataset.id); },
  close() { closeSheet(); },
  del(el) { closeSheet(); deleteItem(el.dataset.t, el.dataset.id); },
  done(el) {
    const r = S.reminders.find(x => x.id === el.dataset.id); if (!r) return;
    const t = ymd(new Date()), was = remDone(r, t);
    if (navigator.vibrate && !was) navigator.vibrate(15);
    mutate(was ? null : 'toast_done', () => {
      if (r.repeat === 'none') r.done = !r.done; else { r.lastDone = was ? '' : t; delete r.snooze; }
      stamp(r);
    });
  },
  snooze(el) { snoozeSheet(el.dataset.id); },
  dosnooze(el) {
    const r = S.reminders.find(x => x.id === el.dataset.id); closeSheet(); if (!r) return;
    const sv = el.dataset.sv; let date, time;
    if (sv === 'tom') { date = ymd(addDays(new Date(), 1)); time = r.time || ''; }
    else { const n = new Date(Date.now() + (sv === '10m' ? 10 : 60) * 60000); date = ymd(n); time = hmOf(n); }
    mutate('toast_snoozed', () => {
      if (r.repeat === 'none') { r.date = date; r.time = time; r.done = false; }
      else r.snooze = {date, time};                       // recurring: never move the schedule itself
      stamp(r);
    });
  },
  mo(el) { month = monthShift(month, +el.dataset.n); render(); },
  clrsearch() { q = ''; const i = $('#spendSearch'); if (i) { i.value = ''; i.focus(); } refreshSpendList(); },
  timer() {
    if (!timerStart) { timerStart = Date.now(); lsSet('myday:timer', String(timerStart)); render(); return; }
    const mins = Math.max(1, Math.round((Date.now() - timerStart) / 60000));
    timerStart = 0; clearInterval(timerInt); lsDel('myday:timer'); render();
    formSheet('study'); const m = $('#f input[name=mins]'); if (m) m.value = mins;
  },
  timerdiscard() { timerStart = 0; clearInterval(timerInt); lsDel('myday:timer'); render(); },
  goal() { goalSheet(); },
  setdate(el) { const i = $('#f input[name=' + el.dataset.name + ']'); if (i) { i.value = el.dataset.v; syncDateChips(i); } },
  addon(el) { formSheet('exp', null, {date: el.dataset.date}); },
  memkind(el) { mkind = el.dataset.k; const m = $('#memSearch'), v = m ? m.value : mq; render(); const m2 = $('#memSearch'); if (m2 && v) m2.value = v; },
  memfav(el) { const m = S.memories.find(x => x.id === el.dataset.id); if (!m) return; m.fav = !m.fav; stamp(m); commit(); },
  fill(el) { const i = $('#f input[name=' + el.dataset.name + ']'); if (i) { i.value = el.dataset.v; i.focus(); } },
  notif() { toggleNotif(); },
  install() { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall = null; render(); },
  export() { doExport(); },
  import() { const f = $('#importFile'); f.value = ''; f.click(); },
  pinset() { pinSheet(!!lsGet(PIN_KEY)); },
  pinremove() { confirmSheet({title: _t('confirm_pin_remove_t'), desc: _t('confirm_pin_remove_d'), label: _t('btn_pin_remove'), danger: true, ok: () => { lsDel(PIN_KEY); lsDel(PIN_ATT); closeSheet(); render(); toast(_t('toast_pin_removed')); }}); },
  pinkey(el) { pinKey(el.dataset.k); },
  pinforgot() { $('#forgotPanel').hidden = false; $('#keypad').hidden = true; $('#pinForgotBtn').hidden = true; $('#pinDots').hidden = true; $('#pinMsg').hidden = true; },
  pinforgotback() { $('#forgotPanel').hidden = true; $('#keypad').hidden = false; $('#pinForgotBtn').hidden = false; $('#pinDots').hidden = false; $('#pinMsg').hidden = false; },
  pinreset() { wipeAll(); },
  cleardata() { confirmSheet({title: _t('confirm_clear_t'), desc: _t('confirm_clear_d'), label: _t('btn_clear_data'), danger: true, ok: wipeAll}); },
  confirmok() { const cb = confirmCb; if (cb) cb(); },
  swupdate() { if (pendingSW) { updateRequested = true; pendingSW.postMessage({type: 'SKIP_WAITING'}); } else location.reload(); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.id === 'ov' && e.target !== el) return;       // clicks inside the sheet don't close it
  const fn = ACT[el.dataset.act]; if (fn) fn(el);
});

document.addEventListener('submit', e => {
  const f = e.target; if (f.id !== 'f') return; e.preventDefault();
  const type = f.dataset.t, id = f.dataset.id, d = Object.fromEntries(new FormData(f));
  Object.keys(d).forEach(k => { if (typeof d[k] !== 'string') delete d[k]; });
  if (type === 'pinset') return void savePin(d);
  if (type === 'report') {
    if (!DATE_RE.test(d.from || '') || !DATE_RE.test(d.to || '') || d.from > d.to) return formError(_t('rep_err'));
    if (!S.expenses.some(x => x.date >= d.from && x.date <= d.to)) return formError(_t('rep_none'));
    closeSheet(); printReport(d.from, d.to); return;
  }
  if (type === 'goal') {
    const h = parseFloat(String(d.hours).replace(',', '.'));
    if (!(h >= 0.5 && h <= 100)) return showErrors(f, {hours: 'err_amount'});
    closeSheet(); mutate('toast_goal_saved', () => { S.settings.studyGoal = Math.round(h * 60); S.settings.updatedAt = Date.now(); }); return;
  }
  const F = FORMS[type]; if (!F) return;
  for (const k of ['date']) if (k in d && !DATE_RE.test(d[k])) return showErrors(f, {[k]: 'err_text'});
  const res = F.read(d);
  if (res.err) return showErrors(f, res.err);
  closeSheet(); saveForm(type, id, res.d);
});

/* settings controls & search box (delegated so they survive re-renders) */
function refreshSpendList() {
  const l = $('#spendList'); if (l) l.innerHTML = spendListHTML();
  const c = $('#spendClr'); if (c) c.hidden = !q;
}
document.addEventListener('input', e => {
  if (e.target.type === 'date' && e.target.closest('#f')) syncDateChips(e.target);
  if (e.target.id === 'spendSearch') { q = e.target.value; refreshSpendList(); }
  else if (e.target.id === 'memSearch') { mq = e.target.value; const l = $('#memList'); if (l) l.innerHTML = memListHTML(); }       // only the list re-renders → input keeps focus
});
document.addEventListener('change', e => {
  if (e.target.id === 'importFile') { handleImportFile(e.target.files && e.target.files[0]); return; }
  const k = e.target.dataset.set; if (!k) return;
  const val = e.target.value;
  if (k === 'budget') { S.settings.budget = Math.max(0, parseFloat(val) || 0); S.settings.updatedAt = Date.now(); S.updated = Date.now(); persist(); toast(_t('toast_saved')); }
  else if (k === 'cur') { S.settings.cur = val.trim() ? val.trim().slice(0, 6) : (S.settings.lang === 'si' ? 'රු.' : 'Rs.'); S.settings.updatedAt = Date.now(); S.updated = Date.now(); persist(); toast(_t('toast_saved')); }
  else if (k === 'lang') {
    const nl = val === 'si' ? 'si' : 'en';
    if (S.settings.cur === 'රු.' && nl === 'en') S.settings.cur = 'Rs.'; else if (S.settings.cur === 'Rs.' && nl === 'si') S.settings.cur = 'රු.';
    S.settings.lang = nl; S.settings.updatedAt = Date.now(); S.updated = Date.now(); persist(); window.setLang(nl);
  }
  else if (k === 'aicode') { lsSet(AI_CODE, val.trim()); aiDown = false; toast(_t('toast_saved')); }
  else if (k === 'theme') { const th = ['light', 'dark'].includes(val) ? val : 'auto'; S.settings.theme = th; S.settings.updatedAt = Date.now(); applyTheme(th); commit(); }
});

document.addEventListener('keydown', e => {
  if (document.documentElement.dataset.locked) {
    if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('back'); else if (e.key === 'Enter') pinKey('go');
    return;
  }
  if (e.key === 'Escape') closeSheet();
});
window.addEventListener('popstate', () => { if (sheetOpen) closeSheet(true); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (tab === 'set') render(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast(_t('toast_installed')); if (tab === 'set') render(); });
window.addEventListener('offline', () => toast(_t('toast_offline')));
window.addEventListener('online', () => toast(_t('toast_online')));
window.addEventListener('storage', e => { if (e.key === KEY && !sheetOpen) { S = load(); render(); } });     // another tab/window changed the data

/* ═══ 10 · notifications ══════════════════════════════════════════════ */
const seenNow = {};
async function toggleNotif() {
  { const b = $('#safeBar'); if (b) b.remove(); }
  if (S.settings.notify) { S.settings.notify = false; return commit(); }
  if (!('Notification' in window)) return toast(_t('toast_notif_unsupported'), {err: true});
  let p = Notification.permission;
  if (p === 'default') { try { p = await Notification.requestPermission(); } catch (e) {} }
  if (p === 'granted') { S.settings.notify = true; commit(); toast(_t('toast_notif_on')); check(); }
  else { S.settings.notify = false; commit(); toast(_t('toast_notif_denied'), {err: true, ms: 7000}); }
}
function showNotif(title, body, tag) {
  const opts = {body, tag, icon: 'assets/icon-192-v2.png', badge: 'assets/icon-192-v2.png', data: {url: './'}};
  if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch (e) {} });
  else try { new Notification(title, opts); } catch (e) {}
}
function check() {
  if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || document.documentElement.dataset.locked) return;
  const n = new Date(), t = ymd(n), tm = ymd(addDays(n, 1)), now = hmOf(n), nk = 'myday:n:' + t;
  let seen = []; try { seen = JSON.parse(lsGet(nk)) || []; } catch (e) {}
  const set = new Set(seen), yest = ymd(addDays(n, -1));
  try { Object.keys(localStorage).forEach(k => { if (k.indexOf('myday:n:') === 0 && k.slice(8) !== t && k.slice(8) !== yest) localStorage.removeItem(k); }); } catch (e) {}
  const fire = (k, ti, bo) => { if (set.has(k) || seenNow[t + k]) return; set.add(k); seenNow[t + k] = 1; showNotif(ti, bo, k); };
  S.reminders.forEach(r => { const rt = remTime(r); if (isDue(r, t) && (!rt || rt <= now)) fire('r' + r.id + ':' + rt, r.title, rt ? _t('notif_time', {t: rt}) : _t('notif_today')); });
  S.birthdays.forEach(b => {
    if (b.date.slice(5) === t.slice(5)) fire('b' + b.id, _t('notif_bday_today', {n: b.name}), _t('notif_bday_today_b'));
    else if (b.date.slice(5) === tm.slice(5)) fire('t' + b.id, _t('notif_bday_tom', {n: b.name}), _t('notif_bday_tom_b'));
  });
  lsSet(nk, JSON.stringify(Array.from(set)));
}

/* ═══ 11 · service worker ═════════════════════════════════════════════ */
let pendingSW = null, updateRequested = false;
function showUpdate(sw) {
  pendingSW = sw;
  if ($('#updBar')) return;
  const el = document.createElement('div'); el.id = 'updBar'; el.className = 'update'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${_t('sw_update')}</span><button type="button" data-act="swupdate">${_t('sw_reload')}</button>`;
  document.body.appendChild(el);
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=' + BUILD, {scope: './'}).then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw); });
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {});
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateRequested && !reloading) { reloading = true; location.reload(); } });
}

/* One-line safety notice: the main reasons friends lose data or miss reminders */
const UA = navigator.userAgent || '';
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|TikTok|musical_ly|Snapchat|MicroMessenger|WhatsApp|; wv\)/i.test(UA);
const IS_IOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function safeNotice() {
  if ($('#safeBar') || document.documentElement.dataset.locked) return;
  const hold = +lsGet('myday:safe:no') || 0, items = ['expenses', 'reminders', 'birthdays', 'study', 'exams', 'todos', 'memories'].reduce((n, k) => n + S[k].length, 0);
  let key = '', btn = '', act = '';
  if (IN_APP) { key = 'safe_inapp'; if (Date.now() - hold < 864e5) return; }
  else if (Date.now() - hold < 3 * 864e5) return;
  else if (IS_IOS && !IS_STANDALONE) key = 'safe_ios';
  else if (items >= 3 && (!S.settings.lastBackupAt || Date.now() - S.settings.lastBackupAt > 7 * 864e5)) { key = 'safe_backup'; btn = 'safe_backup_btn'; act = 'safebackup'; }
  else if ('Notification' in window && Notification.permission === 'default' && !S.settings.notify && (S.reminders.length || S.birthdays.length)) { key = 'safe_notif'; btn = 'safe_notif_btn'; act = 'notif'; }
  if (!key) return;
  const el = document.createElement('div'); el.id = 'safeBar'; el.className = 'update safe'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${_t(key)}</span>${btn ? `<button type="button" data-act="${act}">${_t(btn)}</button>` : ''}<button type="button" class="x" data-act="safeclose" aria-label="Close">×</button>`;
  document.body.appendChild(el);
}
setTimeout(safeNotice, 3500);

/* ═══ 12 · boot ═══════════════════════════════════════════════════════ */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { lastHidden = Date.now(); return; }
  if (lsGet(PIN_KEY) && lastHidden && Date.now() - lastHidden > 5 * 60000 && !document.documentElement.dataset.locked) lockApp();
  lastHidden = 0;
  ensureRecurring(); render(); check();
});
let lastHidden = 0;
setInterval(check, 30000);

if (navigator.storage && navigator.storage.persist && !S.settings.storePersisted) {
  navigator.storage.persist().then(g => { if (g) { S.settings.storePersisted = true; persist(); } }).catch(() => {});
}

if (!lsGet(KEY)) idbRun('readonly', st => st.get('data')).then(raw => {
  if (typeof raw !== 'string' || lsGet(KEY)) return;
  try {
    const d = clean(JSON.parse(raw));
    if (!['expenses', 'reminders', 'birthdays', 'study', 'exams', 'todos', 'memories'].some(k => d[k].length)) return;
    S = d; persist(); applyTheme(S.settings.theme); render(); toast(_t('safe_restored'), {ms: 7000});
  } catch (e) {}
});

applyTheme(S.settings.theme);
{ const sv = lsGet('myday:lang'); if (sv === 'si' || sv === 'en') S.settings.lang = sv; }   // an explicit choice always wins
if (!lsGet('myday:lang') && S.settings.lang !== 'en') { S.settings.lang = 'en'; if (S.settings.cur === 'රු.') S.settings.cur = 'Rs.'; persist(); }   // never chose a language → new default is English
if (S.settings.lang !== window.L.lang) { window.L.lang = S.settings.lang; document.documentElement.lang = S.settings.lang; lsSet('myday:lang', S.settings.lang); }
if (S.settings.lang === 'en' && S.settings.cur === 'රු.') S.settings.cur = 'Rs.'; else if (S.settings.lang === 'si' && S.settings.cur === 'Rs.') S.settings.cur = 'රු.';
buildLock();
if (!lsGet(PIN_KEY)) delete document.documentElement.dataset.locked;
ensureRecurring();


/* chat composer (lives outside #view so a half-typed message survives re-renders) */
{
  const inp = $('#chatInput'), form = $('#composer');
  const fit = () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 120) + 'px'; };
  inp.addEventListener('input', fit);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', e => { e.preventDefault(); const v = inp.value; inp.value = ''; fit(); chatSend(v); });
}

function finishPreload() {
  const p = document.getElementById('preloader'); if (!p) return;
  setTimeout(() => { p.classList.add('done'); setTimeout(() => { if (p.parentNode) p.remove(); }, 700); }, Math.max(0, 850 - performance.now()));
}

/* PWA shortcuts / deep links: ?action=exp|rem|study|bday|exam|timer  &  ?tab=spend … */
(function deepLink() {
  const p = new URLSearchParams(location.search), a = p.get('action'), tb = p.get('tab');
  if (tb && VIEWS[tb]) tab = tb;
  render(); check(); finishPreload();
  if (a || tb) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  if (document.documentElement.dataset.locked) return;
  if (a && FORMS[a]) setTimeout(() => formSheet(a), 80);
  else if (a === 'timer') { tab = 'study'; render(); }
})();

})();
