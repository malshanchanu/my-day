(() => {
'use strict';

const KEY = 'myday:data';
const SCHEMA_VERSION = 1;

/* ── i18n helpers ─────────────────────────────────────────────────────── */
const _t = typeof window.t === 'function' ? window.t : function(k){ return k; };

/* Dynamic label arrays — re-read on every call so language switch works */
function MON() { return window.L.strings[window.L.lang].months; }
function DAY() { return window.L.strings[window.L.lang].days; }
function CATS() {
  return [
    ['food',   _t('cat_food'),   '#EF5D7A'],
    ['trans',  _t('cat_trans'),  '#4B4FE0'],
    ['bill',   _t('cat_bill'),   '#F2B33D'],
    ['learn',  _t('cat_learn'),  '#1FB58A'],
    ['health', _t('cat_health'), '#8A5CF6'],
    ['fun',    _t('cat_fun'),    '#FF8A4C'],
    ['other',  _t('cat_other'), '#8087A8']
  ];
}
function REP() {
  return [
    ['none',    _t('rep_none')],
    ['daily',   _t('rep_daily')],
    ['weekly',  _t('rep_weekly')],
    ['monthly', _t('rep_monthly')]
  ];
}
function KINDS() {
  return [
    ['study', _t('kind_study')],
    ['pay',   _t('kind_pay')],
    ['task',  _t('kind_task')]
  ];
}
function SNOOZE() {
  return [
    ['10m', _t('snooze_10m')],
    ['1h',  _t('snooze_1h')],
    ['tom', _t('snooze_tom')]
  ];
}

const KEYS = {exp:'expenses', rem:'reminders', bday:'birthdays'};
const $  = s => document.querySelector(s);

// XSS-safe HTML escape
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
// Parse YYYY-MM-DD in LOCAL time (avoids UTC midnight offset)
const parse = s => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Longer uid to reduce collision probability
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const money = n => S.settings.cur + ' ' + Number(n).toLocaleString('en-US', {maximumFractionDigits:2});
const sum  = a => a.reduce((t, x) => t + (+x.amount), 0);

let S = read(), tab = 'today', month = ymd(new Date()).slice(0, 7), deferred = null;
let spendSearch = '';

/* ── Schema migration ──────────────────────────────────────────────── */
function migrate(data) {
  if (!data) return blank();
  /* Accept old PHP-server export (no version field, but has expenses/reminders/birthdays) */
  if (!data.version && (data.expenses || data.reminders || data.birthdays)) {
    data.version = 1;
  }
  /* Future: add upgrade steps here for version > 1 */
  return data;
}

/* ── defaults with all settings fields ──────────────────────────────── */
function blank() {
  return {version: SCHEMA_VERSION,
          expenses:[], reminders:[], birthdays:[], tombstones:[],
          settings:{budget:0, cur:'රු.', notify:false, lang:'si', theme:'auto', updatedAt:0,
                    lastBackupAt:0, storePersisted:false}, updated:0};
}

/* ── merge settings field-by-field with defaults so old data keeps working */
function mergeSettingsDefaults(settings) {
  var def = blank().settings;
  var out = {};
  Object.keys(def).forEach(function(k) {
    out[k] = (settings && settings[k] !== undefined && settings[k] !== null) ? settings[k] : def[k];
  });
  /* carry over any extra keys from settings */
  if (settings) {
    Object.keys(settings).forEach(function(k) {
      if (!(k in out)) out[k] = settings[k];
    });
  }
  return out;
}

function read() {
  try {
    var s = JSON.parse(localStorage.getItem(KEY));
    if (s && (s.expenses || s.reminders || s.birthdays || s.settings)) {
      s = migrate(s);
      s.settings = mergeSettingsDefaults(s.settings);
      s.tombstones = s.tombstones || [];
      return s;
    }
  } catch (e) {}
  return blank();
}

/* ── Safe persist — stringify first, only write on success ──────────── */
function persist() {
  try {
    var str = JSON.stringify(S);
    localStorage.setItem(KEY, str);
  } catch (e) {
    /* Quota exceeded or private browsing — show visible error */
    var msg = _t('err_storage_full');
    var banner = document.getElementById('storageErr');
    if (banner) { banner.textContent = msg; banner.style.display = ''; }
    else { alert(msg); }
  }
}
function commit() { S.updated = Date.now(); persist(); render(); }

/* ── theme management ───────────────────────────────────────────────── */
function applyTheme(th) {
  if (th !== 'light' && th !== 'dark') th = 'auto';
  var el = document.documentElement;
  if (th === 'auto') { delete el.dataset.theme; } else { el.dataset.theme = th; }
  try { localStorage.setItem('myday:theme', th); } catch (e) {}
  var mc = document.querySelector('meta[name="theme-color"]');
  if (mc) {
    var isDark = (th === 'dark') || (th === 'auto' && window.matchMedia('(prefers-color-scheme:dark)').matches);
    mc.content = isDark ? '#2A2F8F' : '#1B1F5C';
  }
  /* update header theme button icon */
  var btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = th === 'dark' ? '☽' : th === 'light' ? '☀' : '◑';
}

function getTheme() { return S.settings.theme || localStorage.getItem('myday:theme') || 'auto'; }

/* apply theme on boot (also handled by inline script in <head>, but re-sync here) */
applyTheme(getTheme());

/* ── Per-record merge (kept for Import Merge) ────────────────────────── */
function mergeData(local, remote) {
  if (!remote) return local;
  var merged = JSON.parse(JSON.stringify(local));
  var remTombs = remote.tombstones || [];
  var locTombs = local.tombstones  || [];
  var tombMap = {};
  locTombs.forEach(function(t) { tombMap[t.id] = t; });
  remTombs.forEach(function(t) { if (!tombMap[t.id] || t.deletedAt > tombMap[t.id].deletedAt) tombMap[t.id] = t; });
  merged.tombstones = Object.keys(tombMap).map(function(id) { return tombMap[id]; });

  ['expenses','reminders','birthdays'].forEach(function(col) {
    var locMap = {}, remMap = {};
    (local[col]  || []).forEach(function(r) { locMap[r.id] = r; });
    (remote[col] || []).forEach(function(r) { remMap[r.id] = r; });
    var ids = {};
    Object.keys(locMap).forEach(function(id) { ids[id] = 1; });
    Object.keys(remMap).forEach(function(id) { ids[id] = 1; });
    merged[col] = Object.keys(ids).map(function(id) {
      if (tombMap[id]) return null;
      var l = locMap[id], r = remMap[id];
      if (!l) return r;
      if (!r) return l;
      return ((l.updatedAt || 0) >= (r.updatedAt || 0)) ? l : r;
    }).filter(function(x) { return x !== null; });
  });

  /* merge settings field-by-field, then pick newer updatedAt winner */
  var remSetAt = (remote.settings && remote.settings.updatedAt) || 0;
  var locSetAt = (local.settings  && local.settings.updatedAt)  || 0;
  if (remSetAt > locSetAt) {
    merged.settings = mergeSettingsDefaults(remote.settings);
  } else {
    merged.settings = mergeSettingsDefaults(local.settings);
  }
  return merged;
}

function stampRecord(d) { d.updatedAt = Date.now(); return d; }

/* ── reminder + birthday logic ──────────────────────────────────────── */
function occurs(r, d) {
  if (d < r.date) return false;
  var a = parse(r.date), b = parse(d);
  if (r.repeat === 'daily') return true;
  if (r.repeat === 'weekly') return a.getDay() === b.getDay();
  if (r.repeat === 'monthly') {
    var originDay = a.getDate();
    var lastDay   = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
    return b.getDate() === Math.min(originDay, lastDay);
  }
  return r.date === d;
}

function isDue(r, t) {
  return r.repeat === 'none' ? !r.done && r.date <= t : occurs(r, t) && r.lastDone !== t;
}

function nextDate(r, t) {
  if (r.repeat === 'none') return r.date;
  var start = r.date > t ? r.date : t;
  for (var i = 0; i < 400; i++) {
    var d = ymd(addDays(parse(start), i));
    if (occurs(r, d)) return d;
  }
  return r.date;
}

function when(d, t) {
  var n = Math.round((parse(d) - parse(t)) / 864e5);
  if (n === 0) return _t('when_today');
  if (n === 1) return _t('when_tomorrow');
  if (n < 0)   return Math.abs(n) === 1 ? _t('when_yesterday_late') : _t('when_days_late', {n: Math.abs(n)});
  return MON()[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8));
}

function upcoming(limit) {
  var t = new Date(), t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return S.birthdays.map(function(b) {
    var p = b.date.split('-');
    var mon = +p[1] - 1, day = +p[2];
    var maxDay = new Date(t0.getFullYear(), mon + 1, 0).getDate();
    day = Math.min(day, maxDay);
    var n = new Date(t0.getFullYear(), mon, day);
    if (n < t0) {
      var maxDayNext = new Date(t0.getFullYear() + 1, mon + 1, 0).getDate();
      n = new Date(t0.getFullYear() + 1, mon, Math.min(+p[2], maxDayNext));
    }
    return {b:b, days:Math.round((n - t0) / 864e5), age:n.getFullYear() - +p[0]};
  }).filter(function(x) { return x.days <= limit; })
    .sort(function(a, b) { return a.days - b.days; });
}

/* ── views ──────────────────────────────────────────────────────────── */
const cat = k => CATS().find(c => c[0] === k) || CATS()[6];

const remRow = (r, t) => {
  var kk = KINDS().find(k => k[0] === (r.kind || 'task')) || KINDS()[2];
  return `<li class="row"><button class="chk ${r.done ? 'on' : ''}" data-act="done" data-id="${r.id}" aria-label="${_t('aria_done')}"></button>
  <div class="grow"><b>${esc(r.title)}</b><small><span class="tag">${kk[1]}</span>${r.date < t && r.repeat === 'none' && !r.done ? `<i class="late">${_t('late')}</i>` : ''}${esc(r.time || '')}</small></div>
  <button class="ghost" data-act="snooze" data-id="${r.id}" aria-label="${_t('aria_snooze')}" title="Snooze">⏱</button>
  <button class="ghost" data-act="edit" data-t="rem" data-id="${r.id}" aria-label="${_t('aria_edit')}">⋯</button></li>`;
};

const bdRow = x => `<li><button class="row" data-act="edit" data-t="bday" data-id="${x.b.id}"><span class="av">${esc([...x.b.name][0] || '?')}</span>
  <span class="grow"><b>${esc(x.b.name)}</b><small>${x.age > 0 && x.age < 120 ? _t('bday_nth', {n: x.age}) : ''}</small></span>
  <span class="amt">${x.days === 0 ? _t('bday_today') : x.days === 1 ? _t('bday_tomorrow') : _t('bday_days', {n: x.days})}</span></button></li>`;

function vToday() {
  var t = ymd(new Date()), m = t.slice(0, 7);
  var spent = sum(S.expenses.filter(x => x.date.slice(0, 7) === m));
  var today  = sum(S.expenses.filter(x => x.date === t));
  var bud = +S.settings.budget || 0, pct = bud ? Math.min(spent / bud, 1) : 0, C = 2 * Math.PI * 46;
  var due = S.reminders.filter(r => isDue(r, t)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  var bd  = upcoming(30).slice(0, 4);
  var monName = MON()[+m.slice(5) - 1];
  return `<section class="hero"><div><p class="lbl">${_t('h_month_spend', {mon: monName})}</p><p class="big">${money(spent)}</p>
    <p class="sub">${_t('today_today_spend', {amt: money(today)})}</p>${bud ? '' : `<p class="sub">${_t('today_set_budget')}</p>`}</div>
    <svg class="ring" viewBox="0 0 110 110" role="img" aria-label="${_t('ring_aria')}"><circle class="rt" cx="55" cy="55" r="46"/><circle class="rf" cx="55" cy="55" r="46" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 55 55)"/><text x="55" y="62" text-anchor="middle">${bud ? Math.round(spent / bud * 100) + '%' : '–'}</text></svg></section>
    <h2>${_t('h_today_tasks')}</h2>
    ${due.length ? `<ul class="list">${due.map(r => remRow(r, t)).join('')}</ul>` : `<p class="empty">${_t('empty_today')}</p>`}
    <h2>${_t('h_upcoming_bdays')}</h2>
    ${bd.length ? `<ul class="list">${bd.map(bdRow).join('')}</ul>` : `<p class="empty">${_t('empty_upcoming_bdays')}</p>`}`;
}

function vSpend() {
  var allMonth = S.expenses.filter(x => x.date.slice(0, 7) === month);
  var q = spendSearch.trim().toLowerCase();
  var list = q ? allMonth.filter(x => (x.note || '').toLowerCase().includes(q) || (cat(x.cat)[1]).toLowerCase().includes(q)) : allMonth;
  list = list.slice().sort((a, b) => b.date.localeCompare(a.date));

  var total = 0, by = {}, groups = {};
  list.forEach(x => {
    total += +x.amount;
    by[x.cat] = (by[x.cat] || 0) + +x.amount;
    (groups[x.date] = groups[x.date] || []).push(x);
  });

  var prevMonth = ymd(new Date(+parse(month + '-01') - 1)).slice(0, 7);
  var prevTotal = sum(S.expenses.filter(x => x.date.slice(0, 7) === prevMonth));
  var diff = total - prevTotal;
  var diffText = prevTotal ? _t('diff_text', {dir: (diff >= 0 ? '▲' : '▼'), amt: money(Math.abs(diff))}) : '';

  return `<div class="month"><button class="icon" data-act="mo" data-n="-1" aria-label="${_t('prev_mon_aria')}">‹</button><b>${month.slice(0,4)} ${MON()[+month.slice(5)-1]}</b><button class="icon" data-act="mo" data-n="1" aria-label="${_t('next_mon_aria')}">›</button></div>
  <div class="hero"><div><p class="lbl">${_t('h_month_total')}</p><p class="big">${money(total)}</p>${diffText ? `<p class="sub">${esc(diffText)}</p>` : ''}</div></div>
  <div class="searchbox"><input id="spendSearch" type="search" placeholder="${_t('search_placeholder')}" value="${esc(q)}" aria-label="${_t('search_aria')}" maxlength="80"></div>
  ${total ? `<h2>${_t('h_by_cat')}</h2><div class="card">${CATS().filter(c => by[c[0]]).sort((a, b) => by[b[0]] - by[a[0]]).map(c =>
    `<div class="bar"><span>${c[1]}</span><div class="trk"><i style="width:${by[c[0]]/total*100}%;background:${c[2]}"></i></div><b>${money(by[c[0]])}</b></div>`).join('')}</div>` : ''}
  ${Object.keys(groups).map(d => `<div class="day"><span>${parse(d).getDate()} ${DAY()[parse(d).getDay()]}</span><span>${money(sum(groups[d]))}</span></div><ul class="list">${groups[d].map(x =>
    `<li><button class="row" data-act="edit" data-t="exp" data-id="${x.id}"><span class="dot" style="background:${cat(x.cat)[2]}"></span><span class="grow"><b>${esc(x.note || cat(x.cat)[1])}</b>${x.note ? `<small>${cat(x.cat)[1]}</small>` : ''}${x.recurring && x.recurring !== 'none' ? `<small class="tag">↻</small>` : ''}</span><span class="amt">${money(x.amount)}</span></button></li>`).join('')}</ul>`).join('')}
  ${list.length ? '' : `<p class="empty">${_t('empty_spend')}</p>`}`;
}

function vRemind() {
  var t = ymd(new Date());
  var act  = S.reminders.filter(r => r.repeat !== 'none' || !r.done);
  var done = S.reminders.filter(r => r.repeat === 'none' && r.done);
  act.sort((a, b) => nextDate(a, t).localeCompare(nextDate(b, t)));
  return `<h2 style="margin-top:0">${_t('h_reminders')}</h2>${act.length ? `<ul class="list">${act.map(r => {
    var kk = KINDS().find(k => k[0] === (r.kind || 'task')) || KINDS()[2];
    var rr  = REP().find(x => x[0] === r.repeat);
    return `<li class="row"><button class="chk" data-act="done" data-id="${r.id}" aria-label="${_t('aria_done')}"></button>
    <div class="grow"><b>${esc(r.title)}</b><small><span class="tag">${kk[1]}</span>${when(nextDate(r, t), t)} ${esc(r.time || '')} ${r.repeat !== 'none' ? '(' + (rr ? rr[1] : r.repeat) + ')' : ''}</small></div>
    <button class="ghost" data-act="snooze" data-id="${r.id}" aria-label="${_t('aria_snooze')}" title="Snooze">⏱</button>
    <button class="ghost" data-act="edit" data-t="rem" data-id="${r.id}" aria-label="${_t('aria_edit')}">⋯</button></li>`;
  }).join('')}</ul>` : `<p class="empty">${_t('empty_reminders')}</p>`}
  ${done.length ? `<h2>${_t('h_done')}</h2><ul class="list">${done.map(r => remRow(r, t)).join('')}</ul>` : ''}`;
}

function vBday() {
  var l = upcoming(366);
  return `<h2 style="margin-top:0">${_t('h_birthdays')}</h2>${l.length ? `<ul class="list">${l.map(bdRow).join('')}</ul>` : `<p class="empty">${_t('empty_bdays')}</p>`}`;
}

/* ── Storage info helper ───────────────────────────────────────────── */
function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function vSet() {
  var st  = S.settings;
  var th  = st.theme  || 'auto';
  var lng = st.lang   || 'si';

  /* Last backup info */
  var lastBk = st.lastBackupAt ? (new Date(st.lastBackupAt)).toLocaleDateString() : _t('backup_never');

  /* Storage estimate (async, filled in later if available) */
  var storageHtml = `<p id="storageInfo" class="mut" style="font-size:12px">${_t('storage_loading')}</p>`;

  return `<h2 style="margin-top:0">${_t('h_settings')}</h2><div class="set">
  <label>${_t('set_budget')}<input type="number" min="0" step="1" inputmode="numeric" value="${st.budget || ''}" data-set="budget"></label>
  <label>${_t('set_cur')}<input value="${esc(st.cur)}" maxlength="6" data-set="cur"></label>
  <label>${_t('set_lang')}<select data-set="lang">
    <option value="si"${lng === 'si' ? ' selected' : ''}>සිංහල</option>
    <option value="en"${lng === 'en' ? ' selected' : ''}>English</option>
  </select></label>
  <label>${_t('set_theme')}<select data-set="theme">
    <option value="auto"${th === 'auto'  ? ' selected' : ''}>${_t('theme_auto')}</option>
    <option value="light"${th === 'light' ? ' selected' : ''}>${_t('theme_light')}</option>
    <option value="dark"${th === 'dark'  ? ' selected' : ''}>${_t('theme_dark')}</option>
  </select></label>
  <button class="sec" data-act="notif">${st.notify ? _t('btn_notif_off') : _t('btn_notif_on')}</button>
  ${deferred ? `<button class="sec" data-act="install">${_t('btn_install')}</button>` : ''}
  <hr style="border:none;border-top:1px solid var(--line);margin:4px 0">
  <p style="font-size:13px;color:var(--mut);margin:0">${_t('backup_last')}: <b>${lastBk}</b></p>
  <button class="sec" data-act="export">${_t('btn_export')}</button>
  <button class="sec" data-act="import">${_t('btn_import')}</button>
  ${storageHtml}
  <hr style="border:none;border-top:1px solid var(--line);margin:4px 0">
  <button class="sec" data-act="pinset">${st.pinHash ? _t('btn_pin_change') : _t('btn_pin_set')}</button>
  ${st.pinHash ? `<button class="sec" data-act="pinremove">${_t('btn_pin_remove')}</button>` : ''}
  <hr style="border:none;border-top:1px solid var(--line);margin:4px 0">
  <button class="sec rose" data-act="cleardata">${_t('btn_clear_data')}</button>
  </div>`;
}

/* Load storage estimate after vSet renders */
function loadStorageInfo() {
  var el = document.getElementById('storageInfo');
  if (!el) return;
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(function(est) {
      if (!el.isConnected) return;
      var used = fmtBytes(est.usage || 0);
      var quota = fmtBytes(est.quota || 0);
      el.textContent = _t('storage_used') + ': ' + used + ' / ' + quota;
    }).catch(function() { el.textContent = ''; });
  } else {
    el.textContent = '';
  }
}

/* ── FORMS (dynamic so labels translate) ─────────────────────────────── */
function getForms() {
  return {
    exp:{title:'add_exp', req:['amount','date'],
      def:() => ({amount:'',cat:'food',note:'',date:ymd(new Date()),recurring:'none'}),
      fields:() => [
        ['amount', _t('fld_amount'), 'number'],
        ['cat',    _t('fld_cat'),    'select', CATS().map(c => [c[0], c[1]])],
        ['note',   _t('fld_note'),   'text'],
        ['date',   _t('fld_date'),   'date'],
        ['recurring', _t('fld_recurring'), 'select', REP().map(r => [r[0], r[1]])]
      ]},
    rem:{title:'add_rem', req:['title','date'],
      def:() => ({title:'',kind:'study',date:ymd(new Date()),time:'',repeat:'none'}),
      fields:() => [
        ['title',  _t('fld_title'),  'text'],
        ['kind',   _t('fld_kind'),   'select', KINDS()],
        ['date',   _t('fld_date'),   'date'],
        ['time',   _t('fld_time'),   'time'],
        ['repeat', _t('fld_repeat'), 'select', REP()]
      ]},
    bday:{title:'add_bday', req:['name','date'],
      def:() => ({name:'',date:''}),
      fields:() => [
        ['name', _t('fld_name'),  'text'],
        ['date', _t('fld_bdate'), 'date']
      ]}
  };
}

/* ── render ──────────────────────────────────────────────────────────── */
function render() {
  var h = new Date().getHours(), n = new Date();
  var greet = h < 12 ? _t('greet_morn') : h < 17 ? _t('greet_day') : _t('greet_eve');
  $('#hi').textContent  = greet;
  $('#dt').textContent  = n.getFullYear() + ' ' + MON()[n.getMonth()] + ' ' + n.getDate() + ', ' + DAY()[n.getDay()];
  $('#view').innerHTML  = {today:vToday, spend:vSpend, remind:vRemind, bday:vBday, set:vSet}[tab]();
  document.querySelectorAll('.nav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));

  /* update nav labels */
  var navMap = {today:'tab_today', spend:'tab_spend', remind:'tab_remind', bday:'tab_bday'};
  document.querySelectorAll('.nav [data-tab]').forEach(function(btn) {
    var key = navMap[btn.dataset.tab];
    if (key) {
      /* text node after SVG */
      var nodes = Array.from(btn.childNodes);
      var txt = nodes.find(function(nd){ return nd.nodeType === 3; });
      if (txt) txt.nodeValue = _t(key);
    }
  });

  /* Last backup indicator */
  var lbEl = document.getElementById('lastBackup');
  if (lbEl) {
    var lb = S.settings.lastBackupAt;
    lbEl.textContent = lb ? _t('backup_last') + ': ' + (new Date(lb)).toLocaleDateString() : '';
    lbEl.title = lb ? (new Date(lb)).toISOString() : '';
  }

  /* update header buttons */
  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = _t('lang_toggle');
  applyTheme(getTheme());

  /* load storage info if settings view */
  if (tab === 'set') setTimeout(loadStorageInfo, 0);

  /* search input */
  var si = $('#spendSearch');
  if (si) si.addEventListener('input', function(e) { spendSearch = e.target.value; render(); });

  /* backup reminder banner */
  checkBackupReminder();
}
/* expose for i18n.js to call after setLang */
window.renderApp = render;

/* ── Backup reminder banner ─────────────────────────────────────────── */
function checkBackupReminder() {
  var banner = document.getElementById('backupBanner');
  if (!banner) return;
  var totalRecords = S.expenses.length + S.reminders.length + S.birthdays.length;
  if (totalRecords < 10) { banner.style.display = 'none'; return; }
  var lb = S.settings.lastBackupAt || 0;
  var daysSince = lb ? Math.floor((Date.now() - lb) / 864e5) : Infinity;
  if (!lb || daysSince > 30) {
    banner.style.display = '';
    banner.innerHTML = `<span>${_t('backup_reminder')}</span> <button class="chip" data-act="export">${_t('btn_export')}</button>`;
  } else {
    banner.style.display = 'none';
  }
}

/* ── sheet (add / edit) ──────────────────────────────────────────────── */
function openSheet(html) {
  var sh = $('#ov .sheet');
  sh.innerHTML = html;
  $('#ov').classList.add('on');
  var i = sh.querySelector('input,select,button:not(.del)');
  if (i) i.focus();
  trapFocus(sh);
}
function closeSheet() { $('#ov').classList.remove('on'); releaseTrap(); }

var trapHandler = null;
function trapFocus(el) {
  releaseTrap();
  trapHandler = function(e) {
    if (e.key !== 'Tab') return;
    var focusable = Array.from(el.querySelectorAll('a,button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
    else            { if (document.activeElement === last)  { first.focus(); e.preventDefault(); } }
  };
  document.addEventListener('keydown', trapHandler);
}
function releaseTrap() {
  if (trapHandler) { document.removeEventListener('keydown', trapHandler); trapHandler = null; }
}

function sheet(type, id) {
  var F = getForms()[type];
  var it = id ? S[KEYS[type]].find(x => x.id === id) : null;
  var v  = it || F.def();
  var MAXLEN = {text:200, number:'', date:'', time:'', select:''};
  var f = F.fields().map(function([k, l, tp, o]) {
    return `<label>${l}${tp === 'select'
      ? `<select name="${k}">${o.map(([a, b]) => `<option value="${a}"${v[k] === a ? ' selected' : ''}>${b}</option>`).join('')}</select>`
      : `<input name="${k}" type="${tp}" value="${esc(v[k])}" ${tp === 'number' ? 'step="0.01" min="0" inputmode="decimal"' : ''} ${F.req.includes(k) ? 'required' : ''} ${MAXLEN[tp] ? 'maxlength="' + MAXLEN[tp] + '"' : ''}>`}</label>`;
  }).join('');
  var titleKey = F.title;
  openSheet(`<form id="f" data-t="${type}" data-id="${id || ''}"><h2 id="sheet-title">${_t(titleKey)} ${it ? _t('edit_suffix') : _t('add_suffix')}</h2>${f}
    <div class="acts">${it ? `<button type="button" class="del" data-act="del" data-t="${type}" data-id="${id}">${_t('btn_delete')}</button>` : ''}<button class="pri">${_t('btn_save')}</button></div></form>`);
}

function chooser() {
  openSheet(`<h2 id="sheet-title">${_t('h_add_what')}</h2><div class="pick"><button class="sec" data-act="add" data-t="exp">${_t('add_exp')}</button><button class="sec" data-act="add" data-t="rem">${_t('add_rem')}</button><button class="sec" data-act="add" data-t="bday">${_t('add_bday')}</button></div>`);
}

function snoozeSheet(id) {
  openSheet(`<h2 id="sheet-title">${_t('h_snooze')}</h2><div class="pick">
    ${SNOOZE().map(([v, l]) => `<button class="sec" data-act="dosnooze" data-id="${id}" data-sv="${v}">${l}</button>`).join('')}
    <button class="sec" data-act="close">${_t('btn_cancel')}</button></div>`);
}

/* ── PIN lock ────────────────────────────────────────────────────────── */
var PIN_KEY   = 'myday:pin';
var PIN_ATT   = 'myday:pin:attempts';
var PIN_SALT  = 'myday-pin-v1:';
var PIN_LOCKED = false;

function hashPIN(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(PIN_SALT + pin);
  return crypto.subtle.digest('SHA-256', data).then(function(buf) {
    return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
  });
}

function getPINAttempts() {
  try { return JSON.parse(localStorage.getItem(PIN_ATT)) || {count:0, lastAt:0}; } catch(e) { return {count:0, lastAt:0}; }
}
function setPINAttempts(obj) {
  try { localStorage.setItem(PIN_ATT, JSON.stringify(obj)); } catch(e) {}
}

function pinLockScreen() {
  PIN_LOCKED = true;
  var app = document.querySelector('.app');
  var nav = document.querySelector('.nav');
  var ov  = document.getElementById('ov');
  if (app) app.style.display = 'none';
  if (nav) nav.style.display = 'none';
  if (ov)  ov.style.display  = 'none';

  var ls = document.getElementById('lockScreen');
  if (!ls) {
    ls = document.createElement('div');
    ls.id = 'lockScreen';
    ls.className = 'lock-screen';
    document.body.appendChild(ls);
  }
  var att = getPINAttempts();
  var wait = 0;
  if (att.count >= 5) {
    wait = Math.min(Math.pow(2, att.count - 4) * 30, 300); /* 30s, 60s, 120s, 300s max */
    var elapsed = Math.floor((Date.now() - att.lastAt) / 1000);
    wait = Math.max(0, wait - elapsed);
  }
  ls.innerHTML =
    '<div class="lock-box">' +
      '<div class="lock-icon">🔒</div>' +
      '<h2>' + _t('pin_enter') + '</h2>' +
      (wait > 0 ? '<p class="pin-wait" id="pinWait">' + _t('pin_too_many') + '</p>' : '') +
      '<input id="pinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••" autocomplete="current-password" ' + (wait > 0 ? 'disabled' : '') + '>' +
      '<p id="pinErr" class="pin-err" style="display:none"></p>' +
      '<button id="pinForgot" class="sec" style="margin-top:16px">' + _t('pin_forgot') + '</button>' +
    '</div>';
  ls.style.display = 'flex';

  if (wait > 0) {
    var waitEl = document.getElementById('pinWait');
    var inp    = document.getElementById('pinInput');
    var iv = setInterval(function() {
      wait--;
      if (wait <= 0) { clearInterval(iv); if (waitEl) waitEl.remove(); if (inp) inp.disabled = false; inp.focus(); }
      else if (waitEl) waitEl.textContent = _t('pin_too_many') + ' (' + wait + 's)';
    }, 1000);
  } else {
    setTimeout(function() { var i = document.getElementById('pinInput'); if (i) i.focus(); }, 50);
  }

  var pinInput = document.getElementById('pinInput');
  if (pinInput) {
    pinInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') verifyPIN(pinInput.value);
    });
    pinInput.addEventListener('input', function() {
      var errEl = document.getElementById('pinErr');
      if (errEl) errEl.style.display = 'none';
    });
  }
  var forgotBtn = document.getElementById('pinForgot');
  if (forgotBtn) forgotBtn.addEventListener('click', pinForgotFlow);
}

function verifyPIN(entered) {
  var stored = localStorage.getItem(PIN_KEY);
  if (!stored) { unlockApp(); return; }
  hashPIN(entered).then(function(h) {
    if (h === stored) {
      setPINAttempts({count:0, lastAt:0});
      unlockApp();
    } else {
      var att = getPINAttempts();
      att.count++; att.lastAt = Date.now();
      setPINAttempts(att);
      var errEl = document.getElementById('pinErr');
      if (errEl) {
        var remaining = Math.max(0, 5 - att.count);
        errEl.textContent = _t('pin_wrong') + (remaining > 0 ? ' (' + remaining + ')' : '');
        errEl.style.display = '';
      }
      if (att.count >= 5) pinLockScreen(); /* re-render with timeout */
    }
  });
}

function unlockApp() {
  PIN_LOCKED = false;
  var ls = document.getElementById('lockScreen');
  if (ls) ls.style.display = 'none';
  var app = document.querySelector('.app');
  var nav = document.querySelector('.nav');
  var ov  = document.getElementById('ov');
  if (app) app.style.display = '';
  if (nav) nav.style.display = '';
  if (ov)  ov.style.display  = '';
}

function pinForgotFlow() {
  openSheet(
    '<h2 id="sheet-title">' + _t('pin_forgot') + '</h2>' +
    '<p style="color:var(--mut);font-size:14px">' + _t('pin_forgot_explain') + '</p>' +
    '<div class="acts">' +
      '<button class="del" data-act="close">' + _t('btn_cancel') + '</button>' +
      '<button class="pri" data-act="pinforgotconfirm">' + _t('btn_clear_data') + '</button>' +
    '</div>'
  );
  /* Make lock screen visible behind sheet if on lock screen */
  var ls = document.getElementById('lockScreen');
  if (ls) {
    ls.style.display = 'flex';
    var app = document.querySelector('.app');
    var nav = document.querySelector('.nav');
    if (app) app.style.display = 'none';
    if (nav) nav.style.display = 'none';
  }
}

function openPINSetSheet(isChange) {
  openSheet(
    '<form id="f" data-t="pinset"><h2 id="sheet-title">' + _t(isChange ? 'pin_change' : 'pin_set') + '</h2>' +
    (isChange ? '<label>' + _t('pin_old') + '<input name="old" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password"></label>' : '') +
    '<label>' + _t('pin_new') + '<input name="new1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" required autocomplete="new-password"></label>' +
    '<label>' + _t('pin_confirm') + '<input name="new2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" required autocomplete="new-password"></label>' +
    '<p style="font-size:12px;color:var(--mut);margin:4px 0 8px">' + _t('pin_note') + '</p>' +
    '<div class="acts"><button class="pri">' + _t('btn_save') + '</button></div></form>'
  );
}

/* ── Export / Import ─────────────────────────────────────────────────── */
function doExport() {
  var payload = {version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: S};
  var str = JSON.stringify(payload, null, 2);
  var u = URL.createObjectURL(new Blob([str], {type:'application/json'}));
  var l = document.createElement('a');
  l.href = u; l.download = 'my-day-' + ymd(new Date()) + '.json'; l.click();
  URL.revokeObjectURL(u);
  S.settings.lastBackupAt = Date.now();
  commit();
}

function doImport() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', function() {
    var file = inp.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        var importData;
        /* Accept new format {version, exportedAt, data} or old PHP format (raw data object) */
        if (parsed.data && (parsed.data.expenses || parsed.data.reminders || parsed.data.birthdays)) {
          importData = migrate(parsed.data);
        } else if (parsed.expenses || parsed.reminders || parsed.birthdays) {
          importData = migrate(parsed); /* old PHP format */
        } else {
          alert(_t('import_invalid'));
          return;
        }
        importData.settings = mergeSettingsDefaults(importData.settings);
        importData.tombstones = importData.tombstones || [];
        /* Show preview */
        var exp  = (importData.expenses  || []).length;
        var rem  = (importData.reminders || []).length;
        var bday = (importData.birthdays || []).length;
        openSheet(
          '<h2 id="sheet-title">' + _t('import_preview_title') + '</h2>' +
          '<div class="card" style="margin:12px 0;font-size:14px">' +
            '<p>' + _t('fld_amount') + '/' + _t('tab_spend') + ': <b>' + exp + '</b></p>' +
            '<p>' + _t('tab_remind') + ': <b>' + rem + '</b></p>' +
            '<p>' + _t('tab_bday') + ': <b>' + bday + '</b></p>' +
          '</div>' +
          '<p style="font-size:13px;color:var(--mut)">' + _t('import_choose') + '</p>' +
          '<div class="acts" id="importActs">' +
            '<button class="sec" id="importReplace">' + _t('import_replace') + '</button>' +
            '<button class="pri" id="importMerge">' + _t('import_merge') + '</button>' +
          '</div>'
        );
        document.getElementById('importReplace').addEventListener('click', function() {
          S = importData;
          commit();
          closeSheet();
          alert(_t('import_ok'));
        });
        document.getElementById('importMerge').addEventListener('click', function() {
          S = mergeData(S, importData);
          S.updated = Date.now();
          commit();
          closeSheet();
          alert(_t('import_ok'));
        });
      } catch (err) {
        alert(_t('import_invalid'));
      }
    };
    reader.readAsText(file);
  });
  inp.click();
}

