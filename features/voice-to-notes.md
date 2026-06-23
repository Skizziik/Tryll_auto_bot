# Feature: Voice → Notes (топик «Notes»)

**Платформа:** Telegram-группа TryllAuto, топик **Notes** (`message_thread_id = 7`).
**Где живёт:** n8n Cloud, воркфлоу **TryllAuto · Voice → Notes** (`WFarxoRPXfxnrqsV`).
**Статус:** v1 собран, **выключен** — требует подключения credentials (см. ниже).

## Что делает

Бот **@Tryllauto_bot** слушает топик Notes. Голосовые (свои и пересланные) копятся в один
«черновик», транскрибируются и по кнопке превращаются в аккуратную заметку на Google Drive.

```
Голосовое в топике Notes
   → скачать файл (Telegram getFile)
   → транскрипция (Mistral Voxtral)
   → добавить в черновик (Data Table notes_draft)
   → удалить прошлое сообщение-черновик бота и прислать новое ВНИЗ
        «📝 Черновик · N голосовых …»  [✅ Сохранить заметку]
   → по нажатию ✅:
        собрать заметку из всех голосовых (Mistral chat)
        → сохранить .md на Google Drive
        → заменить сообщение на «✅ Заметка сохранена: <ссылка>»
        → очистить черновик
```

## Логика группировки (v1)

- **Несколько голосовых = одна заметка.** Голосовые накапливаются в черновике, пока не нажмёшь **✅ Сохранить**.
- Сообщение-черновик всегда одно: старое удаляется, новое приходит вниз чата (кнопка всегда под рукой).
- Состояние черновика хранится в Data Table `notes_draft` (ключ `chat_id:thread_id`), а не в памяти — переживает перезапуски.

## Компоненты

| Часть | Что |
|---|---|
| Trigger | Telegram Trigger (updates: `message`, `callback_query`), бот @Tryllauto_bot |
| Роутер | Switch: ветка `voice` (голосовое в топике 7) / ветка `save` (кнопка) |
| Транскрипция | HTTP → `POST https://api.mistral.ai/v1/audio/transcriptions`, model `voxtral-mini-2602` (новейшая mini; small/realtime endpoint не принимает), multipart `file` |
| Заметка | HTTP → `POST https://api.mistral.ai/v1/chat/completions`, model `mistral-large-latest`. Промпт: точность важнее краткости, сохранять все детали (имена/числа/даты/сроки/решения), брать самопоправки, не выдумывать; разделы Ключевые моменты / Действия / Вопросы (пустые опускаются); чистый Markdown без обёрток |
| Индикатор | по нажатию ✅ сообщение сразу → «⏳ Делаю заметку…» (нода Edit To Processing), в конце → «✅ сохранено + ссылка» |
| Хранилище заметок | Google Drive, папка `1o-8nIrmt7fSxkdc1iwxlFiCR1SkqiZqN`, файл `Заметка YYYY-MM-DD HH-mm.md` |
| Состояние | Data Table `notes_draft` (`bpwNfJwc15sqXgeU`) |

## Стоимость (n8n executions)

Событийная схема: ~1 execution на голосовое + 1 на нажатие кнопки. Без polling — лимит 2.5k/мес не задеваем.

## Credentials (подключить в n8n перед активацией)

1. **Telegram** — отдельный credential для @Tryllauto_bot. ⚠️ НЕ использовать «Telegram Bot» (это бот Tryll Nexus). Перецепить 5 Telegram-нод.
2. **Mistral API** — тип HTTP Bearer Auth, токен Mistral. Назначить на «Transcribe Voxtral» и «Compose Note Mistral».
3. **Google Drive** — уже подключён («Google Drive account»).

## v2 (план)

- Кнопка **🆕 Новая** (закрыть текущую + начать новую).
- **Авто-закрытие по паузе ≥ 30 мин**: при новом голосовом, если прошлое было давно, прошлый черновик финализируется автоматически.
- Возможно — складывать заметки по папкам/датам.
