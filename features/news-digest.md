# Feature: News Digest (топик «News AI»)

**Платформа:** Telegram-группа TryllAuto, топик **News AI** (`message_thread_id = 187`, chat `-1004406148635`). Все посты на английском.
**Где живёт:** n8n Cloud, воркфлоу **TryllAuto Bot** (`WFarxoRPXfxnrqsV`).
**Бот:** @Tryllauto_bot (cred «Telegram account» `CUOcdBn2atlIO15O`).
**LLM:** cred «Anthropic (Tryll)» `Kd6puzMUt71Ko9fg`. Фильтр, конкуренты, модели и дайджест — `claude-sonnet-5`; проверка дублей — `claude-haiku-4-5`. Всё через HTTP Request к `/v1/messages` (LangChain-ноды убраны).

## Категории (чипы)
- 🎮 **AI-IN-GAMES** — AI / on-device AI в играх (NPC, voice-AI, локальный инференс, генеративный контент, AI-инструменты движков).
- 🎯 **COMPETITOR** — движения конкурентов из списка (Inworld, Convai, Unity AI, NVIDIA ACE, Artificial Agency, UndreamAI, Getnamo и т.д.) и игры, которые их внедряют.
- 🧠 **LOCAL MODEL** — свежие модели с **открытыми весами** (LLM/STT/TTS). Облачные модели (Gemini, GPT, ElevenLabs API) сюда не попадают.
- 🔬 **RESEARCH** — исследования по AI в играх и локальным моделям.
- 🔄 **UPDATE** — продолжение уже отправленной истории, приходит **ответом на исходный пост**.

Жёсткий REJECT: инвестиции/M&A, увольнения, обычные релизы игр, гаджеты, генерик-AI, массмедиа, мнения, листиклы.

## Три ветки → одна проверка историй

```
News (RSS)      07:00 / 17:00 ─┐
CW (конкуренты) 07:30 / 17:30 ─┼─► Story Gate (SG *) ─► пост / 🔄 UPDATE / отбросить ─► stories
LM (модели)     08:00 / 18:00 ─┘
Дайджест        19:00  ← из stories
Здоровье фидов  пн 09:00 → General группы TryllAuto
```

1. **News** — `news_sources` (только `active = true`) → `Fetch & Parse Feeds` (25 записей/фид, Google News: реальный издатель, без хвоста « - Publisher») → `Fresh & Dated` (≤ 24 ч) → `Build Claude Input` (cap 90 + истории за 10 дней как ALREADY_SENT) → `News Build Request` → `News Claude` (Sonnet 5) → `Select Valuable` → Story Gate.
2. **CW** — `CW Load Stories` (истории конкурентов за 30 дней в промпт: не повторять, искать только продолжения) → `CW Build Request` → `CW Claude` (Sonnet 5 + `web_search_20250305`, 8 поисков) → `CW Extract` (≤ 5 дней) → `CW Build Message` → Story Gate.
3. **LM** — `LM Fetch HF` (Hugging Face API по ~34 проверенным организациям, репозитории за 7 дней, без квантизаций/LoRA) → `LM Build Request` → `LM Claude` (Sonnet 5, группирует варианты одного семейства в одну карточку) → `LM Extract` → `LM Build Message` → Story Gate. Веб-поиска в LM больше нет: только реальные репозитории с точными датами.

## Story Gate — почему дублей больше нет

Одна общая таблица **`stories`** (`QSazNbs9LfUBFQKc`) вместо трёх отдельных. История = событие, у неё много ссылок.

| Поле | Что хранит |
|---|---|
| `story_id` | номер истории |
| `entity`, `bucket`, `branch` | о ком, какая рубрика, какая ветка нашла |
| `headline`, `summary`, `url` | заголовок, описание, первая ссылка |
| `urls` | все нормализованные адреса этой истории через `\|` (включая не отправленные) |
| `fingerprint` | значимые слова заголовка |
| `tg_message_id` | номер поста в Telegram (для ответов-апдейтов) |
| `first_sent`, `last_update`, `updates`, `last_note` | когда отправили, последнее продолжение, их число, что нового |