/* ── events ──────────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  /* PIN input submit via button click on lock screen */
  if (e.target && e.target.id === 'pinInput') return;
  if (PIN_LOCKED && e.target && e.target.id !== 'pinForgot' && !e.target.closest('#ov')) {
    var inp = document.getElementById('pinInput');
    if (inp && !inp.disabled) verifyPIN(inp.value);
    return;
  }

  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.id === 'ov' && e.target !== el) return;
  const a = el.dataset.act, id = el.dataset.id, t = el.dataset.t;

  if (a === 'close')   closeSheet();
  else if (a === 'tab')  { tab = el.dataset.tab; spendSearch = ''; render(); scrollTo(0, 0); }
  else if (a === 'add')  { const d = {spend:'exp', remind:'rem', bday:'bday'}[tab]; el.dataset.t ? sheet(t) : d ? sheet(d) : chooser(); }
  else if (a === 'edit') sheet(t, id);
  else if (a === 'del') {
    if (confirm(_t('confirm_delete'))) {
      S.tombstones = S.tombstones || [];
      S.tombstones.push({id: id, deletedAt: Date.now()});
      S[KEYS[t]] = S[KEYS[t]].filter(x => x.id !== id);
      closeSheet(); commit();
    }
  }
  else if (a === 'done') {
    const r = S.reminders.find(x => x.id === id), td = ymd(new Date());
    if (r.repeat === 'none') r.done = !r.done; else r.lastDone = td;
    stampRecord(r); commit();
  }
  else if (a === 'snooze')   snoozeSheet(id);
  else if (a === 'dosnooze') {
    const r = S.reminders.find(x => x.id === id);
    if (!r) { closeSheet(); return; }
    const sv = el.dataset.sv;
    var now = new Date();
    if (sv === '10m') {
      now.setMinutes(now.getMinutes() + 10);
      r.time = pad(now.getHours()) + ':' + pad(now.getMinutes());
      r.date = ymd(new Date());
    } else if (sv === '1h') {
      now.setHours(now.getHours() + 1);
      r.time = pad(now.getHours()) + ':' + pad(now.getMinutes());
      r.date = ymd(now);
    } else {
      r.date = ymd(addDays(new Date(), 1));
      r.time = r.time || '';
    }
    r.done = false; r.lastDone = '';
    stampRecord(r); closeSheet(); commit();
  }
  else if (a === 'mo') {
    const d = parse(month + '-01'); d.setMonth(d.getMonth() + +el.dataset.n);
    month = ymd(d).slice(0, 7); render();
  }
  else if (a === 'notif')   toggleNotif();
  else if (a === 'install') { deferred.prompt(); deferred = null; render(); }
  else if (a === 'export')  doExport();
  else if (a === 'import')  doImport();
  else if (a === 'pinset')  openPINSetSheet(!!S.settings.pinHash);
  else if (a === 'pinremove') {
    if (confirm(_t('pin_remove_confirm'))) {
      delete S.settings.pinHash;
      localStorage.removeItem(PIN_KEY);
      commit();
    }
  }
  else if (a === 'pinforgotconfirm') {
    /* wipe all data */
    try { localStorage.removeItem(KEY); localStorage.removeItem(PIN_KEY); localStorage.removeItem(PIN_ATT); } catch(e) {}
    location.reload();
  }
  else if (a === 'cleardata') {
    if (confirm(_t('confirm_clear_data'))) {
      var savedLang  = localStorage.getItem('myday:lang');
      var savedTheme = localStorage.getItem('myday:theme');
      try { localStorage.clear(); } catch(e) {}
      try { if (savedLang)  localStorage.setItem('myday:lang', savedLang);
            if (savedTheme) localStorage.setItem('myday:theme', savedTheme); } catch(e) {}
      location.reload();
    }
  }
  else if (a === 'theme') {
    var cur = getTheme();
    var next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
    S.settings.theme = next;
    S.settings.updatedAt = Date.now();
    applyTheme(next);
    commit();
  }
  else if (a === 'setlang') {
    var nl = window.L.lang === 'si' ? 'en' : 'si';
    S.settings.lang = nl;
    S.settings.updatedAt = Date.now();
    persist();
    window.setLang(nl);
    var ov = $('#ov');
    if (ov && ov.classList.contains('on')) {
      render();
    }
  }
  else if (a === 'swupdate') { location.reload(); }
});

