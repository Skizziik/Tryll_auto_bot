# Feature: Research (топик «Research»)

**Платформа:** Telegram-группа TryllAuto, топик **Research**.
**Где живёт:** n8n Cloud, тот же воркфлоу **TryllAuto · Voice → Notes** (`WFarxoRPXfxnrqsV`) —
отдельная ветка на общем Telegram-триггере (у одного бота может быть только один приёмник).
**Бот:** @Tryllauto_bot.

## Что делает

Команда `/research <запрос>` в топике Research → бот предлагает выбрать модель
(Sonnet 4.6 / Opus 4.8) → Claude проводит веб-исследование (web search + web fetch) →
готовит структурированный отчёт с источниками → сохраняет **Google Doc** в отдельную папку.

```
/research <запрос>
   → RS Parse (вырезать запрос, сгенерить job_key)
   → RS Has Query? (пусто → подсказка)
   → RS Insert Job (research_jobs)
   → RS Send Buttons:  [⚡ Sonnet 4.6]  [🧠 Opus 4.8]   (callback = rs:<job_key>:<model>)
тап модели:
   → RR Answer CB → RR Parse (job_key + модель)
   → RR Edit Running («🔎 Исследую…»)
   → RR Get Job (достать запрос по job_key)
   → RR Build Request (system-промпт ресёрча)
   → RR Claude Research (POST /v1/messages + tools web_search/web_fetch, БЕЗ лимитов)
   → RR Extract (склеить text-блоки, вытащить filename-slug)
   → RR MD to HTML → RR Build Upload → RR Upload Drive (Google Doc)
   → RR Edit Done («✅ Ресёрч готов: ссылка»)
   → RR Clear Job
```

## Выбор модели

Запрос длинный — в `callback_data` (лимит 64 байта) не влезает, поэтому хранится в таблице
`research_jobs`, а кнопка несёт короткий `job_key`. По нему ветка `research_run` достаёт текст.
- ⚡ **Sonnet 4.6** (`claude-sonnet-4-6`) — старт, дешевле.
- 🧠 **Opus 4.8** (`claude-opus-4-8`) — глубже, дороже.

## Инструменты Claude

`web_search_20260209` + `web_fetch_20260209` — серверные, агентный цикл крутится у Anthropic.
**Beta-заголовок не нужен**, только `anthropic-version: 2023-06-01`. `max_uses` НЕ задан —
Claude сам решает, сколько искать и что читать.

## Компоненты

| Часть | Что |
|---|---|
| Роутер | `Route Update` (Switch): +выход `research_start` (text startsWith `/research`), +выход `research_run` (callback startsWith `rs:`) |
| Хранилище задач | Data Table `research_jobs` (`3ky6zNtlCGsf57Dn`): `job_key`, `chat_id`, `thread_id`, `query` |
| Модель | HTTP → `POST https://api.anthropic.com/v1/messages`, model из кнопки, `max_tokens` 16000, timeout 300s, tools web_search + web_fetch |
| Отчёт → Doc | `markdownToHtml` → multipart → `POST /upload/drive/v3/files?...&supportsAllDrives=true` |
| Папка ресёрчей | Google Drive `1efSIYjsPJ9D0xi_0c1C2AJf6aM4PxKu5` *(временная, потом сменить)* |

## Credentials (проставить в UI вручную)

HTTP-ноды не принимают predefined-credential через API — задать в n8n UI:
1. **RR Claude Research** → `Anthropic (Tryll)` (`Kd6puzMUt71Ko9fg`).
2. **RR Upload Drive** → `Google Drive account` (`CBqMJPCUkU9mQ6bP`).

Telegram-ноды и Data Table привязаны автоматически (`Telegram account` `CUOcdBn2atlIO15O`).

## Стоимость

~$0.40 (Sonnet) … $0.80 (Opus) за ресёрч: web search (~$10/1000 поисков) + токены модели.
Биллинг — API-баланс Anthropic (НЕ подписка claude.ai; токен подписки для API не подходит).

## Ограничения / TODO

- **pause_turn** не обрабатывается: очень длинный серверный цикл может вернуть незаконченный
  ответ. На практике обычные ресёрчи укладываются в один вызов. При необходимости — добавить
  цикл дочитывания.
- Кнопки не убираются после старта (можно тапнуть повторно) — при желании добавить
  `editMessageReplyMarkup`.
- Команда срабатывает по `/research` в любом топике (рассчитано на топик Research).
