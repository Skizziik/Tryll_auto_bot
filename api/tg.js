// Telegram webhook pre-filter (Vercel serverless function).
// Forwards ONLY relevant updates to n8n; drops group chatter so it doesn't
// burn n8n executions. Env: N8N_WEBHOOK_URL, TG_SECRET (optional).

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
      if (NOTE_TOPICS.some(function (t) { return t.chat === chat && t.thread === thread; })) return true;
    }
    if (typeof m.text === 'string' && m.text.indexOf('/research') === 0) return true;
    return false;
  }
  const cb = u && u.callback_query;
  if (cb) {
    const d = cb.data || '';
    if (d === 'save' || d === 'cancel' || d.indexOf('rs:') === 0) return true;
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(200).send('ok'); return; }

  const secret = process.env.TG_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    res.status(200).send('ok');
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
    } catch (e) { /* still 200 so Telegram doesn't retry-storm */ }
  }
  res.status(200).send('ok');
};
