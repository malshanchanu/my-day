/* assistant.js — My Day on-device assistant (no network, no API key).
   Answers questions from the user's own data in Sinhala / English / Singlish and can propose adding an expense.
   window.MyDayAI.answer(question, env) → { text, action? }
   window.MyDayAI.summary(env)          → compact text snapshot sent to the optional online AI
   `env` is built by app.js:
     { lang, today:'YYYY-MM-DD', S, money(n), catName(id), cats:[ids], hm(mins),
       due:[{title,time,late}], bdays:[{name,days,age}], exams:[{title,subject,days}],
       study:{today,wmin,goal,streak,subjects:[[name,mins]]} }                                   */
(function () {
  'use strict';

  var SI_RE = /[඀-෿]/;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };

  /* keyword matching: ASCII words match on word boundaries (+ plural), Sinhala words match anywhere */
  var rxCache = {};
  function has(q, words) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (SI_RE.test(w)) { if (q.indexOf(w) !== -1) return true; continue; }
      var rx = rxCache[w] || (rxCache[w] = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es)?\\b'));
      if (rx.test(q)) return true;
    }
    return false;
  }

  var CATS = {
    stay:   ['accommodation', 'accomodation', 'accommodations', 'rent', 'hostel', 'boarding', 'hotel', 'lodging', 'lodge', 'room', 'stay', 'නවාතැන්', 'කුලිය', 'බෝඩිම', 'බෝඩිං', 'හොස්ටල්', 'හෝටල්', 'කාමර'],
    food:   ['food', 'eat', 'eating', 'meal', 'lunch', 'dinner', 'breakfast', 'restaurant', 'snack', 'tea', 'coffee', 'ආහාර', 'කෑම', 'බත්', 'කඩේ'],
    trans:  ['transport', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'taxi', 'uber', 'pickme', 'tuk', 'ප්‍රවාහන', 'බස්', 'ගමන', 'ඉන්ධන', 'පෙට්‍රල්'],
    bill:   ['bill', 'electricity', 'water', 'internet', 'wifi', 'recharge', 'dialog', 'mobitel', 'බිල්', 'විදුලි', 'වතුර', 'රීචාජ්'],
    learn:  ['learning', 'course', 'tuition', 'class', 'books', 'ඉගෙනුම්', 'පන්ති', 'ටියුෂන්', 'පොත්'],
    health: ['health', 'medicine', 'doctor', 'pharmacy', 'hospital', 'සෞඛ්‍ය', 'බෙහෙත්', 'ඩොක්ටර්', 'රෝහල'],
    fun:    ['fun', 'movie', 'movies', 'game', 'games', 'entertainment', 'cinema', 'විනෝද', 'සිනමා', 'චිත්‍රපට']
  };
  function catIn(q) { var ks = Object.keys(CATS); for (var i = 0; i < ks.length; i++) if (has(q, CATS[ks[i]])) return ks[i]; return ''; }

  var W = {
    spend: ['spend', 'spent', 'spending', 'expense', 'expenses', 'cost', 'costs', 'paid', 'money', 'වියදම', 'වියදම්', 'ගෙව්වා', 'මුදල', 'සල්ලි', 'salli'],
    budget: ['budget', 'left', 'remaining', 'remain', 'අයවැය', 'ඉතිරි', 'ඉතුරු'],
    bday: ['birthday', 'birthdays', 'bday', 'උපන්දින', 'උපන් දින'],
    exam: ['exam', 'exams', 'test', 'විභාග'],
    rem: ['reminder', 'reminders', 'task', 'tasks', 'todo', 'due', 'pending', 'overdue', 'schedule', 'මතක්', 'කාර්ය', 'කළ යුතු', 'වැඩ'],
    study: ['study', 'studied', 'studying', 'streak', 'goal', 'homework', 'ඉගෙන', 'ඉගෙනුම', 'පාඩම්', 'අධ්‍යයන'],
    mem: ['journal', 'memory', 'memories', 'mood', 'diary', 'අත්දැකීම්', 'අත්දැකීම', 'මතක සටහන', 'සටහන්'],
    sum: ['summary', 'overview', 'recap', 'status', 'සාරාංශ', 'දවස කොහොමද'],
    help: ['help', 'what can you do', 'commands', 'උදව්', 'මොනවා කරන්න පුළුවන්'],
    hi: ['hi', 'hello', 'hey', 'hola', 'ayubowan', 'ආයුබෝවන්', 'හලෝ', 'හායි'],
    top: ['category', 'categories', 'breakdown', 'where', 'top', 'most', 'biggest', 'highest', 'වර්ග', 'වැඩිම', 'කොහෙටද'],
    cmp: ['compare', 'compared', 'vs', 'versus', 'than', 'වඩා', 'සසඳ'],
    recent: ['latest', 'recent', 'history', 'list', 'මෑත', 'ලැයිස්තුව'],
    add: ['add', 'spent', 'spend', 'paid', 'pay', 'bought', 'buy', 'දැම්මා', 'ගෙව්වා', 'ගත්තා', 'වියදම් කළා', 'එකතු කරන්න', 'ඇතුළත් කරන්න']
  };

  /* ── time periods ───────────────────────────────────────────────────── */
  function period(q, today) {
    var now = parse(today), t = today, m = t.slice(0, 7);
    if (has(q, ['yesterday', 'iye', 'ඊයේ'])) { var y = ymd(addDays(now, -1)); return {k: 'yesterday', from: y, to: y}; }
    if (has(q, ['today', 'ada', 'අද'])) return {k: 'today', from: t, to: t};
    if (/(last|previous|prev) month/.test(q) || has(q, ['පසුගිය මාස', 'පෙර මාස', 'ගිය මාස'])) {
      var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1), key = ymd(lm).slice(0, 7);
      return {k: 'lastmonth', from: key + '-01', to: key + '-31'};
    }
    if (/(this|current) week|\bweek\b/.test(q) || has(q, ['සතිය', 'සතියේ', 'සතිය'])) {
      return {k: 'week', from: ymd(addDays(now, -((now.getDay() + 6) % 7))), to: t};
    }
    if (/(this )?year\b/.test(q) || has(q, ['අවුරුද්ද', 'වසර'])) return {k: 'year', from: t.slice(0, 4) + '-01-01', to: t};
    if (/all time|ever\b|overall|altogether/.test(q) || has(q, ['සියල්ල', 'සියලු'])) return {k: 'all', from: '0000-01-01', to: '9999-12-31'};
    return {k: 'month', from: m + '-01', to: m + '-31'};
  }

  /* ── answer ─────────────────────────────────────────────────────────── */
  function answer(raw, env) {
    var q = String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var lang = SI_RE.test(q) ? 'si' : env.lang;
    var T = function (en, si) { return lang === 'si' ? si : en; };
    var S = env.S, money = env.money, name = env.catName;
    var reply = function (text, action) { return {text: text, action: action || null, handled: true}; };

    /* 1 · add an expense: "add 1500 accommodation", "spent 800 on lunch yesterday", "නවාතැන් 15000 ගෙව්වා" */
    var numM = q.match(/(\d[\d,]*(?:\.\d+)?)/);
    var isQuestion = /\?|^(how|what|when|which|why|did|do|is|are|can|show|tell)\b/.test(q) || has(q, ['කීයද', 'කොච්චරද', 'කීය ද']);
    if (numM && !isQuestion && has(q, W.add)) {
      var amount = Math.round(parseFloat(numM[1].replace(/,/g, '')) * 100) / 100;
      if (amount > 0 && amount < 1e10) {
        var cat = catIn(q) || 'other';
        var date = has(q, ['yesterday', 'ඊයේ']) ? ymd(addDays(parse(env.today), -1)) : env.today;
        var note = q.replace(/\b(add|spent|spend|paid|pay|bought|buy|on|for|to|my|an?|the|expense|today|yesterday|rs|lkr|rupees?)\b\.?/g, ' ')
                    .replace(/(දැම්මා|ගෙව්වා|ගත්තා|වියදම් කළා|එකතු කරන්න|ඇතුළත් කරන්න|රු\.?|අද|ඊයේ)/g, ' ')
                    .replace(/\d[\d,]*(?:\.\d+)?/g, ' ').replace(/\s+/g, ' ').trim();
        if (CATS[cat] && has(note, CATS[cat]) && note.split(' ').length === 1) note = '';
        note = note ? note.charAt(0).toUpperCase() + note.slice(1, 60) : '';
        return reply(T('Ready to add **' + money(amount) + '** under **' + name(cat) + '**' + (note ? ' (“' + note + '”)' : '') + (date === env.today ? ' for today' : ' for yesterday') + '. Save it?',
                       '**' + name(cat) + '** යටතට **' + money(amount) + '**' + (note ? ' (“' + note + '”)' : '') + (date === env.today ? ' අදට' : ' ඊයේට') + ' එකතු කරන්නද?'),
                     {type: 'exp', d: {amount: amount, cat: cat, note: note, date: date, recurring: 'none'}});
      }
    }

    var words = q.split(' ').length;
    var spendish = has(q, W.spend);
    var cat1 = catIn(q);

    /* 2 · greetings / help */
    if (words <= 3 && has(q, W.hi)) return reply(T('Hello! 👋 Ask me about your spending, study, reminders or birthdays — or say “add 1500 accommodation”.', 'ආයුබෝවන්! 👋 ඔබේ වියදම්, ඉගෙනුම්, මතක් කිරීම්, උපන්දින ගැන අහන්න — නැත්නම් “නවාතැන් 15000 ගෙව්වා” කියන්න.'));
    if (has(q, W.help)) return reply(T('I can help with:\n• **Spending** — “spent this month”, “accommodation last month”, “top categories”\n• **Budget** — “budget left”\n• **Study** — “study this week”, “streak”\n• **Tasks** — “what is due today”\n• **Birthdays & exams** — “upcoming birthdays”\n• **Add expense** — “add 800 lunch”', 'මට පුළුවන්:\n• **වියදම්** — “මේ මාසේ වියදම”, “පසුගිය මාසේ නවාතැන්”, “වැඩිම වර්ග”\n• **අයවැය** — “අයවැයෙන් ඉතිරිය”\n• **ඉගෙනුම** — “මේ සතියේ ඉගෙනුම”, “streak”\n• **කාර්ය** — “අද කළ යුතු දේ”\n• **උපන්දින / විභාග** — “ඉදිරි උපන්දින”\n• **වියදමක් එකතු** — “කෑම 800 දැම්මා”'));

    /* 3 · budget */
    if (has(q, W.budget) && !cat1) {
      var bud = +S.settings.budget || 0, m0 = env.today.slice(0, 7);
      var spent = S.expenses.filter(function (x) { return x.date.slice(0, 7) === m0; }).reduce(function (a, x) { return a + x.amount; }, 0);
      if (!bud) return reply(T('You haven’t set a monthly budget yet. Set one in **Settings → Budget** and I’ll track it for you. So far this month you’ve spent **' + money(spent) + '**.', 'ඔබ තවම මාසික අයවැයක් සකසා නැත. **සැකසුම් → අයවැය** තුළ සකසන්න. මේ මාසයේ දැනට වියදම **' + money(spent) + '**.'));
      var now = parse(env.today), dl = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1, left = bud - spent;
      return reply(left >= 0
        ? T('Budget **' + money(bud) + '** · spent **' + money(spent) + '** (' + Math.round(spent / bud * 100) + '%).\nYou have **' + money(left) + '** left — about **' + money(left / dl) + '** per day for the next ' + dl + ' days.',
            'අයවැය **' + money(bud) + '** · වියදම **' + money(spent) + '** (' + Math.round(spent / bud * 100) + '%).\nඉතිරි **' + money(left) + '** — ඉදිරි දින ' + dl + 'ට දිනකට ආසන්න වශයෙන් **' + money(left / dl) + '**.')
        : T('You are **' + money(-left) + '** over your budget of ' + money(bud) + ' this month. Consider pausing non-essential spending.', 'මේ මාසයේ අයවැය ' + money(bud) + ' ට වඩා **' + money(-left) + '** ක් වැඩියෙන් වියදම් කර ඇත.'));
    }

    /* 4 · birthdays / exams / tasks */
    if (has(q, W.bday)) {
      var b = env.bdays.slice(0, 5);
      if (!b.length) return reply(T('No birthdays saved yet — add some in the Birthdays tab.', 'උපන්දින තවම ඇතුළත් කර නැත.'));
      return reply(T('Upcoming birthdays:\n', 'ඉදිරි උපන්දින:\n') + b.map(function (x) { return '• **' + x.name + '** — ' + (x.days === 0 ? T('today 🎂', 'අද 🎂') : x.days === 1 ? T('tomorrow', 'හෙට') : T('in ' + x.days + ' days', 'දින ' + x.days + 'කින')) + (x.age > 0 && x.age < 120 ? ' · ' + T('turning ' + x.age, 'වයස ' + x.age) : ''); }).join('\n'));
    }
    if (has(q, W.exam)) {
      if (!env.exams.length) return reply(T('No upcoming exams. Add one from Study → Add exam.', 'ඉදිරි විභාග නැත. ඉගෙනුම් පිටුවෙන් එකතු කරන්න.'));
      return reply(T('Upcoming exams:\n', 'ඉදිරි විභාග:\n') + env.exams.slice(0, 5).map(function (e) { return '• **' + e.title + '**' + (e.subject ? ' (' + e.subject + ')' : '') + ' — ' + (e.days === 0 ? T('today', 'අද') : e.days === 1 ? T('tomorrow', 'හෙට') : T('in ' + e.days + ' days', 'දින ' + e.days + 'කින')); }).join('\n'));
    }
    if (has(q, W.rem) && !spendish) {
      if (!env.due.length) return reply(T('Nothing due today — you’re all clear! ✅', 'අද කළ යුතු දෙයක් නැත — නිදහස්! ✅'));
      return reply(T('You have **' + env.due.length + '** thing' + (env.due.length > 1 ? 's' : '') + ' to do:\n', 'ඔබට කළ යුතු දේ **' + env.due.length + '** ක් ඇත:\n') + env.due.slice(0, 8).map(function (r) { return '• ' + r.title + (r.time ? ' · ' + r.time : '') + (r.late ? ' ⚠️ ' + T('overdue', 'ප්‍රමාදයි') : ''); }).join('\n'));
    }

    /* 5 · study */
    if (has(q, W.study) && !spendish) {
      var st = env.study;
      var subj = st.subjects.slice(0, 3).map(function (s) { return '• ' + s[0] + ' — ' + env.hm(s[1]); }).join('\n');
      return reply(T('This week: **' + env.hm(st.wmin) + '** of your **' + env.hm(st.goal) + '** goal (' + Math.round(st.wmin / st.goal * 100) + '%). Today: **' + env.hm(st.today) + '**. Streak: **' + st.streak + '** day' + (st.streak === 1 ? '' : 's') + '.' + (subj ? '\nTop subjects:\n' + subj : ''),
                     'මේ සතිය: **' + env.hm(st.wmin) + '** (ඉලක්කය **' + env.hm(st.goal) + '**, ' + Math.round(st.wmin / st.goal * 100) + '%). අද: **' + env.hm(st.today) + '**. අඛණ්ඩ දින: **' + st.streak + '**.' + (subj ? '\nප්‍රධාන විෂයන්:\n' + subj : '')));
    }

    /* 6 · journal */
    if (has(q, W.mem) && !spendish) {
      var mm = S.memories.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3);
      if (!mm.length) return reply(T('Your journal is empty. Add a memory, experience or lesson from the Journal tab.', 'ඔබේ සටහන් තවම නැත. අත්දැකීම් පිටුවෙන් එකතු කරන්න.'));
      return reply(T('You have **' + S.memories.length + '** journal entries. Latest:\n', 'ඔබට සටහන් **' + S.memories.length + '** ක් ඇත. අලුත්ම:\n') + mm.map(function (x) { return '• ' + x.title + ' (' + x.date + ')'; }).join('\n'));
    }

    /* 7 · overall summary */
    if (has(q, W.sum) && !spendish) {
      var m1 = env.today.slice(0, 7);
      var sp = S.expenses.filter(function (x) { return x.date.slice(0, 7) === m1; }).reduce(function (a, x) { return a + x.amount; }, 0);
      return reply(T('**Your day at a glance**\n• Spent this month: **' + money(sp) + '**\n• Tasks due: **' + env.due.length + '**\n• Study this week: **' + env.hm(env.study.wmin) + '**\n• Next birthday: ' + (env.bdays[0] ? '**' + env.bdays[0].name + '** (' + env.bdays[0].days + ' d)' : '—'),
                     '**ඔබේ දවස එක බැල්මකින්**\n• මේ මාසයේ වියදම: **' + money(sp) + '**\n• කළ යුතු දේ: **' + env.due.length + '**\n• මේ සතියේ ඉගෙනුම: **' + env.hm(env.study.wmin) + '**\n• ඊළඟ උපන්දිනය: ' + (env.bdays[0] ? '**' + env.bdays[0].name + '** (දින ' + env.bdays[0].days + ')' : '—')));
    }

    /* 8 · spending (default for money questions & category names) */
    if (spendish || cat1 || has(q, W.top) || has(q, W.recent) || has(q, W.cmp)) {
      var per = period(q, env.today);
      var inRange = S.expenses.filter(function (x) { return x.date >= per.from && x.date <= per.to; });
      var pl = {today: T('today', 'අද'), yesterday: T('yesterday', 'ඊයේ'), week: T('this week', 'මේ සතියේ'), month: T('this month', 'මේ මාසයේ'), lastmonth: T('last month', 'පසුගිය මාසයේ'), year: T('this year', 'මේ වසරේ'), all: T('in total', 'මුළුමනින්')}[per.k];

      if (has(q, W.recent)) {
        var rec = S.expenses.filter(function (x) { return !cat1 || x.cat === cat1; }).sort(function (a, b) { return b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt; }).slice(0, 6);
        if (!rec.length) return reply(T('No expenses recorded yet.', 'වියදම් තවම ඇතුළත් කර නැත.'));
        return reply(T('Latest expenses:\n', 'අලුත්ම වියදම්:\n') + rec.map(function (x) { return '• ' + x.date.slice(5) + ' · ' + (x.note || name(x.cat)) + ' — **' + money(x.amount) + '**'; }).join('\n'));
      }
      if (cat1) {
        var rows = inRange.filter(function (x) { return x.cat === cat1; }), tot = rows.reduce(function (a, x) { return a + x.amount; }, 0);
        var all = inRange.reduce(function (a, x) { return a + x.amount; }, 0);
        if (!rows.length) return reply(T('No **' + name(cat1) + '** expenses ' + pl + '. Say “add 15000 ' + name(cat1).toLowerCase() + '” to record one.', '**' + name(cat1) + '** වියදම් ' + pl + ' නැත. එකතු කිරීමට “' + name(cat1) + ' 15000 ගෙව්වා” කියන්න.'));
        var last = rows.sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3).map(function (x) { return '• ' + x.date.slice(5) + (x.note ? ' · ' + x.note : '') + ' — ' + money(x.amount); }).join('\n');
        return reply(T('**' + name(cat1) + '** ' + pl + ': **' + money(tot) + '** across ' + rows.length + ' entr' + (rows.length === 1 ? 'y' : 'ies') + (all ? ' (' + Math.round(tot / all * 100) + '% of all spending)' : '') + '.\n' + last,
                       '**' + name(cat1) + '** ' + pl + ': **' + money(tot) + '** (වාර ' + rows.length + (all ? ', මුළු වියදමෙන් ' + Math.round(tot / all * 100) + '%' : '') + ').\n' + last));
      }
      var total = inRange.reduce(function (a, x) { return a + x.amount; }, 0);
      if (has(q, W.cmp) || per.k === 'lastmonth' && has(q, W.cmp)) {
        var cur = env.today.slice(0, 7), pm = ymd(new Date(parse(env.today).getFullYear(), parse(env.today).getMonth() - 1, 1)).slice(0, 7);
        var a1 = S.expenses.filter(function (x) { return x.date.slice(0, 7) === cur; }).reduce(function (a, x) { return a + x.amount; }, 0);
        var a0 = S.expenses.filter(function (x) { return x.date.slice(0, 7) === pm; }).reduce(function (a, x) { return a + x.amount; }, 0);
        var df = a1 - a0;
        return reply(T('This month **' + money(a1) + '** vs last month **' + money(a0) + '** — ' + (a0 ? (df >= 0 ? '▲ ' : '▼ ') + money(Math.abs(df)) + (df >= 0 ? ' more' : ' less') : 'no data last month') + '.',
                       'මේ මාසය **' + money(a1) + '**, පසුගිය මාසය **' + money(a0) + '** — ' + (a0 ? (df >= 0 ? '▲ ' : '▼ ') + money(Math.abs(df)) + (df >= 0 ? ' වැඩි' : ' අඩු') : 'පසුගිය මාසයේ දත්ත නැත') + '.'));
      }
      if (!inRange.length) return reply(T('No expenses ' + pl + ' yet.', 'වියදම් ' + pl + ' නැත.'));
      var by = {}; inRange.forEach(function (x) { by[x.cat] = (by[x.cat] || 0) + x.amount; });
      var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 4).map(function (k) { return '• ' + name(k) + ' — **' + money(by[k]) + '** (' + Math.round(by[k] / total * 100) + '%)'; }).join('\n');
      var avg = per.k === 'month' ? '\n' + T('Daily average: ', 'දිනකට සාමාන්‍යය: ') + '**' + money(total / Math.max(1, parse(env.today).getDate())) + '**' : '';
      return reply(T('You spent **' + money(total) + '** ' + pl + ' (' + inRange.length + ' entries).\n' + top + avg, 'ඔබ ' + pl + ' **' + money(total) + '** වියදම් කර ඇත (ගනුදෙනු ' + inRange.length + ').\n' + top + avg));
    }

    /* 9 · not understood */
    return {handled: false, action: null, text: T('I didn’t quite get that. Try “spent this month”, “accommodation”, “what is due today”, “study this week” — or “help”.', 'මට ඒක නිවැරදිව තේරුණේ නැහැ. “මේ මාසේ වියදම”, “නවාතැන්”, “අද කළ යුතු දේ”, “මේ සතියේ ඉගෙනුම” හෝ “උදව්” කියා උත්සාහ කරන්න.')};
  }

  /* ── compact snapshot for the optional online AI ────────────────────── */
  function summary(env) {
    var S = env.S, t = env.today, m = t.slice(0, 7), pm = ymd(new Date(parse(t).getFullYear(), parse(t).getMonth() - 1, 1)).slice(0, 7);
    var sumOf = function (a) { return a.reduce(function (s, x) { return s + x.amount; }, 0); };
    var month = S.expenses.filter(function (x) { return x.date.slice(0, 7) === m; });
    var by = {}; month.forEach(function (x) { by[x.cat] = (by[x.cat] || 0) + x.amount; });
    var L = [];
    L.push('Today: ' + t + '. Currency: ' + S.settings.cur + '. Monthly budget: ' + (S.settings.budget || 'not set') + '.');
    L.push('Spent this month: ' + sumOf(month) + ' (' + month.length + ' entries). Last month: ' + sumOf(S.expenses.filter(function (x) { return x.date.slice(0, 7) === pm; })) + '.');
    L.push('This month by category: ' + (Object.keys(by).map(function (k) { return env.catName(k) + '=' + by[k]; }).join(', ') || 'none') + '.');
    var rec = S.expenses.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt; }).slice(0, 25);
    L.push('Recent expenses (date | category | note | amount):\n' + (rec.map(function (x) { return x.date + ' | ' + env.catName(x.cat) + ' | ' + (x.note || '-') + ' | ' + x.amount; }).join('\n') || 'none'));
    L.push('Tasks due now: ' + (env.due.map(function (r) { return r.title + (r.time ? ' @' + r.time : '') + (r.late ? ' (overdue)' : ''); }).join('; ') || 'none') + '.');
    L.push('Upcoming birthdays: ' + (env.bdays.slice(0, 6).map(function (b) { return b.name + ' in ' + b.days + 'd'; }).join('; ') || 'none') + '.');
    L.push('Upcoming exams: ' + (env.exams.slice(0, 5).map(function (e) { return e.title + ' in ' + e.days + 'd'; }).join('; ') || 'none') + '.');
    L.push('Study: ' + env.study.wmin + ' min this week of ' + env.study.goal + ' goal; today ' + env.study.today + ' min; streak ' + env.study.streak + ' days; subjects: ' + (env.study.subjects.slice(0, 5).map(function (s) { return s[0] + '=' + s[1] + 'm'; }).join(', ') || 'none') + '.');
    L.push('Journal entries: ' + S.memories.length + '.');
    return L.join('\n').slice(0, 5000);
  }

  window.MyDayAI = {answer: answer, summary: summary};
})();
