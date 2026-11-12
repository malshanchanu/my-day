// netlify/functions/chat.js — "My Day" Smart AI endpoint (optional).
// The app works fully without this: if the function is missing or fails, the assistant answers on-device.
//
// Netlify → Site settings → Environment variables:
//   ANTHROPIC_API_KEY   (required)  your Anthropic API key — never put it in the front-end
//   CHAT_ACCESS_CODE    (recommended) any secret word; type the same word in the app: Settings → Assistant
//   ANTHROPIC_MODEL     (optional)  default: claude-haiku-5-5
//   ALLOWED_ORIGIN      (optional)  e.g. https://my-day.netlify.app — extra origin check

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(obj)
});

const SYSTEM = (lang, context) => `You are "My Day Assistant", the friendly helper inside a personal planner app (expenses, study, reminders, birthdays, journal).
Rules:
- Answer ONLY from the DATA below. If the data does not contain the answer, say so briefly — never invent amounts, dates or names.
- Reply in the user's language: ${lang === 'si' ? 'Sinhala (සිංහල) unless the user writes English' : 'English unless the user writes Sinhala'}. Singlish input → reply in Sinhala.
- Be concise (max ~120 words). Use short lines and "•" bullets. Wrap key numbers in **double asterisks**. No markdown headings, no tables.
- Give one practical tip only when it clearly helps (e.g. budget overspend). Never give financial, legal or medical advice beyond simple budgeting observations.
- You cannot change data. If the user wants to add an expense, tell them to say e.g. "add 1500 accommodation".

DATA:
${context}`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' });

  // Same-site only (blocks other websites from spending your API credits)
  const h = event.headers || {};
  const origin = h.origin || h.referer || '';
  const host = h.host || '';
  if (origin) {
    let oh = '';
    try { oh = new URL(origin).host; } catch (e) {}
    const okHost = oh === host || (process.env.ALLOWED_ORIGIN && origin.indexOf(process.env.ALLOWED_ORIGIN) === 0);
    if (!okHost) return json(403, { error: 'origin' });
  }

  const need = process.env.CHAT_ACCESS_CODE;
  if (need && (h['x-access-code'] || '') !== need) return json(401, { error: 'access code' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: 'no_key' });

  if ((event.body || '').length > 24000) return json(413, { error: 'too large' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad json' }); }

  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!msgs.length || msgs[0].role !== 'user' || msgs[msgs.length - 1].role !== 'user') return json(400, { error: 'messages' });
  const context = String(body.context || '').slice(0, 6000);
  const lang = body.lang === 'si' ? 'si' : 'en';

  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, temperature: 0.3, system: SYSTEM(lang, context), messages: msgs })
    });
    clearTimeout(to);
    if (!r.ok) {
      let detail = '';
      try { const e = await r.json(); detail = (e && e.error && (e.error.message || e.error.type)) || ''; } catch (x) {}
      return json(502, { error: 'upstream', status: r.status, detail: String(detail).slice(0, 160) });
    }
    const data = await r.json();
    const reply = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    if (!reply) return json(502, { error: 'empty' });
    return json(200, { reply });
  } catch (e) {
    return json(504, { error: 'timeout' });
  }
};