document.addEventListener('submit', e => {
  const f = e.target; if (f.id !== 'f') return; e.preventDefault();
  const type = f.dataset.t, id = f.dataset.id, d = Object.fromEntries(new FormData(f));

  if (type === 'pinset') {
    var stored = localStorage.getItem(PIN_KEY);
    if (stored && d.old !== undefined) {
      /* verify old PIN first */
      hashPIN(d.old).then(function(h) {
        if (h !== stored) { alert(_t('pin_wrong_old')); return; }
        setPINFromForm(d);
      });
    } else {
      setPINFromForm(d);
    }
    return;
  }

  if (type === 'exp') { d.amount = Math.round(parseFloat(d.amount) * 100) / 100; if (!(d.amount > 0)) return; }
  d.name  !== undefined && (d.name  = d.name.trim());
  d.title !== undefined && (d.title = d.title.trim());

  if (id) {
    if (type === 'rem') {
      var existing = S.reminders.find(x => x.id === id);
      if (existing && d.date !== existing.date) d.lastDone = '';
    }
    Object.assign(S[KEYS[type]].find(x => x.id === id), stampRecord(d));
  } else {
    d.id = uid();
    stampRecord(d);
    S[KEYS[type]].push(d);
  }
  closeSheet(); commit();
});

function setPINFromForm(d) {
  if (d.new1 !== d.new2) { alert(_t('pin_mismatch')); return; }
  if (d.new1.length < 4) { alert(_t('pin_too_short')); return; }
  hashPIN(d.new1).then(function(h) {
    localStorage.setItem(PIN_KEY, h);
    S.settings.pinHash = true; /* flag only — actual hash is NOT in S to avoid export */
    commit();
    closeSheet();
    alert(_t('pin_set_ok'));
  });
}

