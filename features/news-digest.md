# Feature: News Digest (топик «News AI»)

**Платформа:** Telegram-группа TryllAuto, топик **News AI** (`message_thread_id = 187`, chat `-1004406148635`).
**Где живёт:** n8n Cloud, воркфлоу **TryllAuto · Voice → Notes** (`WFarxoRPXfxnrqsV`) — двумя
**отдельными цепочками** на своих Schedule-триггерах (внизу канвы, ни с чем не связаны).
**Бот:** @Tryllauto_bot (только отправка; на приём не влияет).
**LLM:** Claude (cred «Anthropic (Tryll)» `Kd6puzMUt71Ko9fg`), модель `claude-sonnet-4-6`.

## 🎯 Tryll Radar (редизайн, сен-2026)

Из «широкой AI-ленты» → **узкий premium-радар для Tryll**. Один топик News AI, каждый пост с чипом-категорией. Только сигнал, максимальный контраст.

**Категории (чипы):**
- 🎮 **AI-IN-GAMES** — AI/on-device AI **в играх** (NPC, voice-AI, локальный инференс, генеративный контент, Unity/Unreal/Godot AI, ACE/NNE).
- 🎯 **COMPETITOR** — движения из списка конкурентов (Inworld, Convai, Glade, Player2, Artificial Agency, UndreamAI, Bitpart, NVIDIA ACE, Unity AI, Ubisoft Teammates и т.д.).
- 🧠 **LOCAL MODEL** — свежие локальные TTT/STT/TTS-модели **только от топ-лаб** (allowlist), с **вечным дедупом** (модель = один раз).
- 🔬 **RESEARCH** — ресёрч по AI в играх / локальным моделям.

**Жёсткий REJECT:** инвестиции/раунды/M&A, увольнения/закрытия, обычные релизы/ревью игр, гаджеты, генерик-AI без привязки к играм, масс-медиа, мнения, листиклы.

**Дедуп:**
- Новости/конкуренты — по `event_key` за ~2 дня (`news_seen` + `recent_keys` в промпте + `Select Valuable`).
- **Local-model — вечный**: `Build Claude Input` отдаёт `sent_model_keys` = все all-time ключи с `industry='local-model'` из `news_seen`; `Select Valuable` дропает уже отправленную модель.

**Три пути сбора (все в топик 187):**
1. **RSS-пайплайн** (07:00/17:00 CET) — почищенные `news_sources` (мусорные домены выключены в `Only Active`), строгий gate Claude, чипы.
2. **Competitor Sweep** (ветка `CW *`, 07:30/17:30 CET) — Claude web_search по всему списку конкурентов → дедуп `competitors_seen` (`qsReOCh4vsM0TPan`) → 🎯 карточки. Ловит то, чего нет в RSS (соцсети/анонсы). Клон Mentions Watch.
3. **Competitor RSS-фиды** — добавлены в `news_sources` (UndreamAI/Getnamo GitHub `releases.atom`, Bitpart Substack, Inworld blog; Convai RSS не существует → покрыт свипом).

## Что делает

1. **Сбор новостей** — 07:00 и 17:00 CET: пробегает по RSS/Atom-лентам из таблицы `news_sources`
   (мусорные домены отфильтрованы в `Only Active`), берёт только свежее (< 24 ч), строгий gate Claude
   (4 корзины, см. Radar выше) пишет RU-описание + категорию, бот постит каждую в топик News AI с чипом.
2. **Competitor Sweep** — 07:30/17:30 CET: ветка `CW *`, Claude web_search по конкурентам → 🎯 карточки.
3. **Сводка дня** — 19:00 CET: собирает всё отправленное за сегодня, Claude делает выжимку по
   индустриям, бот постит её и **закрепляет**, держа 5 последних закрепов (6-й откреп).

## Цепочка 1 — сбор (Schedule 7 & 17 CET)

```
Schedule 7 & 17 CET (cron 0 0 7 * * * + 0 0 17 * * *)
  → Read Sources (Data Table news_sources, returnAll)
  → Only Active (active == true И feed_url не в blocklist из 23 мусорных доменов — Habr, Forbes, Engadget, TechinAsia, TechCrunch/Verge/VentureBeat/Wired/IEEE/MarkTechPost/MIT-TR, GameSpot/IGN/DigitalTrends/PocketGamer/MCV/GamesBeat и др.; строки остались, но игнорируются — MCP не удаляет строки Data Table)
  → Fetch & Parse Feeds (Code: HTTP GET с Chrome-UA + парсер RSS/Atom, 25 items/ленту)
  → Fresh & Dated (isoDate есть И >= now-24ч; без даты — выкидываем)
  → Build Claude Input (сорт по дате, cap 60, нумерация idx; подмешивает recent_sent/recent_keys из news_seen через Get Recent Sent+Aggregate Recent → Claude знает, что уже слали)
  → Claude Value Filter (chainLlm + Anthropic + Structured Parser) — отбор ценного + RU-описание + тег индустрии + event_key + метка ALREADY_SENT
  → Select Valuable (join по idx, формат сообщения, day/run/sent_at; режет дубли по event_key/recent_keys)
      → Post News (Telegram sendMessage, thread 187, HTML)
      → Record Seen (Data Table news_seen)
```

Формат сообщения (премиум-карточка):
```
🎯 COMPETITOR · <источник>
<b>Заголовок как в источнике</b>

Острое RU-описание: что и почему важно нам.

🔗 Source
```
Чипы: 🎮 AI-IN-GAMES · 🎯 COMPETITOR · 🧠 LOCAL MODEL · 🔬 RESEARCH (fallback 📡 SIGNAL).

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
