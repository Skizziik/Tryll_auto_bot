# Feature: /idea в топике «Game Ideas»

**Где:** Telegram-группа TryllAuto, топик **💡 Game Ideas** (`message_thread_id = 1283`, chat `-1004406148635`), бот @Tryllauto_bot.
**Что:** перенос команды `/idea` из бота Tryll Nexus (`[Sub 9] LinkedIn Idea`, `4124iMuFjqRScMyX`). Кристиан пишет `/idea <игра>` и примерно через минуту получает готовую фразу для LinkedIn-сообщения, две альтернативы и ссылку на подробный Google Doc. В HubSpot ничего не пишется.

## Как вызвать
- `/idea https://store.steampowered.com/app/1234567` — ссылка Steam
- `/idea https://studio-site.com` — сайт студии
- `/idea Fading Tides` — просто название (поиск в Steam)
- `/idea` без аргумента — инструкция. Работает и `/idea@Tryllauto_bot ...`.

Доступ: белый список в ноде `GI Gate` (`ALLOWED`: Максим 1240344207, Кристиан 7657670413). Остальным — вежливый отказ.

## Путь сообщения
```
Telegram → Vercel фильтр (tryllauto-tg-filter, пропускает /idea только из топика 1283)
  → TG Webhook → TG Adapter → Route Update (выход idea)
  → GI Gate (доступ, разбор команды) → GI Go
      ├─ нет → GI Notice (отказ / инструкция)
      └─ да  → GI Ack («Researching …»)
               → GI Intake (Steam, посты разработчиков, отзывы, сайт студии, документация Tryll из llms.txt)
               → GI Embed (Gemini embedding, cred «Google Gemini(PaLM) Api account»)
               → GI KB Search (Supabase match_kb_documents, use_cases, cred «Supabase (Vector Store)»)
               → GI Prompt (подставляет найденные юзкейсы) → GI Claude (claude-sonnet-5-5, web search ≤ 2)
               → GI Build Doc → GI Create Doc (Team Drive, папка «Nexus LinkedIn Ideas»)
               → GI Reply Text → GI Send Reply (в топик 1283)
```

## Отличия от Sub 9
- Все сообщения идут через Telegram-ноды с кредом @Tryllauto_bot и `message_thread_id` топика, а не через зашитый токен бота Tryll Nexus.
- Ключи Supabase и Gemini не лежат в коде: поиск похожих юзкейсов вынесен в HTTP-ноды на сохранённых кредах n8n.
- Уведомления Максиму в личку при отказе/ошибке убраны (ошибка видна прямо в топике).
- Промпт, правила (не называть Tryll SDK, без цен, без жаргона во фразе, без выдуманных фактов, без длинных тире), формат документа и ответа — без изменений.

Sub 9 в Tryll Nexus не тронут и продолжает работать как раньше. Если промпт там поменяют, эту копию нужно обновить отдельно (ноды `GI Intake`, `GI Build Doc`, `GI Reply Text`).

## Проверка
29.10.2026: тестовый прогон `/idea Fading Tides` от Максима — ответ пришёл в топик 1283, документ создан, найдено 5 юзкейсов из базы.