Каждая карточка проходит (`SG In → SG Load Stories → SG Prep → SG Need Judge → SG Judge → SG Apply → SG Route`):
1. **Мусор** — главная страница, `/blog`, `/news` и т.п., `theopenweights.com` → отбросить.
2. **URL** — адрес чистится от `utm`, `www`, AMP, хвостового слэша; если он есть в любой истории → отбросить.
3. **Заголовок** — совпадение значимых слов ≥ 60% с историей за 45 дней → дубль (при разных номерах версий, напр. v1.2.1 и v1.4.0, правило не срабатывает, решает Haiku).
4. **Haiku 4.5** — всё остальное одним запросом вместе со списком историй за 45 дней: `NEW` / `SAME` / `UPDATE` / `DUP` (дубль внутри прогона).

Итог: `NEW` → пост + новая история; `SAME` и дубли → ссылка дописывается к истории, поста нет; `UPDATE` → 🔄 ответом на исходный пост, `updates + 1`.
Правила апдейтов: только новый факт (версия, дата, цена/лицензия, платформа, игра внедрила, открыли веса, бенчмарки); не чаще раза в 48 ч; историю отслеживаем 30 дней (конкуренты) / 14 дней (модели), позже — новая история.
Если Haiku недоступен, работают шаги 1–3, остальное уходит как новое.

**Заполнение:** 28.09.2026 в `stories` перенесены 95 постов за 45 дней из старых таблиц → 67 историй (22 дубля склеены, 6 мусорных). Старые `news_seen`, `competitors_seen`, `local_models_seen` больше не пишутся, остались как история.

**Важно для кода нод:** в песочнице Code-ноды n8n нет класса `URL`, адреса разбираются регуляркой (`parseUrl` в `SG Prep`).

## Дайджест (19:00)
`Get Today` (вся `stories`) → `Aggregate Day` → `Digest Build` (истории, отправленные сегодня, + сегодняшние апдейты) → `Digest Claude` (Sonnet 5) → `Digest Text` → `Post Summary` → закреп, ротация 5 закрепов. Рубрики те же, что у карточек; апдейты отдельным блоком. Пустой день → дайджеста нет.

## Здоровье фидов (понедельник 09:00)
`Health Weekly → Health Sources → Health Stories → Health Check → Health Post`: сколько фидов живы, какие упали, какие молчат 30+ дней, сколько историй и апдейтов за неделю. Пишет в General группы TryllAuto (не в новостной топик).

## Источники (`news_sources`, `cHUyEGAFsNnpqjC6`)
Читается только то, что `active = true` (хардкод-блоклист в `Only Active` убран, 24 строки выключены в самой таблице). Активно 27:
- Лабы: OpenAI, Google DeepMind, Hugging Face, Mistral, Google Research, Microsoft Research, NVIDIA Developer, Apple ML, AWS ML.
- AI в играх / геймдев: 80.lv, Game Developer, AI and Games, GamesIndustry.biz, GameWorldObserver, Mobidictum.
- Конкуренты напрямую: Unity Blog, CoplayDev unity-mcp (релизы), UndreamAI LLMUnity (релизы), Getnamo Llama-Unreal (релизы), Bitpart, Inworld, Artificial Agency, RunEdge.
- Google News: «NVIDIA ACE», «Inworld AI», «AI NPC», «AI NPCs» (за 2 дня; шум отсекает фильтр).

Выключены: массмедиа (TechCrunch, Verge, Wired, VentureBeat, MIT TR, IEEE, Forbes, Engadget, Habr и др.), инвест-медиа, геймерские сайты, Convai (404), DigitalTrends (405).
Добавить источник: строка в `news_sources` с URL ленты, `active = true`.

## Стоимость (примерно)
Sonnet 5 ($2/$10 за млн токенов): фильтр новостей, конкуренты, модели, дайджест. Haiku 4.5 ($1/$5): проверка дублей, ~5 тыс. входных токенов за прогон, около $1–2 в месяц.
