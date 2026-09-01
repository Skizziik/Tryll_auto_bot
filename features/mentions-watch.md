# Feature: Mentions Watch (топик «Mentions»)

**Платформа:** Telegram-группа TryllAuto, топик с `message_thread_id = 918`, chat `-1004406148635`.
**Где живёт:** n8n Cloud, воркфлоу `WFarxoRPXfxnrqsV` (**TryllAuto Bot**) — отдельная Schedule-цепочка (ниже всех, префикс нод `MW `).
**Бот:** @Tryllauto_bot. **LLM:** Claude `claude-sonnet-4-6` (cred «Anthropic (Tryll)» `Kd6puzMUt71Ko9fg`), **базовый `web_search_20250305`** (`max_uses:8`). Web_fetch убран; на `web_search_20260209` НЕ переходить — он гоняет поиск через code_execution и жрёт токены/упирается в лимит (было 268k→[]). Промпт даёт явные search-углы и приоритет играм, использующим Tryll.

## Что делает

Раз в **2 дня** (09:00 по таймзоне воркфлоу) Claude ищет в вебе **заметные сторонние упоминания и использования** Tryll Engine / Tryll Assistant (пресса, инвесторы/VC, анонсы игр/студий, что используют Tryll, форумы, видео), отсеивает уже отправленные, наши собственные каналы и **агрегаторы цен**, постит новое в топик (карточка на **английском**) и **дописывает строку в Google-таблицу**. Нет нового → ничего не постит.

**Без окна по дате** (это важно): ищем ВСЁ, дедуп-таблица гарантирует, что каждое отправляется один раз. Первые прогоны сливают бэклог по **cap 8/прогон** (`MW Build Message`, сортировка свежие→старые; остальные подхватятся в следующий прогон), потом стабильно — только новое. Первую версию с окном «последние 4 дня» убрали (она возвращала [], т.к. вся коверэдж старше 4 дней).

```
MW Schedule 2d (interval days=2, 09:00)
  → MW Build Request (Code: system-промпт EN + дата, summary IN ENGLISH)
  → MW Claude (httpRequest → api.anthropic.com/v1/messages, sonnet-4-6, basic web_search_20250305 max_uses:8; web_fetch убран)
  → MW Extract (Code: JSON-массив из text-блоков, нормализация url, blocklist наших доменов/видео + агрегаторов цен, дедуп в батче)
  → MW New Only (Data Table mentions_watch_seen: rowNotExists по url)
  → MW Build Message (Code: EN HTML-карточка + поля для таблицы: logged_at/date/summary, cap 8)
      → MW Record Seen (записать в mentions_watch_seen)
      → MW Post (Telegram, thread 918, HTML, без превью)
      → MW Log Sheet (Google Sheets append → таблица «Tryll — Mentions Watch (log)», лист Mentions)
```

Формат сообщения (English):
```
📣 <b>Tryll mention</b> · <source> · <date>

<EN: who published/did what re Tryll>

🔗 <a href="url">Title</a>
```

## Критерий отбора (промпт Claude)

Засчитываем упоминание, **только если контекст именно про нашу компанию** — on-device AI-мидлварь для игр Tryll Engine (слово «Tryll» бывает в чужих контекстах — отбрасываем). Только **сторонние** источники за ~4 дня.

**Исключаем (наши каналы / самопиар — не считается сторонним):**
- `tryllengine.com` (сайт + блог)
- `linkedin.com/company/tryllengine`
- `youtube.com/@Tryll_engine` (+ ID наших видео захардкожены в `MW Extract`)
- `discord.gg/bSTtvkdsS6`, `github.com/TryllEngine`, `tryll-engine.slack.com`
- любой контент, опубликованный самой Tryll / командой / основателями (Glotov, Riabov, Beliaev, Makevich, Potapov, Morozov, Kuzmenko, Andreev, Kozlova).

Также исключаем **агрегаторы цен / реселлеры ключей** (gg.deals, isthereanydeal, allkeyshop, cheapshark, gamivo, eneba, kinguin, g2a, cdkeys, keyforsteam, dlcompare, steampricehistory, steamdb) и нашу собственную Steam-community страницу `steamcommunity.com/app/4193780`.

Двойная защита: (1) промпт-гейт у Claude; (2) жёсткий blocklist в `MW Extract` — массивы `OWNED` / `OWNED_VIDS` / `PRICE_AGG` (расширяемо). Список наших ссылок — из `00_COMPANY HUB — Tryll Engine`.

## Google-таблица (лог)

Таблица **«Tryll — Mentions Watch (log)»** на company-Google-Drive (id `16EMghyYwevQJUnCQAn8mQcDdkkTf2nPgqY0JZuVhR_E`, лист `Mentions` gid `2051381124`). Колонки: `Logged At · Date · Source · Title · Summary · URL`. Пишет нода `MW Log Sheet` (Google Sheets append, cred **company** `IS8es1x9XC8psdEQ` bohdan@tryllengine.com, mapping defineBelow под шапку). Каждый отправленный в топик пункт = строка. Бэкфилл 17 находок за все прогоны сделан разовым воркфлоу (удалён); их url добавлены в `mentions_watch_seen`, чтобы не задваивать.

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
