# Dastan · داستان

**Your own life, retold in the language you are learning.**

Dastan is a graded-reading app that turns a learner's own life and interests into their textbook. It runs entirely in the browser — no server, no backend, no proxy — and deploys as a static site to GitHub Pages.

The learner brings their own LLM key. Everything else (their stories, their words, their progress) stays in their browser.

## Why it works this way

Reading is the fastest way into a language, but ordinary books fail a beginner: the first page has thirty unknown words and no reason to care. Dastan fixes both halves of that. The stories are about *your* life, so you already know what happens and all your attention goes to how the language says it — and they are written at a level that moves as you do.

Three bookshelves:

| Shelf | What it is |
|---|---|
| **My Story** | An AI biographer interviews you in your own language, then writes a book of short stories about your life — beginning near-zero and ending in fluent prose. The count is decided by how much material your life gives it, never padded to a number. |
| **My Career** | You name a domain ("accounts payable"); a curriculum agent plans the 30–50 terms that live around it and teaches them inside workplace fiction. |
| **Curiosity** | Any topic. A research agent gathers real facts from Wikipedia and Wikidata, then writes a story about them at your level. |

While reading: tap a word for its meaning **in that sentence** (not a dictionary lookup), tap the ¶ mark for the whole sentence, press play for read-aloud with the current word highlighted. Finishing a story unlocks the next one.

### Two languages, not one

The app keeps **the language the interface speaks** and **the language you think in** as separate settings, because they are separate things. The interface is in English; a tapped word is explained twice — once in plain English, which is the version that teaches, and once in your own language underneath, so a hard word never becomes a stuck moment. The interviewer talks to you in your language whatever the interface is set to.

The app never asks you to rate yourself. It watches how often you tap: many taps means the next story comes out a little easier, almost none means it goes up a level.

## Status

**Milestone 1 is complete.** The skeleton, the design system, Settings with the bring-your-own-key provider abstraction, the IndexedDB layer, and the bundled sample story readable end to end — tap-to-translate, sentence translation, karaoke read-aloud — plus the GitHub Pages deploy.

Milestone 2 (the Farsi interviewer, level assessment, the approval gate and the generated book) and Milestone 3 (career tracks, the research agent, export/import polish) come next.

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
| `src/lib/db/` | IndexedDB: stories, vocabulary, tracks, caches, export/import. |
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