document.addEventListener('change', e => {
  const k = e.target.dataset.set; if (!k) return;
  if (k === 'budget') {
    S.settings.budget = Math.max(0, +e.target.value || 0);
  } else if (k === 'cur') {
    S.settings.cur = e.target.value || 'රු.';
  } else if (k === 'lang') {
    var nl = (e.target.value === 'en') ? 'en' : 'si';
    S.settings.lang = nl;
    S.settings.updatedAt = Date.now();
    persist();
    window.setLang(nl);
    return; /* setLang calls renderApp */
  } else if (k === 'theme') {
    var th = e.target.value;
    if (th !== 'light' && th !== 'dark') th = 'auto';
    S.settings.theme = th;
    applyTheme(th);
  }
  S.settings.updatedAt = Date.now();
  commit();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (tab === 'set') render(); });

/* ── notifications ───────────────────────────────────────────────────── */
var seenThisSession = {};

async function toggleNotif() {
  if (S.settings.notify) { S.settings.notify = false; return commit(); }
  if (!('Notification' in window)) return alert(_t('alert_notif_no_support'));
  S.settings.notify = (await Notification.requestPermission()) === 'granted'; commit(); check();
}

function show(title, body, tag) {
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(r => r.showNotification(title, {body, tag, icon:'assets/icon-192.png', badge:'assets/icon-192.png'}));
  } else if (Notification.permission === 'granted') {
    new Notification(title, {body, tag});
  }
}

