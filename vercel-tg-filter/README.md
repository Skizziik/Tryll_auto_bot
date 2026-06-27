# Vercel Telegram pre-filter

Tiny serverless function that sits between Telegram and n8n so that **only
relevant updates** start an n8n execution. Group chatter is dropped here →
saves the n8n executions quota.

```
Telegram → Vercel (api/tg.js, filter) → n8n Webhook node (only relevant)
```

What passes through (everything else is dropped):
- voice / video-note in a configured note topic (see `NOTE_TOPICS` in `api/tg.js`),
- `/research` command,
- `save` / `cancel` / `rs:…` callback buttons.

## Deploy (one time)

1. **Vercel → New Project → Import** the `Tryll_auto_bot` repo.
2. **Root Directory** = `vercel-tg-filter`. Framework preset: **Other**. Deploy.
3. **Settings → Environment Variables**:
   - `N8N_WEBHOOK_URL` = `https://tryllenginemain.app.n8n.cloud/webhook/tg-filter`
   - `TG_SECRET` = any random string (e.g. 32 hex chars) — optional but recommended.
   - Redeploy after adding env vars.
4. Your function URL becomes: `https://<project>.vercel.app/api/tg`

## Point Telegram at Vercel (one time, with the bot token)

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<project>.vercel.app/api/tg" \
  -d "secret_token=<TG_SECRET>" \
  -d "drop_pending_updates=true" \
  --data-urlencode 'allowed_updates=["message","callback_query"]'
```

Check it: `curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"`

> ⚠️ Do this **after** the n8n side is switched to the Webhook node (path `tg-filter`),
> otherwise notes/research briefly stop (Telegram would point at Vercel while n8n
> still expects its own Telegram Trigger).

## To revert
Point the webhook back to n8n's Telegram Trigger (re-activate it / re-set webhook),
or just `deleteWebhook` and let n8n re-register.

## Adding a topic
Edit `NOTE_TOPICS` in `api/tg.js`, commit → Vercel auto-redeploys.
