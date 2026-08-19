# Feature: Mentions Watch (топик «Mentions»)

**Платформа:** Telegram-группа TryllAuto, топик с `message_thread_id = 918`, chat `-1004406148635`.
**Где живёт:** n8n Cloud, воркфлоу `WFarxoRPXfxnrqsV` (**TryllAuto Bot**) — отдельная Schedule-цепочка (ниже всех, префикс нод `MW `).
**Бот:** @Tryllauto_bot. **LLM:** Claude `claude-sonnet-4-6` (cred «Anthropic (Tryll)» `Kd6puzMUt71Ko9fg`), web_search + web_fetch.

## Что делает

Раз в **2 дня** (09:00 по таймзоне воркфлоу) Claude ищет в вебе **свежие сторонние упоминания** Tryll Engine (пресса, инвесторы, игровые студии, форумы, чужие соцсети/видео), отсеивает уже отправленные и наши собственные каналы, и постит новое в топик. Нет нового → ничего не постит.

```
MW Schedule 2d (interval days=2, 09:00)
  → MW Build Request (Code: system-промпт + дата)
  → MW Claude (httpRequest → api.anthropic.com/v1/messages, sonnet-4-6, web_search_20260209 + web_fetch_20260309)
  → MW Extract (Code: вытащить JSON-массив из text-блоков, нормализовать url (срез utm/#), выкинуть наши домены/видео, дедуп в батче)
  → MW New Only (Data Table mentions_watch_seen: rowNotExists по url)
  → MW Build Message (Code: HTML-сообщение + found_at/sent_at)
      → MW Record Seen (записать в mentions_watch_seen)
      → MW Post (Telegram, thread 918, HTML, без превью)
```

Формат сообщения:
```
📣 <b>Упоминание Tryll</b> · <источник> · <дата>

<RU: кто и что написал про Tryll>

🔗 <a href="url">Заголовок</a>
```

## Критерий отбора (промпт Claude)

Засчитываем упоминание, **только если контекст именно про нашу компанию** — on-device AI-мидлварь для игр Tryll Engine (слово «Tryll» бывает в чужих контекстах — отбрасываем). Только **сторонние** источники за ~4 дня.

**Исключаем (наши каналы / самопиар — не считается сторонним):**
- `tryllengine.com` (сайт + блог)
- `linkedin.com/company/tryllengine`
- `youtube.com/@Tryll_engine` (+ ID наших видео захардкожены в `MW Extract`)
- `discord.gg/bSTtvkdsS6`, `github.com/TryllEngine`, `tryll-engine.slack.com`
- любой контент, опубликованный самой Tryll / командой / основателями (Glotov, Riabov, Beliaev, Makevich, Potapov, Morozov, Kuzmenko, Andreev, Kozlova).

Двойная защита: (1) промпт-гейт у Claude; (2) жёсткий blocklist доменов/видео-ID в `MW Extract` (расширяемо — правь массивы `OWNED` / `OWNED_VIDS`). Список наших ссылок — из `00_COMPANY HUB — Tryll Engine`.

## Дедуп / БД

Data Table **`mentions_watch_seen`** (`CoUCdHfltkZe8Vfv`): `url, title, source, found_at, sent_at`. Пишем все отправленные; повторно не шлём. `MW Record Seen` пишет ДО/параллельно посту, чтобы при сбое не спамить.

## Стоимость

~15 запусков/мес. Каждый: web search (~$10/1000) + токены Sonnet ≈ $0.02–0.05. n8n ~15 executions/мес.

## Тест / тюнинг

- Тест вживую: в n8n открыть воркфлоу → на ноде **MW Schedule 2d** нажать «Execute step / Test workflow» (реальный поиск Claude → пост в топик 918).
- Логика парсинга/фильтра проверена локально на сэмпле (наш LinkedIn-пост и наше видео корректно отсеиваются).
- Расширить blocklist (X/Twitter, личные LinkedIn) — добавить строки в `OWNED` в `MW Extract`.
- Таймзона: `triggerAtHour:9` считается в таймзоне воркфлоу (Workflow Settings → Timezone = Europe/Berlin, если ещё не стоит).

## Связанное
- Общий экспорт: `workflows/tryllauto-bot.json`. Новостные фичи: [news-digest.md](news-digest.md).
