# Feature: News Digest (топик «News AI»)

**Платформа:** Telegram-группа TryllAuto, топик **News AI** (`message_thread_id = 187`, chat `-1004406148635`).
**Где живёт:** n8n Cloud, воркфлоу **TryllAuto · Voice → Notes** (`WFarxoRPXfxnrqsV`) — двумя
**отдельными цепочками** на своих Schedule-триггерах (внизу канвы, ни с чем не связаны).
**Бот:** @Tryllauto_bot (только отправка; на приём не влияет).
**LLM:** Claude (cred «Anthropic (Tryll)» `Kd6puzMUt71Ko9fg`), модель `claude-sonnet-4-6`.

## Что делает

1. **Сбор новостей** — 07:00 и 17:00 CET: пробегает по RSS/Atom-лентам из таблицы `news_sources`,
   берёт только свежее (< 24 ч), отсеивает уже отправленное, спрашивает Claude — *ценна ли новость
   для Tryll Engine* (AI / AI+games / геймдев / релевантные инвестиции), Claude пишет RU-описание,
   и бот постит каждую в топик News AI.
2. **Сводка дня** — 19:00 CET: собирает всё отправленное за сегодня, Claude делает выжимку по
   индустриям, бот постит её и **закрепляет**, держа 5 последних закрепов (6-й откреп).

## Цепочка 1 — сбор (Schedule 7 & 17 CET)

```
Schedule 7 & 17 CET (cron 0 0 7 * * * + 0 0 17 * * *)
  → Read Sources (Data Table news_sources, returnAll)
  → Only Active (active == true И feed_url НЕ содержит "habr.com" — Habr отключён на уровне фильтра; строка в news_sources осталась, но игнорируется, т.к. MCP не умеет удалять строки Data Table)
  → Fetch & Parse Feeds (Code: HTTP GET с Chrome-UA + парсер RSS/Atom, 25 items/ленту)
  → Fresh & Dated (isoDate есть И >= now-24ч; без даты — выкидываем)
  → Build Claude Input (сорт по дате, cap 60, нумерация idx; подмешивает recent_sent/recent_keys из news_seen через Get Recent Sent+Aggregate Recent → Claude знает, что уже слали)
  → Claude Value Filter (chainLlm + Anthropic + Structured Parser) — отбор ценного + RU-описание + тег индустрии + event_key + метка ALREADY_SENT
  → Select Valuable (join по idx, формат сообщения, day/run/sent_at; режет дубли по event_key/recent_keys)
      → Post News (Telegram sendMessage, thread 187, HTML)
      → Record Seen (Data Table news_seen)
```

Формат сообщения:
```
🟢 AI · <b>Заголовок как в источнике</b>

Краткое описание на русском.

🔗 https://ссылка
```
Теги: 🟢 AI · 🎮 AI+GAME · 🕹 GAMEDEV · 💰 INVEST · 🔬 RESEARCH.

## Цепочка 2 — сводка дня (Schedule 19 CET)

```
Schedule 19 CET (cron 0 0 19 * * *)
  → Get Today (news_seen, day == сегодня по Europe/Berlin)
  → Aggregate Day (все строки в один item)
  → News Claude Summary (chainLlm + Anthropic) — RU-дайджест по индустриям со ссылками
  → Post Summary (Telegram sendMessage, thread 187, HTML, без превью)
  → Pin Summary (pinChatMessage)
  → Record Pin (Data Table news_pins)
  → Get Pins (news_pins, sort pinned_at ASC)
  → Find Excess Pins (Code: всё кроме 5 последних)
  → Unpin Old → Delete Old Pin (откреп + удаление строки)
```
Нет новостей за день → Get Today вернёт 0 строк → сводка просто не постится.

## Data Tables (редактируешь сам в UI n8n)

| Таблица | id | Назначение |
|---|---|---|
| `news_sources` | `cHUyEGAFsNnpqjC6` | Источники: `name, feed_url, industry, active`. Вкл/выкл/добавить = правка строки. |
| `news_seen` | `mzGzfbnB18BVmM6h` | Что уже отправлено (основа сводки): `url, title, industry, source, summary_ru, sent_at, day, run`. |
| `news_pins` | `EMRQitOd1yxnqjxe` | Закреплённые сводки для ротации 5: `message_id, pinned_at`. |

Добавить источник: новая строка в `news_sources` с **URL ленты** (не страницы), `active = true`.
Дедуп живёт в Data Table `news_seen` (`Get Recent Sent`→`Aggregate Recent`→в промпт Claude как recent_sent/recent_keys; `Record Seen` пишет отправленное) + метка ALREADY_SENT/`event_key` у Claude и `Select Valuable`. Свежесть режет `Fresh & Dated` (24ч). **Ноду `Dedup (seen before)` (removeDuplicates) удалили** — её история упиралась в 10 000 url и падала с «exceeds maximum history size», роняя весь новостной прогон; она дублировала дедуп на Data Table (см. commit `Fix news bot`).

## Источники (на старте, 30 шт.)

Тест с сервера n8n (Chrome-UA) — **28/30 отдают свежие items**:
AI/медиа: MIT Tech Review, TechCrunch, The Verge, VentureBeat, Wired, IEEE Spectrum, MarkTechPost.
Лабы: OpenAI, DeepMind, HuggingFace, Mistral, Google Research, MS Research, NVIDIA, Apple ML, AWS ML.
AI+гейминг: 80.lv, Game Developer, GamesBeat, AI&Games, Artificial Agency, RunEdge.
Индустрия/инвест: PocketGamer.biz, TheGameBusiness, MCV, GamesIndustry.biz, InvestGame, Habr AI/ML.

- **arXiv cs.AI** — добавлен, но `active = false` (слишком много шума; включишь при желании).
- **Import AI (Substack)** — отдаёт 403 серверу n8n (Substack режет дата-центровые IP). Fail-soft
  (пропускается без ошибки). Рекомендую `active = false`. Кандидат на v2 (доступ через прокси).

## Почему RSS, а не скрейп статей

RSS отдаёт `title + link + дата + описание` сразу — один прогон = десяток-другой быстрых HTTP
внутри ОДНОГО execution, без открытия каждой статьи. ~90 executions/мес (из лимита 2500).
Это и есть защита от «бомбы по деньгам/времени».

## Обработанные исходы

Дубли (url-нормализация + дедуп на Data Table news_seen + event_key/ALREADY_SENT у Claude), битый/медленный фид (try/catch — пропуск, прогон не падает),
фид без даты (выкидываем — старьё не шлём), протухший фид (фильтр свежести), Cloudflare-блок
(Chrome-UA), флуд (LLM-гейт ценности + cap 60), пустой день (сводка не постится),
лимит закрепов (ротация 5), DST (логика дня завязана на Europe/Berlin).

## Что подключить/проверить в UI (одноразово)

1. **Таймзона воркфлоу = Europe/Berlin** (Workflow Settings → Timezone) — иначе cron 7/17/19
   сработает по дефолтной tz инстанса. На корректность группировки дня не влияет (она на Berlin),
   только на час срабатывания.
2. Проверить, что на нодах **Post News / Post Summary / Pin Summary / Unpin Old** стоит cred
   **«Telegram account»** (@Tryllauto_bot), а НЕ «Telegram Bot» (Tryll Nexus).
3. На **News Claude Sonnet / Summary Claude Model** — cred «Anthropic (Tryll)».

## Стоимость

Claude Sonnet 4.6: фильтр ~$0.05–0.15/прогон × 2/день + сводка ~$0.05/день ≈ **$3–9/мес**.
n8n: ~90 executions/мес.
