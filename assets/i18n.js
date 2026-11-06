/* i18n.js — My Day internationalisation
   - window.t(key, params)   : translate with {param} interpolation; falls back to key string (never undefined)
   - window.setLang(lang)    : switch language, sets localStorage, re-renders
   - window.getLang()        : return current lang code
   Language is initialised from localStorage before app.js runs.
*/
(function () {
  'use strict';

  var STR = {
    si: {
      months: ['ජනවාරි','පෙබරවාරි','මාර්තු','අප්‍රේල්','මැයි','ජූනි','ජූලි','අගෝස්තු','සැප්තැම්බර්','ඔක්තෝබර්','නොවැම්බර්','දෙසැම්බර්'],
      days:   ['ඉරිදා','සඳුදා','අඟහරුවාදා','බදාදා','බ්‍රහස්පතින්දා','සිකුරාදා','සෙනසුරාදා'],
      /* categories */
      cat_food:'ආහාර', cat_trans:'ප්‍රවාහන', cat_bill:'බිල්පත්',
      cat_learn:'ඉගෙනුම්', cat_health:'සෞඛ්‍යය', cat_fun:'විනෝදය', cat_other:'වෙනත්',
      /* reminder kinds */
      kind_study:'ඉගෙනුම', kind_pay:'ගෙවීම්', kind_task:'වෙනත්',
      /* repeat */
      rep_none:'එක් වතාවක්', rep_daily:'දිනපතා', rep_weekly:'සතිපතා', rep_monthly:'මාසිකව',
      /* snooze */
      snooze_10m:'10 min', snooze_1h:'පැය 1', snooze_tom:'හෙට',
      /* greeting */
      greet_morn:'සුභ උදෑසනක්', greet_day:'සුභ දහවලක්', greet_eve:'සුභ සන්ධ්‍යාවක්',
      /* nav */
      tab_today:'අද', tab_spend:'වියදම්', tab_remind:'මතක්', tab_bday:'උපන්දින',
      /* headings */
      h_today_tasks:'අද කළ යුතු දේ', h_upcoming_bdays:'ඉදිරි උපන්දින',
      h_month_spend:'{mon} මාසයේ වියදම', h_month_total:'මාසික මුළු වියදම',
      h_by_cat:'වර්ග අනුව', h_reminders:'මතක් කිරීම්', h_done:'නිම කළ',
      h_birthdays:'උපන්දින', h_settings:'සැකසුම්', h_add_what:'මොනවා එකතු කරමුද?',
      h_snooze:'කල් දමන්න',
      /* form add/edit */
      add_exp:'වියදමක්', add_rem:'මතක් කිරීමක්', add_bday:'උපන්දිනයක්',
      edit_suffix:'වෙනස් කරන්න', add_suffix:'එකතු කරන්න',
      /* form fields */
      fld_amount:'මුදල', fld_cat:'වර්ගය', fld_note:'සටහන', fld_date:'දිනය',
      fld_recurring:'නැවත', fld_title:'මතක් කළ යුත්තේ කුමක්ද?', fld_kind:'වර්ගය',
      fld_time:'වේලාව', fld_repeat:'නැවත නැවත', fld_name:'නම',
      fld_bdate:'උපන් දිනය',
      /* buttons */
      btn_save:'සුරකින්න', btn_delete:'මකන්න', btn_cancel:'අවලංගු',
      btn_install:'App එක install කරන්න', btn_export:'දත්ත බාගන්න (JSON)',
      btn_import:'දත්ත ආයාත කරන්න (JSON)',
      btn_notif_on:'දැනුම්දීම් ක්‍රියාත්මක කරන්න',
      btn_notif_off:'දැනුම්දීම් ක්‍රියාත්මකයි (නවත්වන්න)',
      btn_pin_set:'PIN අගුළ සකසන්න', btn_pin_change:'PIN වෙනස් කරන්න',
      btn_pin_remove:'PIN ඉවත් කරන්න',
      btn_clear_data:'සියලු දත්ත මකන්න',
      /* settings */
      set_budget:'මාසික අයවැය', set_cur:'මුදල් සංකේතය',
      set_lang:'භාෂාව', set_theme:'තේමාව',
      theme_auto:'ස්වයංක්‍රීය', theme_light:'දීප්ත', theme_dark:'අඳුරු',
      lang_toggle:'සිං / EN',
      /* relative time */
      when_today:'අද', when_tomorrow:'හෙට',
      when_yesterday_late:'ඊයේ ප්‍රමාදයි', when_days_late:'දින {n} ප්‍රමාදයි',
      /* birthday */
      bday_today:'අදයි 🎂', bday_tomorrow:'හෙට',
      bday_days:'දින {n}', bday_nth:'{n} වැනි උපන්දිනය',
      /* today view */
      today_today_spend:'අද: {amt}', today_set_budget:'අයවැයක් සැකසුම්වල දමන්න',
      ring_aria:'අයවැය භාවිතය', prev_mon_aria:'කලින් මාසය', next_mon_aria:'ඊළඟ මාසය',
      diff_text:'{dir} {amt} (කලින් මාසයට සාපේක්ෂව)',
      /* aria */
      aria_done:'නිම කළා', aria_snooze:'කල් දමන්න', aria_edit:'වෙනස් කරන්න',
      aria_settings:'සැකසුම්',
      aria_add:'අලුතින් එකතු කරන්න', aria_theme:'තේමාව', aria_lang:'භාෂාව',
      /* empty states */
      empty_today:'අද මතක් කිරීම් නැත. නිදහස් දවසක්!',
      empty_upcoming_bdays:'දින 30ක් ඇතුළත උපන්දින නැත.',
      empty_reminders:'මතක් කිරීම් නැත. පාඩම්, ගෙවීම්, වැඩ — + ඔබා එකතු කරන්න.',
      empty_bdays:'උපන්දින නැත. + ඔබා පළමු උපන්දිනය ඇතුළත් කරන්න.',
      empty_spend:'මෙම මාසයේ වියදම් නැත. + ඔබා පළමු වියදම ඇතුළත් කරන්න.',
      /* confirm / alert */
      confirm_delete:'මකන්නද?',
      confirm_clear_data:'සියලු දත්ත මකා දමමුද? මෙය 되돌릴නොහැකිය.',
      alert_notif_no_support:'මෙම බ්‍රව්සරය දැනුම්දීම් සඳහා සහාය නොදක්වයි.',
      alert_net_err:'ජාල දෝෂයකි.',
      alert_generic_err:'දෝෂයකි. නැවත උත්සාහ කරන්න.',
      /* notifications */
      notif_time_prefix:'වේලාව ', notif_today:'අද',
      notif_bday_today_body:'සුබ පතන්න අමතක කරන්න එපා!',
      notif_bday_tomorrow_title:' ගේ උපන්දිනය හෙට',
      notif_bday_today_title:' ගේඋපන්දිනය අදයි 🎂',
      notif_bday_tomorrow_body:'සූදානම් වෙන්න.',
      late:'ප්‍රමාදයි',
      /* search */
      search_placeholder:'සොයන්න…', search_aria:'වියදම් සොයන්න',
      /* backup / export / import */
      backup_last:'අවසන් backup', backup_never:'කිසිදාක නැත',
      backup_reminder:'ඔබේ දත්ත backup කිරීමෙන් ගොනු නැතිවීමෙන් ආරක්ෂා වෙන්න.',
      btn_backup_now:'දැන් backup කරන්න',
      import_preview_title:'ආයාත කිරීමට පෙර', import_choose:'ආදේශ කිරීමද නැතිනම් ඒකාබද්ධ කිරීමද?',
      import_replace:'ආදේශ කරන්න', import_merge:'ඒකාබද්ධ කරන්න',
      import_ok:'දත්ත ආයාත කළා!', import_invalid:'වලංගු My Day backup ගොනුවක් නොවේ.',
      /* PIN */
      pin_enter:'PIN ඇතුළත් කරන්න', pin_wrong:'PIN වැරදියි.',
      pin_wrong_old:'දැනට ඇති PIN වැරදියි.',
      pin_too_many:'ඉතා බොහෝ වාර ගණනක් උත්සාහ කළා.',
      pin_set:'PIN සකසන්න', pin_change:'PIN වෙනස් කරන්න',
      pin_old:'දැනට ඇති PIN', pin_new:'නව PIN (ඉලක්කම් 4-6)',
      pin_confirm:'නැවත PIN ඇතුළත් කරන්න', pin_mismatch:'PIN ගැළපෙන්නේ නැත.',
      pin_too_short:'PIN ඉලක්කම් 4 ට වැඩිවිය යුතුය.',
      pin_set_ok:'PIN සාර්ථකව සකසා ඇත.',
      pin_remove_confirm:'PIN ඉවත් කිරීමට කැමතිද?',
      pin_forgot:'PIN අමතකදැයි?',
      pin_forgot_explain:'PIN reset කිරීමට ඔබේ සියලු දත්ත ඉවත් කළ යුතු වේ. මෙය redo කළ නොහැකිය.',
      pin_note:'PIN data encrypt නොකරයි. PIN යනු screen lock පමණකි.',
      /* storage */
      storage_loading:'ගබඩා ප්‍රමාණය ගණනය කරමින්…',
      storage_used:'භාවිත කළ ගබඩාව',
      /* storage error */
      err_storage_full:'ගබඩාව පිරී ඇත! backup ගන්නා ලෙස ඉල්ලා සිටිමු.',
      /* SW update */
      sw_update:'නව version ලබා ගත හැකිය.', sw_reload:'නැවත ලෝඩ් කරන්න',
      /* doc title */
      doc_title:'මගේ දවස'
    },
    en: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      days:   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      cat_food:'Food', cat_trans:'Transport', cat_bill:'Bills',
      cat_learn:'Learning', cat_health:'Health', cat_fun:'Fun', cat_other:'Other',
      kind_study:'Study', kind_pay:'Payment', kind_task:'Task',
      rep_none:'Once', rep_daily:'Daily', rep_weekly:'Weekly', rep_monthly:'Monthly',
      snooze_10m:'10 min', snooze_1h:'1 hour', snooze_tom:'Tomorrow',
      greet_morn:'Good morning', greet_day:'Good afternoon', greet_eve:'Good evening',
      tab_today:'Today', tab_spend:'Expenses', tab_remind:'Reminders', tab_bday:'Birthdays',
      h_today_tasks:'Due Today', h_upcoming_bdays:'Upcoming Birthdays',
      h_month_spend:'{mon} Spending', h_month_total:'Monthly Total',
      h_by_cat:'By Category', h_reminders:'Reminders', h_done:'Completed',
      h_birthdays:'Birthdays', h_settings:'Settings', h_add_what:'What to add?',
      h_snooze:'Snooze',
      add_exp:'Expense', add_rem:'Reminder', add_bday:'Birthday',
      edit_suffix:'Edit', add_suffix:'Add',
      fld_amount:'Amount', fld_cat:'Category', fld_note:'Note', fld_date:'Date',
      fld_recurring:'Repeat', fld_title:'What to remember?', fld_kind:'Category',
      fld_time:'Time', fld_repeat:'Repeat', fld_name:'Name',
      fld_bdate:'Birth date',
      btn_save:'Save', btn_delete:'Delete', btn_cancel:'Cancel',
      btn_install:'Install App', btn_export:'Export Data (JSON)',
      btn_import:'Import Data (JSON)',
      btn_notif_on:'Enable Notifications',
      btn_notif_off:'Notifications On (disable)',
      btn_pin_set:'Set PIN Lock', btn_pin_change:'Change PIN',
      btn_pin_remove:'Remove PIN',
      btn_clear_data:'Clear All Data',
      set_budget:'Monthly Budget', set_cur:'Currency Symbol',
      set_lang:'Language', set_theme:'Theme',
      theme_auto:'Auto', theme_light:'Light', theme_dark:'Dark',
      lang_toggle:'සිං / EN',
      when_today:'Today', when_tomorrow:'Tomorrow',
      when_yesterday_late:'1 day overdue', when_days_late:'{n} days overdue',
      bday_today:'Today 🎂', bday_tomorrow:'Tomorrow',
      bday_days:'{n} days', bday_nth:'{n}th birthday',
      today_today_spend:'Today: {amt}', today_set_budget:'Set a budget in Settings',
      ring_aria:'Budget usage', prev_mon_aria:'Previous month', next_mon_aria:'Next month',
      diff_text:'{dir} {amt} vs last month',
      aria_done:'Mark done', aria_snooze:'Snooze', aria_edit:'Edit',
      aria_settings:'Settings',
      aria_add:'Add new', aria_theme:'Theme', aria_lang:'Language',
      empty_today:'No reminders today. Enjoy your day!',
      empty_upcoming_bdays:'No birthdays in 30 days.',
      empty_reminders:'No reminders. Add studies, payments, tasks with +.',
      empty_bdays:'No birthdays. Add the first one with +.',
      empty_spend:'No expenses this month. Add the first with +.',
      confirm_delete:'Delete this?',
      confirm_clear_data:'Delete all data? This cannot be undone.',
      alert_notif_no_support:"This browser doesn't support notifications.",
      alert_net_err:'Network error.',
      alert_generic_err:'Error. Please try again.',
      notif_time_prefix:'Time: ', notif_today:'Today',
      notif_bday_today_body:"Don't forget to wish them!",
      notif_bday_tomorrow_title:"'s birthday tomorrow",
      notif_bday_today_title:"'s birthday is today 🎂",
      notif_bday_tomorrow_body:'Get ready.',
      late:'Overdue',
      search_placeholder:'Search…', search_aria:'Search expenses',
      backup_last:'Last backup', backup_never:'Never',
      backup_reminder:'Back up your data to protect against data loss.',
      btn_backup_now:'Back up now',
      import_preview_title:'Import Preview', import_choose:'Replace existing data or merge?',
      import_replace:'Replace', import_merge:'Merge',
      import_ok:'Data imported!', import_invalid:'Not a valid My Day backup file.',
      pin_enter:'Enter PIN', pin_wrong:'Wrong PIN.',
      pin_wrong_old:'Current PIN is wrong.',
      pin_too_many:'Too many attempts.',
      pin_set:'Set PIN', pin_change:'Change PIN',
      pin_old:'Current PIN', pin_new:'New PIN (4-6 digits)',
      pin_confirm:'Confirm PIN', pin_mismatch:"PINs don't match.",
      pin_too_short:'PIN must be at least 4 digits.',
      pin_set_ok:'PIN set successfully.',
      pin_remove_confirm:'Remove PIN lock?',
      pin_forgot:'Forgot PIN?',
      pin_forgot_explain:'To reset your PIN, all your data must be cleared. This cannot be undone.',
      pin_note:'PIN does not encrypt your data. It is a screen lock only.',
      storage_loading:'Calculating storage…',
      storage_used:'Storage used',
      err_storage_full:'Storage full! Please export a backup.',
      sw_update:'A new version is available.', sw_reload:'Reload',
      doc_title:'My Day'
    }
  };

  window.L = { lang: 'si', strings: STR };

  /* t(key, params) — never returns undefined; falls back to Sinhala, then key string */
  window.t = function (key, params) {
    var lang = window.L.lang;
    var s = STR[lang] || STR['si'];
    var val = (s[key] !== undefined) ? s[key]
            : (STR['si'][key] !== undefined ? STR['si'][key] : key);
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return val;
  };

  /* setLang: switches language, saves to localStorage, re-renders */
  window.setLang = function (lang) {
    if (!STR[lang]) return;
    window.L.lang = lang;
    try {
      localStorage.setItem('myday:lang', lang);
    } catch (e) {}
    document.documentElement.lang = lang === 'si' ? 'si' : 'en';
    document.title = window.t('doc_title');
    if (typeof window.renderApp === 'function') window.renderApp();
  };

  window.getLang = function () { return window.L.lang; };

  /* Boot: read from localStorage */
  (function () {
    var saved = '';
    try { saved = localStorage.getItem('myday:lang') || ''; } catch (e) {}
    if (saved === 'si' || saved === 'en') {
      window.L.lang = saved;
      document.documentElement.lang = saved === 'si' ? 'si' : 'en';
    }
  })();
})();
