// Telegram webhook pre-filter (Vercel serverless function).
//
// Telegram sends EVERY message the bot can see to this endpoint. We forward
// ONLY relevant updates to n8n (voice notes in the right topics, the
// save/cancel buttons, /research, and rs: callbacks). Everything else (normal
// group chatter) is answered 200 and dropped here — so it never starts an
// n8n execution and never burns the 2500/mo quota.
//
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   N8N_WEBHOOK_URL  - n8n Webhook node production URL
//                      e.g. https://tryllenginemain.app.n8n.cloud/webhook/tg-filter
//   TG_SECRET        - (optional) shared secret; must match setWebhook secret_token

// Topics where dropping a voice should create a note: { chat_id, thread_id }.
// Add a row here to enable another group/topic.
const NOTE_TOPICS = [
  { chat: -1004406148635, thread: 7 },      // TryllAuto · Notes
  { chat: -1002699410666, thread: 14347 },  // Tryll Engine · Events
];

function isRelevant(u) {
  const m = u && u.message;
  if (m) {
    const hasVoice = !!((m.voice && m.voice.file_id) || (m.video_note && m.video_note.file_id));
    if (hasVoice) {
      const chat = m.chat && m.chat.id;
      const thread = m.message_thread_id;
      if (NOTE_TOPICS.some((t) => t.chat === chat && t.thread === thread)) return true;
    }
    if (typeof m.text === 'string' && m.text.startsWith('/research')) return true;
    return false;
  }
  const cb = u && u.callback_query;
  if (cb) {
    const d = cb.data || '';
    if (d === 'save' || d === 'cancel' || d.startsWith('rs:')) return true;
  }
  return false;
}

export default async function handler(req, res) {
  // Telegram only POSTs; answer anything else quickly.
  if (req.method !== 'POST') {
    res.status(200).send('ok');
    return;
  }

  // Optional shared-secret check (Telegram sends it as a header when set).
  const secret = process.env.TG_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    res.status(200).send('ok'); // ignore silently
    return;
  }

  const update = req.body || {};

  if (isRelevant(update) && process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(update),
      });
    } catch (e) {
      // Swallow — we still 200 Telegram so it doesn't retry-storm.
    }
  }

  res.status(200).send('ok');
}
