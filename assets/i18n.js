/* i18n.js — My Day
   window.t(key, params)   translate with {param} interpolation (falls back en → key, never undefined)
   window.tn(key, n, p)    plural-aware: looks up key_one / key_other
   window.setLang(lang)    switch language, persist, re-render
   window.getLang()
   window.ordinal(n)       1st / 2nd / 3rd (en) — plain number (si)
*/
(function () {
  'use strict';

  var STR = {
    si: {
      months: ['ජනවාරි','පෙබරවාරි','මාර්තු','අප්‍රේල්','මැයි','ජූනි','ජූලි','අගෝස්තු','සැප්තැම්බර්','ඔක්තෝබර්','නොවැම්බර්','දෙසැම්බර්'],
      days: ['ඉරිදා','සඳුදා','අඟහරුවාදා','බදාදා','බ්‍රහස්පතින්දා','සිකුරාදා','සෙනසුරාදා'],
      days_s: ['ඉරි','සඳු','අඟ','බදා','බ්‍රහ','සිකු','සෙන'],

      tab_mem: 'අත්දැකීම්', title_mem: 'මතක සහ අත්දැකීම්', sub_mem: 'ජීවිතයේ වටිනා මොහොත් සුරකින්න', add_mem: 'මතකයක්', add_mem_d: 'මතකයක්, අත්දැකීමක් හෝ පාඩමක්', new_mem: 'නව සටහනක්', edit_mem: 'සටහන වෙනස් කරන්න',
      mem_memory: 'මතකය', mem_experience: 'අත්දැකීම', mem_lesson: 'පාඩම', mem_all: 'සියල්ල', mem_fav: 'ප්‍රියතම', fld_mem_title: 'මාතෘකාව', fld_mem_body: 'ඔබේ සටහන', fld_mood: 'හැඟීම',
      ph_mem_title: 'උදා: පළමු චාරිකාව', ph_mem_body: 'මොකද වුණේ? ඔබට හැඟුණේ කොහොමද?', mem_none: 'ගැළපෙන සටහන් නැත.', empty_mem_t: 'තවම සටහන් නැත', empty_mem_d: 'ලස්සන මතක, අලුත් අත්දැකීම්, ඉගෙන ගත් පාඩම් — මෙහි සුරකින්න.',
      btn_add_mem: 'සටහනක් එකතු කරන්න', mem_search: 'සටහන් සොයන්න…', aria_fav: 'ප්‍රියතම ලෙස සලකුණු කරන්න', imp_mem: 'මතක සටහන්',
      aria_backspace: 'මකන්න', aria_ok: 'තහවුරු කරන්න', pin_https: 'රහස් අංකය සඳහා ආරක්ෂිත (https) සම්බන්ධතාවක් අවශ්‍යයි.', share_title: 'මගේ දවස උපස්ථය',
      u_thou: 'දහ', u_mil: 'මි', u_b: 'බයිට', u_kb: 'කි.බ.', u_mb: 'මෙ.බ.',
      app_name: 'මගේ දවස',
      greet_morn: 'සුභ උදෑසනක්', greet_day: 'සුභ දහවලක්', greet_eve: 'සුභ සන්ධ්‍යාවක්', greet_night: 'සුභ රාත්‍රියක්',

      tab_today: 'අද', tab_spend: 'වියදම්', tab_study: 'ඉගෙනුම', tab_remind: 'මතක්', tab_bday: 'උපන්දින', tab_set: 'සැකසුම්',
      title_spend: 'වියදම්', title_study: 'ඉගෙනුම', title_remind: 'මතක් කිරීම්', title_bday: 'උපන්දින', title_set: 'සැකසුම්',
      sub_remind: 'පාඩම්, ගෙවීම්, වැඩ', sub_bday: 'ඔබේ අයගේ විශේෂ දවස්', sub_set: 'යෙදුම ඔබට ගැළපෙන සේ',

      /* categories & kinds */
      /* v3.6 · accommodation, more, assistant */
      cat_stay: 'නවාතැන්',
      tab_more: 'තවත්', tab_chat: 'සහායක', title_chat: 'AI සහායක', sub_chat: 'ඔබේ වියදම්, ඉගෙනුම්, වැඩ ගැන අහන්න', title_more: 'තවත්',
      more_bday_d: 'විශේෂ දවසක් අමතක නොවෙයි', more_mem_d: 'මතක සහ පාඩම්', more_chat_d: 'AI සහායකගෙන් අහන්න', more_set_d: 'අයවැය, තේමාව, උපස්ථ',
      aria_edit: 'වෙනස් කරන්න',
      chat_ph: 'ඔබේ දවස ගැන ඕනෑම දෙයක් අහන්න…', chat_send: 'යවන්න', chat_clear: 'සංවාදය මකන්න', chat_clear_t: 'සංවාදය මකන්නද?', chat_clear_d: 'මෙම උපාංගයේ chat ඉතිහාසය ඉවත් වේ.',
      chat_mode_ai: 'Smart AI', chat_mode_local: 'උපාංගය තුළ', chat_thinking: 'සිතමින්…',
      cs_t: 'AI Assistant — coming soon', cs_d: 'We are working on a smarter assistant. It will be available in a future update.', h_todos: 'To-do', add_todo: 'To-do', new_todo: 'New to-do', edit_todo: 'Edit to-do', fld_todo: 'Task', todo_add: 'Add task', todo_clear: 'Clear done', todo_empty_t: 'No tasks yet', todo_empty_d: 'Add things you need to study or finish.', aria_todo_done: 'Mark task as done', aria_todo_undone: 'Mark task as not done', imp_todo: 'To-do tasks', safe_restored: 'Your data was restored from the backup copy on this device.', safe_inapp: 'You are in an in-app browser (WhatsApp, Facebook, Instagram...). Saved data can be erased here. Open this link in Chrome or Safari and install the app.', safe_ios: 'On iPhone: tap Share, then Add to Home Screen. Data saved in a Safari tab can be erased after a few days, and notifications only work from the Home Screen app.', safe_backup: 'Back up your data so it cannot be lost.', safe_backup_btn: 'Back up', safe_notif: 'Turn on notifications to get reminders.', safe_notif_btn: 'Turn on', notif_test: 'Send a test notification', notif_test_t: 'My Day', notif_test_b: 'Notifications are working.', notif_limit: 'Reminders are shown while the app is open or was used recently. Phones pause closed web apps, so a reminder may arrive late when the app is closed.', notif_ios: 'On iPhone, add the app to the Home Screen first.', rep_btn: 'PDF report', rep_title: 'Expense report', rep_from: 'From', rep_to: 'To', rep_this: 'This month', rep_last: 'Last month', rep_3m: 'Last 3 months', rep_year: 'This year', rep_make: 'Create PDF', rep_note: 'Your browser print window opens. Choose "Save as PDF" as the destination.', rep_err: 'Choose a valid range (From must not be after To).', rep_none: 'No expenses in this range.', rep_generated: 'Generated', rep_cat: 'Category', rep_amount: 'Amount', rep_tx: 'Transactions', rep_date: 'Date', rep_note_col: 'Note',
      chat_welcome_t: 'ආයුබෝවන්! මම ඔබේ “මගේ දවස” සහායක', chat_welcome_d: 'ඔබේ දත්ත අනුව වියදම්, ඉගෙනුම්, මතක් කිරීම්, උපන්දින ගැන පිළිතුරු දෙන්නත්, වියදම් එකතු කරන්නත් මට පුළුවන්.',
      chat_q1: 'මේ මාසේ වියදම කීයද?', chat_q2: 'නවාතැන් වියදම', chat_q3: 'අද කළ යුතු දේ මොනවාද?', chat_q4: 'මේ සතියේ ඉගෙනුම', chat_q5: 'ඉදිරි උපන්දින', chat_q6: 'අයවැයෙන් ඉතිරිය',
      chat_ai_t: 'Smart AI සක්‍රීය කරන්න', chat_ai_d: 'Online AI එකෙන් වඩා පොහොසත් පිළිතුරු ගන්න. ඔබේ දත්තවල කෙටි සාරාංශයක් (PIN කිසිවිටක් නොවේ) ඔබේ server function එකට යවයි. ඕනෑම වේලාවක අක්‍රීය කළ හැක.',
      chat_ai_on: 'සක්‍රීය කරන්න', chat_ai_later: 'දැන් එපා',
      chat_fallback: 'AI දැන් ලබාගත නොහැක — උපාංගය තුළින් පිළිතුරු දුන්නා.', chat_auth: 'Access code එක වැරදියි. සැකසුම් → සහායක තුළ නිවැරදි කරන්න.',
      chat_err_nofn: 'මේ site එකේ AI function එක deploy වී නැත (Git හෝ Netlify CLI මගින් deploy කළ යුතුයි).', chat_err_key: 'Netlify හි ANTHROPIC_API_KEY සකසා නැත.', chat_err_up: 'AI සේවාව දෝෂයක් දුන්නා (key/model පරීක්ෂා කරන්න).', chat_err_origin: 'ආරක්ෂක පරීක්ෂාවෙන් ඉල්ලීම ප්‍රතික්ෂේප විය (ALLOWED_ORIGIN).', chat_err_slow: 'AI පිළිතුර ප්‍රමාද වැඩියි.', chat_err_net: 'AI වෙත සම්බන්ධ විය නොහැක.',
      chat_save: 'වියදම සුරකින්න', chat_saved: 'සුරැකිණි',
      s_ai: 'සහායක', set_ai: 'Smart AI මාදිලිය', set_ai_d: 'වඩා හොඳ පිළිතුරු සඳහා දත්ත සාරාංශයක් AI වෙත යවන්න', set_ai_code: 'Access code (අවශ්‍ය නම් පමණක්)',

      cat_food: 'ආහාර', cat_trans: 'ප්‍රවාහන', cat_bill: 'බිල්පත්', cat_learn: 'ඉගෙනුම්', cat_health: 'සෞඛ්‍යය', cat_fun: 'විනෝදය', cat_other: 'වෙනත්',
      kind_study: 'ඉගෙනුම', kind_pay: 'ගෙවීම්', kind_task: 'වෙනත්',
      rep_none: 'එක් වරක්', rep_daily: 'දිනපතා', rep_weekly: 'සතිපතා', rep_monthly: 'මාසිකව',
      snooze_10m: 'විනාඩි 10කින්', snooze_1h: 'පැයකින්', snooze_tom: 'හෙට',

      /* headings */
      h_tasks: 'අද කළ යුතු දේ', h_week: 'පසුගිය දින 7', h_bdays: 'ඉදිරි උපන්දින', h_exams: 'ඉදිරි විභාග',
      h_by_cat: 'වර්ග අනුව', h_overdue: 'ප්‍රමාද වූ', h_today: 'අද', h_upcoming: 'ඉදිරියේ', h_done: 'නිම කළ',
      h_add_what: 'මොනවා එකතු කරමුද?', h_snooze: 'කල් දමන්න', h_subjects: 'විෂය අනුව (මෙම සතිය)', h_recent: 'මෑත ඉගෙනුම්',
      h_this_month: 'මෙම මාසයේ', h_later: 'පසුව',

      /* today hero */
      hero_month: '{mon} මාසයේ වියදම', hero_today: 'අද {amt}', hero_budget: 'අයවැය {amt}',
      hero_set_budget: 'මාසික අයවැයක් සකසන්න', safe_day: 'දිනකට වැය කළ හැක්කේ', over_bud: 'අයවැය ඉක්මවා ඇත', over_by: '{amt}කින් ඉක්මවා',
      days_left_one: 'ඉතිරි දිනය 1', days_left_other: 'ඉතිරි දින {n}',
      stat_study: 'අද ඉගෙනුම', stat_streak: 'අඛණ්ඩ දින', stat_tasks: 'ඉතිරි කාර්ය',
      empty_today_t: 'අද කිසිවක් නැත', empty_today_d: 'නිදහස් දවසක්! අලුත් මතක් කිරීමක් එකතු කරන්න.',
      empty_bdays_soon: 'දින 30ක් ඇතුළත උපන්දින නැත.',

      /* spend */
      sp_total: 'මාසික මුළු වියදම', sp_top: 'වැඩිම වියදම', sp_avg: 'දිනකට සාමාන්‍යය', sp_count: 'ගනුදෙනු',
      sp_vs_up: 'පෙර මාසයට වඩා {amt} වැඩි', sp_vs_down: 'පෙර මාසයට වඩා {amt} අඩු',
      search_ph: 'වියදම් සොයන්න…', search_clear: 'මකන්න', search_none: '“{q}” සඳහා කිසිවක් නැත.',
      empty_spend_t: 'වියදම් නැත', empty_spend_d: 'මෙම මාසයේ වියදම් තවම ඇතුළත් කර නැත.', btn_add_exp: 'වියදමක් එකතු කරන්න',
      prev_mon: 'කලින් මාසය', next_mon: 'ඊළඟ මාසය', yesterday: 'ඊයේ', day_before: 'පෙරේදා', recurring_tag: 'නැවත නැවත',

      /* study */
      st_week: 'මෙම සතියේ ඉගෙනුම', st_today: 'අද {v}', st_streak_one: 'දින 1ක අඛණ්ඩව', st_streak_other: 'දින {n}ක් අඛණ්ඩව', st_goal: 'සතිපතා ඉලක්කය',
      st_goal_ask: 'සතියකට පැය කීයක් ඉලක්කද?', st_goal_hint: 'පැය', st_timer: 'අධ්‍යයන ටයිමරය', st_timer_run: 'ඉගෙන ගනිමින්…', st_start: 'ආරම්භ කරන්න', st_stop: 'නවත්වා සුරකින්න', st_discard: 'ඉවත ලන්න',
      st_no_exam_t: 'ඉදිරි විභාග නැත', st_no_exam_d: 'විභාගයක් එකතු කර දින ගණන බලන්න.',
      st_empty_t: 'තවම ඉගෙනුම් නැත', st_empty_d: 'ටයිමරය පටන් ගන්න, නැතිනම් අතින් එකතු කරන්න.',
      u_h: 'පැ', u_m: 'වි', exam_in: 'දින {n}කින්', goal_set_btn: 'ඉලක්කය වෙනස් කරන්න',

      /* forms */
      add_exp: 'වියදම', add_rem: 'මතක් කිරීම', add_bday: 'උපන්දිනය', add_study: 'ඉගෙනුම් වේලාව', add_exam: 'විභාගය',
      new_exp: 'නව වියදමක්', new_rem: 'නව මතක් කිරීමක්', new_bday: 'නව උපන්දිනයක්', new_study: 'ඉගෙනුම් වේලාවක්', new_exam: 'නව විභාගයක්',
      edit_exp: 'වියදම වෙනස් කරන්න', edit_rem: 'මතක් කිරීම වෙනස් කරන්න', edit_bday: 'උපන්දිනය වෙනස් කරන්න', edit_study: 'ඉගෙනුම වෙනස් කරන්න', edit_exam: 'විභාගය වෙනස් කරන්න',
      add_exp_d: 'අද කළ වියදමක්', add_rem_d: 'පාඩම්, ගෙවීම්, වැඩ', add_bday_d: 'සුබ පතන්න අමතක නොවෙන්න', add_study_d: 'කොච්චර ඉගෙන ගත්තද', add_exam_d: 'ඉදිරි විභාගයක්',
      fld_amount: 'මුදල', fld_cat: 'වර්ගය', fld_note: 'සටහන', fld_note_opt: 'සටහන (අවශ්‍ය නම්)', fld_date: 'දිනය', fld_repeat: 'නැවත නැවත', fld_title: 'මතක් කළ යුත්තේ කුමක්ද?',
      fld_kind: 'වර්ගය', fld_time: 'වේලාව', fld_name: 'නම', fld_bdate: 'උපන් දිනය', fld_subject: 'විෂය', fld_mins: 'විනාඩි', fld_exam: 'විභාගය / කාර්යය',
      ph_title: 'උදා: ගණිත පාඩම්', ph_name: 'උදා: අම්මා', ph_subject: 'උදා: ගණිතය', ph_note: 'උදා: දවල් කෑම',
      btn_save: 'සුරකින්න', btn_delete: 'මකන්න', btn_cancel: 'අවලංගු', btn_close: 'වසන්න', btn_undo: 'අහෝසි', btn_add_new: 'අලුතින් එකතු කරන්න', btn_add: 'එකතු කරන්න',
      err_amount: 'වලංගු මුදලක් ඇතුළත් කරන්න.', err_text: 'මෙම ක්ෂේත්‍රය හිස් විය නොහැක.', err_mins: 'විනාඩි 1ට වඩා වැඩි අගයක් ඇතුළත් කරන්න.',

      /* toasts */
      toast_saved: 'සුරැකිණි', toast_deleted: 'මකා දැමිණි', toast_done: 'නිම කළා', toast_snoozed: 'කල් දැමිණි', toast_exp_saved: 'වියදම සුරැකිණි',
      toast_study_saved: 'ඉගෙනුම සුරැකිණි', toast_goal_saved: 'ඉලක්කය සුරැකිණි', toast_offline: 'අන්තර්ජාලය නැත — යෙදුම දිගටම ක්‍රියා කරයි', toast_online: 'නැවත සම්බන්ධ විය',
      toast_import_ok: 'දත්ත ආයාත කළා', toast_export_ok: 'උපස්ථ ගොනුව සූදානම්', toast_notif_denied: 'දැනුම්දීම් සඳහා අවසරය නොලැබුණි. බ්‍රවුසරයේ සැකසුම් වලින් අවසර දෙන්න.',
      toast_notif_on: 'දැනුම්දීම් ක්‍රියාත්මකයි', toast_pin_set: 'රහස් අංක අගුල සකසන ලදී', toast_pin_removed: 'රහස් අංක අගුල ඉවත් කළා', toast_cleared: 'සියලු දත්ත මකා දැමිණි',
      toast_installed: 'යෙදුම ස්ථාපනය විය', toast_notif_unsupported: 'මෙම බ්‍රවුසරය දැනුම්දීම් සඳහා සහාය නොදක්වයි.', toast_storage_full: 'ගබඩාව පිරී ඇත! දත්ත උපස්ථ කරගන්න.', toast_storage_err: 'දත්ත සුරැකීමට නොහැකි විය. පෞද්ගලික කවුළුවක් නොවේදැයි බලන්න.',

      /* relative */
      when_today: 'අද', when_tomorrow: 'හෙට', late: 'ප්‍රමාදයි', late_1: 'ඊයේ ප්‍රමාදයි', late_n: 'දින {n} ප්‍රමාදයි', snoozed_to: 'කල් දැමූ',
      bday_today: 'අදයි 🎂', bday_tomorrow: 'හෙට', bday_days_one: 'දින 1', bday_days_other: 'දින {n}', bday_nth: '{n} වැනි උපන්දිනය',
      empty_rem_t: 'මතක් කිරීම් නැත', empty_rem_d: 'පාඩම්, ගෙවීම්, වැඩ — එකතු කර කිසිවක් අමතක නොකරන්න.', btn_add_rem: 'මතක් කිරීමක් එකතු කරන්න',
      empty_bday_t: 'උපන්දින නැත', empty_bday_d: 'ඔබේ අයගේ උපන්දින එකතු කරන්න — අපි මතක් කරන්නම්.', btn_add_bday: 'උපන්දිනයක් එකතු කරන්න',
      aria_done: 'නිම කළ ලෙස සලකුණු කරන්න', aria_undone: 'නිම කිරීම අහෝසි කරන්න', aria_snooze: 'කල් දමන්න', aria_edit: 'වෙනස් කරන්න', aria_week_bar: '{d}: {amt}',
      ring_aria: 'අයවැය භාවිතය {p}%', goal_aria: 'ඉලක්කය {p}%',

      /* settings */
      s_general: 'සාමාන්‍ය', s_notif: 'දැනුම්දීම්', s_data: 'දත්ත', s_security: 'ආරක්ෂාව', s_app: 'යෙදුම', s_danger: 'අවදානම් කලාපය',
      set_budget: 'මාසික අයවැය', set_cur: 'මුදල් සංකේතය', set_lang: 'භාෂාව', set_theme: 'තේමාව', theme_auto: 'ස්වයං', theme_light: 'දීප්ත', theme_dark: 'අඳුරු',
      set_notif: 'මතක් කිරීම් දැනුම්දීම්', set_notif_d: 'යෙදුම විවෘතව හෝ පසුබිමේ ඇති විට මතක් කිරීම් සහ උපන්දින ගැන දැනුම් දෙයි.',
      btn_install: 'මුල් තිරයට එකතු කරන්න', set_install_d: 'යෙදුමක් ලෙස ස්ථාපනය කර වේගයෙන් විවෘත කරන්න.',
      btn_export: 'දත්ත බාගන්න (උපස්ථය)', btn_import: 'දත්ත ආයාත කරන්න', set_backup_last: 'අවසන් උපස්ථය: {d}', backup_never: 'කිසිදාක නැත',
      set_storage: 'භාවිත ගබඩාව: {used} / {quota}', set_data_d: 'ඔබේ දත්ත තබා ඇත්තේ මෙම උපාංගයේ පමණි. නිතර උපස්ථ කරගන්න.',
      pin_lock: 'රහස් අංක අගුල', pin_lock_on: 'රහස් අංක අගුල සක්‍රියයි', pin_lock_d: 'යෙදුම විවෘත කරද්දී රහස් අංකයක් ඉල්ලයි.',
      btn_pin_set: 'රහස් අංකයක් සකසන්න', btn_pin_change: 'රහස් අංකය වෙනස් කරන්න', btn_pin_remove: 'රහස් අංකය ඉවත් කරන්න',
      btn_clear_data: 'සියලු දත්ත මකන්න', set_clear_d: 'මෙම උපාංගයේ ඇති සියලු වියදම්, මතක් කිරීම්, උපන්දින සහ ඉගෙනුම් දත්ත ස්ථිරවම මැකේ.',
      confirm_clear_t: 'සියලු දත්ත මකන්නද?', confirm_clear_d: 'මෙය නැවත ලබාගත නොහැක. මකන්න කලින් උපස්ථයක් ගන්න.',
      confirm_pin_remove_t: 'රහස් අංක අගුල ඉවත් කරමුද?', confirm_pin_remove_d: 'ඉන්පසු යෙදුම රහස් අංකයකින් තොරව විවෘත වේ.',
      set_version: 'අනුවාදය {v}',

      /* import */
      imp_title: 'ආයාත කිරීමට පෙර', imp_found: 'ගොනුවේ ඇත්තේ:', imp_choose: 'දැනට ඇති දත්ත ආදේශ කරමුද, නැතිනම් ඒකාබද්ධ කරමුද?',
      imp_replace: 'ආදේශ කරන්න', imp_merge: 'ඒකාබද්ධ කරන්න', imp_invalid: 'මෙය වලංගු “මගේ දවස” උපස්ථ ගොනුවක් නොවේ.', imp_big: 'ගොනුව විශාල වැඩියි (මෙගාබයිට් 5 ට වැඩි).',
      imp_exp: 'වියදම්', imp_rem: 'මතක් කිරීම්', imp_bday: 'උපන්දින', imp_study: 'ඉගෙනුම් වේලා', imp_exam: 'විභාග',
      backup_banner: 'ඔබේ දත්ත ඇත්තේ මෙම උපාංගයේ පමණි. නැතිවීමෙන් ආරක්ෂා වීමට උපස්ථයක් ගන්න.', btn_backup_now: 'උපස්ථ කරන්න',

      /* PIN */
      pin_enter: 'රහස් අංකය ඇතුළත් කරන්න', pin_wrong: 'රහස් අංකය වැරදියි', pin_left_one: 'උත්සාහ 1ක් ඉතිරියි', pin_left_other: 'උත්සාහ {n}ක් ඉතිරියි', pin_wait: 'ටිකක් රැඳී සිට නැවත උත්සාහ කරන්න (තත්පර {s})',
      pin_forgot: 'රහස් අංකය අමතකද?', pin_forgot_t: 'රහස් අංකය යළි පිහිටුවමුද?', pin_forgot_d: 'රහස් අංකය යළි පිහිටුවීමට ඔබේ සියලු දත්ත මැකිය යුතුය. මෙය නැවත ලබාගත නොහැක.', pin_forgot_go: 'දත්ත මකා යළි පිහිටුවන්න', pin_back: 'ආපසු',
      pin_set_t: 'රහස් අංකයක් සකසන්න', pin_change_t: 'රහස් අංකය වෙනස් කරන්න', pin_old: 'දැනට ඇති රහස් අංකය', pin_new: 'නව රහස් අංකය (ඉලක්කම් 4–6)', pin_confirm: 'රහස් අංකය නැවත ඇතුළත් කරන්න',
      pin_mismatch: 'රහස් අංක දෙක ගැළපෙන්නේ නැත.', pin_short: 'රහස් අංකය ඉලක්කම් 4–6ක් විය යුතුය.', pin_wrong_old: 'දැනට ඇති රහස් අංකය වැරදියි.',
      pin_note: 'මෙය තිර අගුලක් පමණි — දත්ත සංකේතනය නොකරයි.', lock_aria: 'යෙදුම අගුළු දමා ඇත',

      /* notifications */
      notif_time: 'වේලාව {t}', notif_today: 'අද', notif_bday_today: '{n} ගේ උපන්දිනය අදයි 🎂', notif_bday_today_b: 'සුබ පතන්න අමතක කරන්න එපා!',
      notif_bday_tom: '{n} ගේ උපන්දිනය හෙට', notif_bday_tom_b: 'සූදානම් වෙන්න.',

      /* system */
      sw_update: 'නව අනුවාදයක් ඇත', sw_reload: 'යාවත්කාලීන කරන්න', offline: 'අන්තර්ජාලය නැත', skip: 'ප්‍රධාන අන්තර්ගතයට යන්න'
    },

    en: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      days_s: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],

      tab_mem: 'Journal', title_mem: 'Memories & Experiences', sub_mem: 'Keep the moments that matter', add_mem: 'Memory', add_mem_d: 'A memory, experience or lesson', new_mem: 'New entry', edit_mem: 'Edit entry',
      mem_memory: 'Memory', mem_experience: 'Experience', mem_lesson: 'Lesson', mem_all: 'All', mem_fav: 'Favourites', fld_mem_title: 'Title', fld_mem_body: 'Your notes', fld_mood: 'Mood',
      ph_mem_title: 'e.g. First school trip', ph_mem_body: 'What happened? How did it feel?', mem_none: 'No matching entries.', empty_mem_t: 'No entries yet', empty_mem_d: 'Save lovely memories, new experiences and lessons you learned.',
      btn_add_mem: 'Add an entry', mem_search: 'Search entries…', aria_fav: 'Mark as favourite', imp_mem: 'Journal entries',
      aria_backspace: 'Backspace', aria_ok: 'Confirm', pin_https: 'A PIN needs a secure (https) connection.', share_title: 'My Day backup',
      u_thou: 'k', u_mil: 'M', u_b: 'B', u_kb: 'KB', u_mb: 'MB',
      app_name: 'My Day',
      greet_morn: 'Good morning', greet_day: 'Good afternoon', greet_eve: 'Good evening', greet_night: 'Good night',

      tab_today: 'Today', tab_spend: 'Spend', tab_study: 'Study', tab_remind: 'Remind', tab_bday: 'Birthdays', tab_set: 'Settings',
      title_spend: 'Spending', title_study: 'Study', title_remind: 'Reminders', title_bday: 'Birthdays', title_set: 'Settings',
      sub_remind: 'Lessons, payments, tasks', sub_bday: 'Special days of your people', sub_set: 'Make the app yours',

      /* v3.6 · accommodation, more, assistant */
      cat_stay: 'Accommodation',
      tab_more: 'More', tab_chat: 'Assistant', title_chat: 'AI Assistant', sub_chat: 'Ask about your money, study and plans', title_more: 'More',
      more_bday_d: 'Never miss a special day', more_mem_d: 'Memories & lessons', more_chat_d: 'Ask your AI helper', more_set_d: 'Budget, theme, backup',
      aria_edit: 'Edit',
      chat_ph: 'Ask anything about your day…', chat_send: 'Send', chat_clear: 'Clear chat', chat_clear_t: 'Clear conversation?', chat_clear_d: 'This removes the chat history on this device.',
      chat_mode_ai: 'Smart AI', chat_mode_local: 'On-device', chat_thinking: 'Thinking…',
      cs_t: 'AI Assistant — coming soon', cs_d: 'We are working on a smarter assistant. It will be available in a future update.', h_todos: 'To-do', add_todo: 'To-do', new_todo: 'New to-do', edit_todo: 'Edit to-do', fld_todo: 'Task', todo_add: 'Add task', todo_clear: 'Clear done', todo_empty_t: 'No tasks yet', todo_empty_d: 'Add things you need to study or finish.', aria_todo_done: 'Mark task as done', aria_todo_undone: 'Mark task as not done', imp_todo: 'To-do tasks', safe_restored: 'Your data was restored from the backup copy on this device.', safe_inapp: 'You are in an in-app browser (WhatsApp, Facebook, Instagram...). Saved data can be erased here. Open this link in Chrome or Safari and install the app.', safe_ios: 'On iPhone: tap Share, then Add to Home Screen. Data saved in a Safari tab can be erased after a few days, and notifications only work from the Home Screen app.', safe_backup: 'Back up your data so it cannot be lost.', safe_backup_btn: 'Back up', safe_notif: 'Turn on notifications to get reminders.', safe_notif_btn: 'Turn on', notif_test: 'Send a test notification', notif_test_t: 'My Day', notif_test_b: 'Notifications are working.', notif_limit: 'Reminders are shown while the app is open or was used recently. Phones pause closed web apps, so a reminder may arrive late when the app is closed.', notif_ios: 'On iPhone, add the app to the Home Screen first.', rep_btn: 'PDF report', rep_title: 'Expense report', rep_from: 'From', rep_to: 'To', rep_this: 'This month', rep_last: 'Last month', rep_3m: 'Last 3 months', rep_year: 'This year', rep_make: 'Create PDF', rep_note: 'Your browser print window opens. Choose "Save as PDF" as the destination.', rep_err: 'Choose a valid range (From must not be after To).', rep_none: 'No expenses in this range.', rep_generated: 'Generated', rep_cat: 'Category', rep_amount: 'Amount', rep_tx: 'Transactions', rep_date: 'Date', rep_note_col: 'Note',
      chat_welcome_t: 'Hi! I’m your My Day assistant', chat_welcome_d: 'I answer from your own data — spending, study, reminders and birthdays — and I can add expenses for you.',
      chat_q1: 'How much did I spend this month?', chat_q2: 'Accommodation spending', chat_q3: 'What is due today?', chat_q4: 'Study this week', chat_q5: 'Upcoming birthdays', chat_q6: 'Budget left',
      chat_ai_t: 'Turn on Smart AI', chat_ai_d: 'Get richer answers from an online AI. A short summary of your data (never your PIN) is sent to your own server function. You can switch it off any time.',
      chat_ai_on: 'Enable', chat_ai_later: 'Not now',
      chat_fallback: 'AI is unavailable right now — answered on-device.', chat_auth: 'The access code is wrong. Fix it in Settings → Assistant.',
      chat_err_nofn: 'The AI function is not deployed on this site (deploy via Git or Netlify CLI).', chat_err_key: 'ANTHROPIC_API_KEY is not set in Netlify.', chat_err_up: 'The AI service returned an error (check key / model).', chat_err_origin: 'Request blocked by the origin check (ALLOWED_ORIGIN).', chat_err_slow: 'The AI took too long to answer.', chat_err_net: 'Could not reach the AI.',
      chat_save: 'Save expense', chat_saved: 'Saved',
      s_ai: 'Assistant', set_ai: 'Smart AI mode', set_ai_d: 'Send a summary of your data to the AI for richer answers', set_ai_code: 'Access code (only if you set one)',

      cat_food: 'Food', cat_trans: 'Transport', cat_bill: 'Bills', cat_learn: 'Learning', cat_health: 'Health', cat_fun: 'Fun', cat_other: 'Other',
      kind_study: 'Study', kind_pay: 'Payment', kind_task: 'Task',
      rep_none: 'Once', rep_daily: 'Daily', rep_weekly: 'Weekly', rep_monthly: 'Monthly',
      snooze_10m: 'In 10 minutes', snooze_1h: 'In 1 hour', snooze_tom: 'Tomorrow',

      h_tasks: 'Due today', h_week: 'Last 7 days', h_bdays: 'Upcoming birthdays', h_exams: 'Upcoming exams',
      h_by_cat: 'By category', h_overdue: 'Overdue', h_today: 'Today', h_upcoming: 'Upcoming', h_done: 'Completed',
      h_add_what: 'What would you like to add?', h_snooze: 'Snooze', h_subjects: 'By subject (this week)', h_recent: 'Recent sessions',
      h_this_month: 'This month', h_later: 'Later',

      hero_month: '{mon} spending', hero_today: 'Today {amt}', hero_budget: 'Budget {amt}',
      hero_set_budget: 'Set a monthly budget', safe_day: 'Safe to spend per day', over_bud: 'Over budget', over_by: 'Over by {amt}',
      days_left_one: '1 day left', days_left_other: '{n} days left',
      stat_study: 'Studied today', stat_streak: 'Day streak', stat_tasks: 'Tasks left',
      empty_today_t: 'Nothing due today', empty_today_d: 'Enjoy the free day — or add a new reminder.',
      empty_bdays_soon: 'No birthdays in the next 30 days.',

      sp_total: 'Monthly total', sp_top: 'Top category', sp_avg: 'Daily average', sp_count: 'Entries',
      sp_vs_up: '{amt} more than last month', sp_vs_down: '{amt} less than last month',
      search_ph: 'Search expenses…', search_clear: 'Clear', search_none: 'Nothing found for “{q}”.',
      empty_spend_t: 'No expenses yet', empty_spend_d: 'You haven’t logged anything this month.', btn_add_exp: 'Add an expense',
      prev_mon: 'Previous month', next_mon: 'Next month', yesterday: 'Yesterday', day_before: '2 days ago', recurring_tag: 'Recurring',

      st_week: 'Studied this week', st_today: 'Today {v}', st_streak_one: '1-day streak', st_streak_other: '{n}-day streak', st_goal: 'Weekly goal',
      st_goal_ask: 'How many hours per week?', st_goal_hint: 'hours', st_timer: 'Study timer', st_timer_run: 'Studying…', st_start: 'Start', st_stop: 'Stop & save', st_discard: 'Discard',
      st_no_exam_t: 'No upcoming exams', st_no_exam_d: 'Add an exam to see the countdown.',
      st_empty_t: 'No study sessions yet', st_empty_d: 'Start the timer or add one manually.',
      u_h: 'h', u_m: 'm', exam_in: 'in {n} days', goal_set_btn: 'Change goal',

      add_exp: 'Expense', add_rem: 'Reminder', add_bday: 'Birthday', add_study: 'Study session', add_exam: 'Exam',
      new_exp: 'New expense', new_rem: 'New reminder', new_bday: 'New birthday', new_study: 'Study session', new_exam: 'New exam',
      edit_exp: 'Edit expense', edit_rem: 'Edit reminder', edit_bday: 'Edit birthday', edit_study: 'Edit session', edit_exam: 'Edit exam',
      add_exp_d: 'Something you spent', add_rem_d: 'Lessons, payments, tasks', add_bday_d: 'Never forget to wish them', add_study_d: 'Log time you studied', add_exam_d: 'A coming exam',
      fld_amount: 'Amount', fld_cat: 'Category', fld_note: 'Note', fld_note_opt: 'Note (optional)', fld_date: 'Date', fld_repeat: 'Repeat', fld_title: 'What should we remind you of?',
      fld_kind: 'Type', fld_time: 'Time', fld_name: 'Name', fld_bdate: 'Date of birth', fld_subject: 'Subject', fld_mins: 'Minutes', fld_exam: 'Exam / deadline',
      ph_title: 'e.g. Maths revision', ph_name: 'e.g. Mum', ph_subject: 'e.g. Maths', ph_note: 'e.g. Lunch',
      btn_save: 'Save', btn_delete: 'Delete', btn_cancel: 'Cancel', btn_close: 'Close', btn_undo: 'Undo', btn_add_new: 'Add new', btn_add: 'Add',
      err_amount: 'Enter a valid amount.', err_text: 'This field can’t be empty.', err_mins: 'Enter at least 1 minute.',

      toast_saved: 'Saved', toast_deleted: 'Deleted', toast_done: 'Marked done', toast_snoozed: 'Snoozed', toast_exp_saved: 'Expense saved',
      toast_study_saved: 'Session saved', toast_goal_saved: 'Goal saved', toast_offline: 'You’re offline — the app keeps working', toast_online: 'Back online',
      toast_import_ok: 'Data imported', toast_export_ok: 'Backup file ready', toast_notif_denied: 'Notification permission wasn’t granted. Allow it in your browser settings.',
      toast_notif_on: 'Notifications are on', toast_pin_set: 'PIN lock set', toast_pin_removed: 'PIN lock removed', toast_cleared: 'All data cleared',
      toast_installed: 'App installed', toast_notif_unsupported: 'This browser doesn’t support notifications.', toast_storage_full: 'Storage is full! Please back up your data.', toast_storage_err: 'Couldn’t save your data. Are you in a private window?',

      when_today: 'Today', when_tomorrow: 'Tomorrow', late: 'Overdue', late_1: '1 day overdue', late_n: '{n} days overdue', snoozed_to: 'Snoozed to',
      bday_today: 'Today 🎂', bday_tomorrow: 'Tomorrow', bday_days_one: '1 day', bday_days_other: '{n} days', bday_nth: '{n} birthday',
      empty_rem_t: 'No reminders', empty_rem_d: 'Add lessons, payments and tasks so nothing slips.', btn_add_rem: 'Add a reminder',
      empty_bday_t: 'No birthdays yet', empty_bday_d: 'Add your people’s birthdays and we’ll remind you.', btn_add_bday: 'Add a birthday',
      aria_done: 'Mark as done', aria_undone: 'Mark as not done', aria_snooze: 'Snooze', aria_edit: 'Edit', aria_week_bar: '{d}: {amt}',
      ring_aria: 'Budget used {p}%', goal_aria: 'Goal {p}%',

      s_general: 'General', s_notif: 'Notifications', s_data: 'Data', s_security: 'Security', s_app: 'App', s_danger: 'Danger zone',
      set_budget: 'Monthly budget', set_cur: 'Currency symbol', set_lang: 'Language', set_theme: 'Theme', theme_auto: 'Auto', theme_light: 'Light', theme_dark: 'Dark',
      set_notif: 'Reminder notifications', set_notif_d: 'Alerts you about reminders and birthdays while the app is open or running in the background.',
      btn_install: 'Add to Home screen', set_install_d: 'Install as an app for faster access.',
      btn_export: 'Export data (JSON)', btn_import: 'Import data', set_backup_last: 'Last backup: {d}', backup_never: 'never',
      set_storage: 'Storage used: {used} / {quota}', set_data_d: 'Your data lives only on this device. Back it up regularly.',
      pin_lock: 'PIN lock', pin_lock_on: 'PIN lock is on', pin_lock_d: 'Ask for a PIN whenever the app opens.',
      btn_pin_set: 'Set a PIN', btn_pin_change: 'Change PIN', btn_pin_remove: 'Remove PIN',
      btn_clear_data: 'Clear all data', set_clear_d: 'Permanently deletes every expense, reminder, birthday and study record on this device.',
      confirm_clear_t: 'Clear all data?', confirm_clear_d: 'This can’t be undone. Take a backup first.',
      confirm_pin_remove_t: 'Remove PIN lock?', confirm_pin_remove_d: 'The app will open without a PIN.',
      set_version: 'Version {v}',

      imp_title: 'Before importing', imp_found: 'This file contains:', imp_choose: 'Replace your current data, or merge it in?',
      imp_replace: 'Replace', imp_merge: 'Merge', imp_invalid: 'That isn’t a valid My Day backup file.', imp_big: 'That file is too large (over 5MB).',
      imp_exp: 'Expenses', imp_rem: 'Reminders', imp_bday: 'Birthdays', imp_study: 'Study sessions', imp_exam: 'Exams',
      backup_banner: 'Your data lives only on this device. Take a backup so you never lose it.', btn_backup_now: 'Back up',

      pin_enter: 'Enter PIN', pin_wrong: 'Wrong PIN', pin_left_one: '1 attempt left', pin_left_other: '{n} attempts left', pin_wait: 'Too many tries — wait {s}s',
      pin_forgot: 'Forgot PIN?', pin_forgot_t: 'Reset your PIN?', pin_forgot_d: 'To reset your PIN, all data on this device must be erased. This can’t be undone.', pin_forgot_go: 'Erase data & reset', pin_back: 'Back',
      pin_set_t: 'Set a PIN', pin_change_t: 'Change PIN', pin_old: 'Current PIN', pin_new: 'New PIN (4–6 digits)', pin_confirm: 'Confirm PIN',
      pin_mismatch: 'The PINs don’t match.', pin_short: 'PIN must be 4–6 digits.', pin_wrong_old: 'Current PIN is wrong.',
      pin_note: 'This is a screen lock only — it doesn’t encrypt your data.', lock_aria: 'App locked',

      notif_time: 'At {t}', notif_today: 'Today', notif_bday_today: '{n}’s birthday is today 🎂', notif_bday_today_b: 'Don’t forget to wish them!',
      notif_bday_tom: '{n}’s birthday is tomorrow', notif_bday_tom_b: 'Get ready.',

      sw_update: 'A new version is ready', sw_reload: 'Update', offline: 'Offline', skip: 'Skip to content'
    }
  };

  window.L = { lang: 'en', strings: STR };

  function interp(val, params) {
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        val = val.split('{' + k + '}').join(String(params[k]));
      });
    }
    return val;
  }

  window.t = function (key, params) {
    var s = STR[window.L.lang] || STR.en;
    var val = s[key] !== undefined ? s[key] : (STR.en[key] !== undefined ? STR.en[key] : key);
    return typeof val === 'string' ? interp(val, params) : val;
  };

  window.tn = function (key, n, params) {
    var p = Object.assign({ n: n }, params || {});
    var s = STR[window.L.lang] || STR.en;
    var k = key + (n === 1 ? '_one' : '_other');
    if (s[k] === undefined && STR.en[k] === undefined) k = key + '_other';
    return window.t(k, p);
  };

  window.ordinal = function (n) {
    if (window.L.lang !== 'en') return String(n);
    var v = n % 100;
    if (v >= 11 && v <= 13) return n + 'th';
    return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  };

  window.setLang = function (lang) {
    if (!STR[lang]) return;
    window.L.lang = lang;
    try { localStorage.setItem('myday:lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.title = window.t('app_name');
    if (typeof window.renderApp === 'function') window.renderApp();
  };

  window.getLang = function () { return window.L.lang; };

  (function boot() {
    var saved = '';
    try { saved = localStorage.getItem('myday:lang') || ''; } catch (e) {}
    if (saved === 'si' || saved === 'en') {
      window.L.lang = saved;
      document.documentElement.lang = saved;
    }
  })();
})();