function check() {
  if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  var n = new Date(), t = ymd(n), tm = ymd(addDays(n, 1)), hm = pad(n.getHours()) + ':' + pad(n.getMinutes());
  var nk = 'myday:n:' + t;
  var seen = []; try { seen = JSON.parse(localStorage.getItem(nk)) || []; } catch (e) {}
  var seenSet = {};
  seen.forEach(function(k) { seenSet[k] = 1; });

  /* prune old per-day keys (keep only today + yesterday) */
  try {
    var yesterday = ymd(addDays(n, -1));
    Object.keys(localStorage).forEach(function(k) {
      if (k.indexOf('myday:n:') === 0) {
        var d = k.split(':').pop();
        if (d !== t && d !== yesterday) localStorage.removeItem(k);
      }
    });
  } catch(e) {}

  var fire = (k, ti, bo) => {
    if (seenSet[k] || seenThisSession[k]) return;
    seenSet[k] = 1; seenThisSession[k] = 1;
    seen.push(k); show(ti, bo, k);
  };

  /* use raw r.time — notification body is plain text */
  S.reminders.forEach(r => {
    if (isDue(r, t) && (!r.time || r.time <= hm))
      fire('r' + r.id, r.title, r.time ? _t('notif_time_prefix') + r.time : _t('notif_today'));
  });
  S.birthdays.forEach(b => {
    if (b.date.slice(5) === t.slice(5))
      fire('b' + b.id, b.name + _t('notif_bday_today_title'), _t('notif_bday_today_body'));
    else if (b.date.slice(5) === tm.slice(5))
      fire('t' + b.id, b.name + _t('notif_bday_tomorrow_title'), _t('notif_bday_tomorrow_body'));
  });
  try { localStorage.setItem(nk, JSON.stringify(seen)); } catch (e) {}
}

