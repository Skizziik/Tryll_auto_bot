# Feature: itch.io AI-game scanner (топик «itch.io - AI»)

**Платформа:** Telegram-группа TryllAuto, топик **itch.io - AI** (`message_thread_id = 184`, chat `-1004406148635`). Карточки на английском.
**Где живёт:** n8n Cloud, воркфлоу `WFarxoRPXfxnrqsV` — отдельная цепочка на своём Schedule-триггере.
**Бот:** @Tryllauto_bot. **LLM:** Claude `claude-sonnet-5-5` через HTTP Request к `/v1/messages` (cred «Anthropic (Tryll)»).

## Что делает

Каждые **4 часа** сканит свежие игры itch.io из 9 AI-тегов и постит в топик только те, что
используют **AI как технологию внутри игры**, причём **локально** (на устройстве/офлайн), а не через облако.

```
Schedule itch 4h (cron 0 0 */4 * * *)
  → Fetch itch Newest       (первая страница newest по 9 тегам: artificial-intelligence, llm, local-llm, ollama,
                             ai, chatgpt, chatbot, machine-learning, neural-network → ~230 уникальных игр)
  → New Games Only          (Data Table itch_seen, rowNotExists по url — без повторов)
  → Scan itch Games         (до 40 страниц параллельно по 10, таймаут 8с; описание ~1000 симв + теги; 18+ отсекает)
  → Build itch Claude Input (один батч, idx)
  → itch Build Request → itch Claude (Sonnet 5.5: used_ai? + английская заметка)
  → Select itch
      → Record itch Seen    (пишем ВСЕ просканированные в itch_seen)
      → Filter Only AI → itch Loop → Post itch → itch Pace (3 с) → itch Loop
                            (по одной карточке с паузой — лимит Telegram ~20 сообщений/мин в группе)
```

- Ответ Claude ограничен строгой JSON-схемой (`output_config.format`), чтобы модель не теряла поле `used_ai`.
  На всякий случай: если флаг пропущен, но заметка есть — игра считается AI.
- Если Claude не ответил, `Select itch` ничего не записывает — эти игры проверятся в следующий прогон.

Формат сообщения:
```
🎮 LOCAL AI GAME · itch.io
<b>Game Title</b>

<EN: which local AI it uses and what it does in the game>

🔗 Play on itch.io
```

## Критерий отбора (промпт Claude)

`used_ai = true` только если **оба** условия:
1. AI — часть геймплея: LLM/чат-NPC, AI-диалоги, генерация контента на лету, голосовой AI, ML-механики
   (НЕ классический enemy-AI/патфайндинг, НЕ просто AI-ассеты).
2. AI крутится **локально/на устройстве/офлайн**: local model, GGUF, llama.cpp, Ollama, LM Studio, koboldcpp,
   встроенная/скачиваемая модель, без API-ключа/интернета. Если игра поддерживает и local, и cloud — оставляем.

Отсекаем: облачный AI без локального варианта; случаи, где непонятно local или cloud; игры только с AI-ассетами;
классический гейм-AI; маркетинговые «AI» без сути.

## Сколько за прогон

`Fetch` (~230) − уже виденные (`itch_seen`) → до 40 на скан → Claude отбирает локальные.
После расширения тегов (29.09.2026) в очереди ~200 ещё не проверенных игр: первые ~5–6 прогонов (≈сутки)
разбирают этот хвост по 40 за раз, дальше только новые.

## База данных (можно выгружать)

`itch_seen` (`UcLnrCrKEdZpk7kL`): `url, title, used_ai, day, sent_at, ai_note, tags, description`.
Пишутся **все** просканированные игры (и с AI, и без). Колонки `ai_note`, `tags`, `description` добавлены 29.09.2026,
у старых строк они пустые. Выгрузка: n8n → Data tables → itch_seen (или MCP `get_data_table_rows`).

## Ограничения / тюнинг

- Описание читаем первые ~1000 символов — если разработчик упомянул «local» глубже, можно не увидеть
  (расширить окно в `Scan itch Games`).
- Local-only критерий жёсткий → постов немного (это цель). Ослабить — правка промпта в `itch Build Request`.
- Теги-источники — массив `TAGS` в `Fetch itch Newest`.

## Связанное
- Общий воркфлоу-экспорт: `workflows/tryllauto-bot.json`.
- Новостные фичи: [news-digest.md](news-digest.md), [news-sources.md](news-sources.md).
