// theme-init.js — runs before first paint to prevent flash
// Reads saved theme + lang from localStorage and applies them immediately.
(function(){
  try{
    var th=localStorage.getItem('myday:theme');
    if(th==='dark'||th==='light') document.documentElement.dataset.theme=th;
    var lg=localStorage.getItem('myday:lang');
    if(lg==='si'||lg==='en'){
      document.documentElement.lang=lg;
      /* update <title> so English users never see Sinhala title */
      if(lg==='en') document.title='My Day';
    }
  }catch(e){}
})();