/* ── recurring expense auto-generation ──────────────────────────────── */
function ensureRecurringExpenses() {
  var t = ymd(new Date()), m = t.slice(0, 7);
  var changed = false;
  S.expenses.filter(x => x.recurring && x.recurring !== 'none').forEach(function(tmpl) {
    var year = +m.slice(0, 4), mon = +m.slice(5) - 1;
    var daysInMonth = new Date(year, mon + 1, 0).getDate();
    for (var d = 1; d <= daysInMonth; d++) {
      var date = m + '-' + pad(d);
      if (date > t) break;
      if (!occurs({date: tmpl.date, repeat: tmpl.recurring}, date)) continue;
      var existing = S.expenses.find(function(x) { return x.recurringParent === tmpl.id && x.date === date; });
      if (!existing && date !== tmpl.date) {
        S.expenses.push({id:uid(), amount:tmpl.amount, cat:tmpl.cat, note:tmpl.note,
          date:date, recurring:'none', recurringParent:tmpl.id, updatedAt:Date.now()});
        changed = true;
      }
    }
  });
  if (changed) { S.updated = Date.now(); persist(); }
}

/* ── Service worker ──────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=__BUILD__', {scope: './'}).then(function(reg) {
    /* Listen for a waiting SW — show update toast */
    function checkWaiting(reg) {
      if (reg.waiting) showUpdateToast();
    }
    reg.addEventListener('updatefound', function() {
      var newSW = reg.installing;
      if (newSW) {
        newSW.addEventListener('statechange', function() {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast();
        });
      }
    });
    checkWaiting(reg);
  }).catch(function(){});

  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_UPDATE') showUpdateToast();
  });
}

