# News — список источников

Источники живут в **Data Table `news_sources`** в n8n (id `cHUyEGAFsNnpqjC6`), а не в коде.
Ноды воркфлоу только читают эту таблицу. Этот файл — зеркало/справочник; редактировать удобнее
прямо в n8n UI (**Data tables → news_sources**), изменения подхватятся со следующего прогона.

## Колонки

| колонка | что |
|---|---|
| `name` | как показывать источник |
| `feed_url` | **URL именно RSS/Atom-ленты** (не страница сайта) |
| `industry` | тег по умолчанию: `AI` / `AI+Game` / `GameDev` / `Investments` / `Research` |
| `active` | `true` — участвует, `false` — выключен |

> Итоговый тег индустрии в сообщении ставит Claude по самой новости; `industry` здесь — лишь
> грубая категория-подсказка и для твоей навигации по таблице.

## Активные источники (v1)

### AI / ML медиа
| name | feed_url | active |
|---|---|---|
| MIT Tech Review — AI | https://www.technologyreview.com/topic/artificial-intelligence/feed/ | ✅ |
| TechCrunch — AI | https://techcrunch.com/category/artificial-intelligence/feed/ | ✅ |
| The Verge — AI | https://www.theverge.com/rss/ai-artificial-intelligence/index.xml | ✅ |
| VentureBeat — AI | https://venturebeat.com/category/ai/feed/ | ✅ |
| Wired — AI | https://www.wired.com/feed/tag/ai/latest/rss | ✅ |
| IEEE Spectrum — AI | https://spectrum.ieee.org/topic/artificial-intelligence/feed/ | ✅ |
| MarkTechPost | https://www.marktechpost.com/feed/ | ✅ |
| Import AI (Substack) | https://importai.substack.com/feed | ⚠️ 403 с сервера n8n |
| Habr — AI/ML | https://habr.com/ru/rss/flows/ai_and_ml/articles/ | ✅ |

### Лаборатории / компании
| name | feed_url | active |
|---|---|---|
| OpenAI — News | https://openai.com/news/rss.xml | ✅ |
| Google DeepMind — Blog | https://deepmind.google/blog/rss.xml | ✅ |
| Hugging Face — Blog | https://huggingface.co/blog/feed.xml | ✅ |
| Mistral — News | https://mistral.ai/rss.xml | ✅ |
| Google Research — Blog | https://research.google/blog/rss/ | ✅ |
| Microsoft Research — Blog | https://www.microsoft.com/en-us/research/feed/ | ✅ |
| NVIDIA — Developer Blog | https://developer.nvidia.com/blog/feed/ | ✅ |
| Apple — Machine Learning | https://machinelearning.apple.com/rss.xml | ✅ |
| AWS — Machine Learning Blog | https://aws.amazon.com/blogs/machine-learning/feed/ | ✅ |
| arXiv — cs.AI recent | http://export.arxiv.org/rss/cs.AI | ⛔ выкл (`active=false`, шумно) |

### AI + Gaming
| name | feed_url | active |
|---|---|---|
| 80.lv | https://80.lv/feed/ | ✅ |
| AI and Games | https://www.aiandgames.com/feed | ✅ |
| Artificial Agency — News | https://www.artificial.agency/news/rss.xml | ✅ |
| RunEdge — Blog | https://www.runedge.ai/blog/rss.xml | ✅ |

### Геймдев-индустрия
| name | feed_url | active |
|---|---|---|
| Game Developer | https://www.gamedeveloper.com/rss.xml | ✅ |
| GamesBeat | https://gamesbeat.com/feed/ | ✅ |
| PocketGamer.biz | https://www.pocketgamer.biz/rss/ | ✅ |
| The Game Business | https://www.thegamebusiness.com/feed | ✅ |
| MCV/Develop | https://mcvuk.com/feed/ | ✅ |
| GamesIndustry.biz | https://www.gamesindustry.biz/feed/ | ✅ |

### Инвестиции
| name | feed_url | active |
|---|---|---|
| InvestGame | https://investgame.net/news/feed/ | ✅ |

## Как редактировать

- **выключить** источник: `active = false` (например, arXiv).
- **включить**: `active = true`.
- **добавить**: новая строка — `name`, `feed_url` (ссылка на **ленту**!), `industry`, `active = true`.
- **удалить**: удалить строку.

⚠️ В `feed_url` нужен адрес **RSS/Atom-ленты** (обычно `…/feed/`, `…/rss.xml`, `…/feed.xml`), а не
страница сайта. Не находишь ленту — скинь URL сайта, найду рабочий feed и дам готовую строку.

## Отложено в v2 (нет RSS-ленты)

Эти источники из исходного списка **не имеют ленты** (нужен HTML-скрейп — отдельная задача).
Многие к тому же протухшие, потеря невелика:

The Information (paywall), The Batch (битый feed), Anthropic news, Meta AI blog, Stanford HAI,
HuggingFace Papers, decart.ai, inworld.ai, atelico.studio, convai.com, solutions.georgy.dev,
gladecore.com, runanywhere.ai, hakko.ai, charisma.ai (~март'25), tryaura.dev, bezi.com,
latitude.io, hiddendoor.co, volleygames.com (~'23).

## Связанное

- Механика всего пайплайна: [news-digest.md](news-digest.md)
- Тест лент с сервера n8n (28/30 ✅): см. там же раздел «Источники».
