# Dastan · داستان

**Your own life, retold in the language you are learning.**

Dastan is a graded-reading app that turns a learner's own life and interests into their textbook. It runs entirely in the browser — no server, no backend, no proxy — and deploys as a static site to GitHub Pages.

The learner brings their own LLM key. Everything else (their stories, their words, their progress) stays in their browser.

## Why it works this way

Reading is the fastest way into a language, but ordinary books fail a beginner: the first page has thirty unknown words and no reason to care. Dastan fixes both halves of that. The stories are about *your* life, so you already know what happens and all your attention goes to how the language says it — and they are written at a level that moves as you do.

**Any source becomes a book.** That is the whole mechanism, and the shelves are just kinds of source:

| Source | What it is |
|---|---|
| **A document** | Upload anything — a resume, a research paper, an article, your notes. PDF, Word, plain text or Markdown, read entirely inside your browser. Dastan finds the story inside it rather than summarising it. |
| **Your life** | An AI biographer interviews you in your own language, then writes a book of short stories about you — beginning near-zero and ending in fluent prose. |
| **A field of work** | Name a domain like "accounts payable"; a curriculum agent plans the 30–50 terms that live around it and teaches them inside workplace fiction. |
| **A topic** | Anything you are curious about, researched from Wikipedia and Wikidata and written at your level. |

Whatever the source, the flow is the same: the author agent reads it, plans a book, and shows you the plan. Nothing is written until you approve it, and you decide how many stories it holds. Then stories are written as you reach them, so the wait is one story and never a book.

Every book you approve is kept in the **Library** with the material it came from. Starting something new never costs you something old.

While reading: tap a word for its meaning **in that sentence** (not a dictionary lookup), tap the ¶ mark for the whole sentence, press play for read-aloud with the current word highlighted. Finishing a story unlocks the next one.

### Finding your level

Dastan never asks you to rate yourself. Once, in Settings, you read six short passages that climb the ladder and tap the words you do not know — the same thing you do while reading, so there is nothing new to learn. It ships in the bundle, so it costs nothing and works before you have a key. After that it keeps adjusting on its own, from how often you tap.

### Two languages, not one

The app keeps **the language the interface speaks** and **the language you think in** as separate settings, because they are separate things. The interface is in English; a tapped word is explained twice — once in plain English, which is the version that teaches, and once in your own language underneath, so a hard word never becomes a stuck moment. The interviewer talks to you in your language whatever the interface is set to.

The app never asks you to rate yourself. It watches how often you tap: many taps means the next story comes out a little easier, almost none means it goes up a level.

## Status

Working today: the reader (tap-to-translate, sentence translation, karaoke read-aloud), document upload with in-browser PDF and Word parsing, the author agent with its approval gate and lazy story generation, the placement check, the Library, bring-your-own-key settings, export and import, and a layout built for both a phone and a laptop.

Still to come: the conversational interviewer for **Your life**, and the research agent that fetches facts for **A topic** from Wikipedia and Wikidata.

## Architecture

```
Browser (one static bundle on GitHub Pages)
├── SvelteKit SPA — bookshelf · reader · words · settings
├── deepagents harness (client-side)
│   ├── interviewer · level assessor · story author
│   ├── curriculum · research · contextual translator
│   └── virtual file system (life corpus, curricula, plans)
├── IndexedDB — profile, stories, vocabulary, progress, translation cache
└── Web Speech API — read-aloud with word-boundary highlighting
        │
        └──▶ LLM provider (the learner's own key) · Wikipedia + Wikidata
```

There is no other network destination. No analytics, no trackers, no telemetry.

### The pieces worth knowing about

| Path | What lives there |
|---|---|
| `src/lib/agents/prompts/` | Every agent prompt, versioned, in full. These are the product — read them first. |
| `src/lib/agents/ladder.ts` | The 1–20 grading ladder, its anchors, and the tap-rate calibration rule. |
| `src/lib/agents/harness.ts` | The deepagents harness, running in the browser. |
| `src/lib/llm/provider.ts` | The one place a provider is chosen — Anthropic, OpenAI, or the offline mock. |
| `src/lib/reader/tokenize.ts` | Turning a story into tappable words with the character offsets read-aloud needs. |
| `src/lib/reader/tts.svelte.ts` | Read-aloud, one paragraph per utterance, with karaoke highlighting. |
| `src/lib/agents/author.ts` | Plans a book from any source, then writes its stories one at a time. |
| `src/lib/files/extract.ts` | Reading PDF, Word, and text files inside the browser. |
| `src/lib/content/levelCheck.ts` | The placement passages and the rule that reads them. |
| `src/lib/db/` | IndexedDB: sources, books, stories, vocabulary, caches, export/import. |
| `src/lib/content/sampleStory.ts` | The bundled level-3 story, so the app works before you have a key. |

## Running it

```bash
npm install
npm run dev
```

Then open Settings, choose a provider, and paste your key — or leave the provider on **Offline demo** to try the app with canned answers and no key at all.

```bash
npm run check   # types
npm run build   # static site into build/
```

## Your API key

The key is stored in `localStorage` in your browser and is sent to exactly one place: your provider's API. There is no server in this project that could receive it. Both SDKs are run in direct-browser mode, which is what makes a keyless, serverless deployment possible.

If you would rather not put a key in a browser at all, the **Offline demo** provider gives you the full app with pre-written answers.

## Deploying

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo>` and publishes to Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## License

Personal project. Ask before reusing.