function showUpdateToast() {
  var toast = document.getElementById('swToast');
  if (toast) { toast.style.display = ''; return; }
  toast = document.createElement('div');
  toast.id = 'swToast';
  toast.className = 'sw-toast';
  toast.innerHTML = '<span>' + _t('sw_update') + '</span> <button class="chip" data-act="swupdate">' + _t('sw_reload') + '</button>';
  document.body.appendChild(toast);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); check(); } });
setInterval(check, 30000);

/* ── Request persistent storage ─────────────────────────────────────── */
if (navigator.storage && navigator.storage.persist && !S.settings.storePersisted) {
  navigator.storage.persist().then(function(granted) {
    if (granted) { S.settings.storePersisted = true; persist(); }
  });
}

/* Boot */
ensureRecurringExpenses();
/* Apply synced lang on boot */
if (S.settings.lang && S.settings.lang !== window.L.lang) window.setLang(S.settings.lang);

/* PIN check on boot */
(function checkPINOnBoot() {
  var pinHash = localStorage.getItem(PIN_KEY);
  if (pinHash) pinLockScreen();
})();

/* Idle lock after 5 minutes in background */
var hiddenAt = 0;
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    hiddenAt = Date.now();
  } else {
    if (hiddenAt && (Date.now() - hiddenAt) > 5 * 60 * 1000) {
      var pinHash = localStorage.getItem(PIN_KEY);
      if (pinHash && !PIN_LOCKED) pinLockScreen();
    }
    hiddenAt = 0;
  }
});

render();
check();

})();
