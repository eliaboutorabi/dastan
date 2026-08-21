# Dastan — English Reading App: Planning Conversation

**Eleo × Claude — August 21, 2026**

Companion file: `PROMPT-dastan-reading-app.md` (the full build prompt for Claude Code, created and revised during this chat).

---

## Eleo

Hey, I'm here to talk about myself and my plan, and I want you to help me to have a plan to build an application that's useful for me. I know I need to improve my English because I'm a new immigrant Who came to the United States 18 months ago and wants to find a really good job. I was an accountant in my country, and I have a master's in accounting, but maybe I'm not an expert because it was a long time ago, 10 years ago. I just need to be professional and have some projects for my LinkedIn and website. For now, just for fun, I want to build an application that is going to improve my English. I know reading is really good for improving English, but most of the books are very difficult. I can't read when I start. The first page has a lot of new words, and it's boring for me because I cannot understand what it is saying.

I had a small story that tells me about something that I am interested in, and then I can understand a lot of it. Maybe it just has a couple of new words that I don't know, and I can learn those new words. I thought I could build an application that has small stories, and I can read it. If I don't know some words, I can just click on the words and have them translated for me. I can use a deep agent's harness that can help me with pronunciation.

I also want all those stories about my career, like accounting, or about myself. A lot of these stories can be about how we can have somewhere where we just tell about ourselves, about our interests, and about our favorites in that application. After we talk about everything, the application can mix in 10 kinds of stories, starting easier and then going harder as we learn all the new words. The next one can have more words, and we can learn all those kinds of words.

I also want to just have a story about whatever topics they want. I want the agent to do deep research and make a small story for me. When I finish it, I can add a new one and just ask more about that. I just want you to help me and tell me how this plan that I have

## Claude

Eleo, this is a genuinely good plan — and not just "fun project" good. What you've described is actually how language-learning science says reading should work. It's called *comprehensible input*: you learn fastest when you read things that are about 90–95% understandable, with just a few new words per page. Regular books fail you exactly because they ignore your level and your interests. Your app fixes both. So the core idea is solid; let me help you shape it into something buildable.

**The pieces of your app, organized:**

1. **Onboarding interview** — an agent asks about you: your career (accounting), your interests, your favorites, and roughly how much English you know. This becomes your learner profile, saved in long-term memory. This fits your deepagents.js harness perfectly — it's the same agentic-interview pattern you're already planning for the small-business accounting app.

2. **Story generator** — creates short stories (say 150–300 words) from your profile, at a controlled difficulty. The trick for difficulty: tell the model to use only very common English words plus exactly 5–8 new target words. Each next story reuses your recently learned words *and* adds new ones. That reuse is the secret — seeing a word again in a new story is what makes it stick.

3. **Tap-to-translate** — click a word, get the Farsi translation. My suggestion: don't use a dictionary API. Send the word *with its sentence* to the model and ask for the meaning in context. "Interest" in an accounting story means سود/بهره, not "hobby" — a plain dictionary can't tell the difference, but the model can. Also, every word you click gets saved to your "learning list." That click is valuable data: it tells the app exactly which words you don't know yet.

4. **Pronunciation** — you don't need an agent for this one. The browser's built-in Web Speech API does text-to-speech for free, in TypeScript, no server. Click a word to hear it, or play the whole story like an audiobook while you read along.

5. **Research-a-topic stories** — you type any topic, a research agent (web search tool) gathers real facts, then writes the story at your current level. This is the most "deep agents" feature of all — real multi-step agent work.

**How I'd build it, in order:**

Start with an MVP in a weekend: fixed profile, generate one story, tap-to-translate, TTS, save clicked words. That alone is already useful to you every day. Then v2: the onboarding interview + the 10-story graded sequence that adapts to your learning list. Then v3: the research agent for custom topics, plus maybe a simple review screen that quizzes you on your saved words.

One design decision to make early: how the app measures your level. My suggestion — don't ask the user to self-rate. Just watch the clicks. Many clicks per story means it's too hard, so the next story gets easier; almost no clicks means level up. The app calibrates itself automatically, which is a much more impressive design to explain in an interview.

And about that — you said "just for fun," but I'd argue this belongs on your website too. "I'm an immigrant accountant, and I built the AI reading tutor I needed to learn English" is a *far* more memorable story for a recruiter than any generic demo. It shows agent architecture, memory, adaptive logic, and a real personal problem solved. It would also make an excellent LinkedIn post for your audience.

Want me to start with the architecture for the MVP — the SvelteKit + deepagents.js structure, the prompts for story generation and difficulty control — so you can begin building this weekend?

## Eleo

One more time, I want to tell something, maybe explained and expanded more for you.

1. I want to tell that agent about myself, even in Farsi or the other language, not just English. I can talk about myself in Farsi, maybe 10 pages, and that deep agent can make the story start easier and go harder when it knows how much English I know, because some people don't know any English. It needs to know how much English I know. For those 10 pages I'm talking about in Farsi, it can just make small stories, 20 stories that have two or three pages, or whatever you know better than me. I can just read those and memorize them, and I would love it because it's about my story. Maybe I can, and I know the meaning in Farsi. After I am studying English, it would be very, very helpful for me so I can talk about myself much better. This is just one idea.

2. Maybe I want to just learn accounting, so I can just ask it to search and tell me about specific words, like account payable. It can make a lot of stories for me that are going to improve my English and accounting. All these can help me for my interview that I have, and my biggest problem is just English. Even though later I can use it for the other language as well, if I want to learn French, German, or whatever, after it makes a story, I can study that story. When it's finished, the next story comes up, and it goes until I learn all those kinds of new words, like business words and whatever. I would love to learn by reading, and even by reading with a voice so they can know the pronunciation. If all this works as an application, I want you to have a feeling about this and just know what I like and what would be very good and nice for me. Just help me and tell me how I can make it very nice and perfect. You can just act as an expert writer, an expert designer, an expert storyteller, whatever. I just want you to feel what I need and help me.

## Claude

Eleo, I do feel what you're describing now, and I want to reflect it back to you because it's better than you may realize. You're not building a "reading app" anymore. You're building something with a very clear emotional center: **an app that teaches you to tell your own story in English.** Everything else — the accounting stories, the research feature, the future French and German — grows out from that center. Let me go through your two ideas as that expert writer and designer you asked for.

**Idea 1 — your life in Farsi becomes your textbook. This is the heart of the app.**

There's a reason this will work so well, and it's worth understanding: when you read a story where you *already know the meaning* — because it's your own life — your brain doesn't spend any energy on "what is happening?" All of your attention goes to "how does English say this?" That's the fastest possible way to absorb a language. And no story on earth is more interesting to you than yours. You'll never be bored. You'll actually *want* to reread, and rereading is where memorization happens.

So here's how I'd design that experience:

The onboarding shouldn't feel like a form. It should feel like sitting with a warm, curious friend who speaks Farsi. The agent interviews you *in Farsi* — voice or typing, your choice — and it doesn't just wait for 10 pages. It asks follow-up questions the way a good biographer would: your childhood city, your family, why you chose accounting, the day you decided to move, your first week in New York, your husband, what you miss, what you dream about. It collects your life into a rich document — your "life corpus."

Then it writes your book: around 20 short stories, and here's the storyteller's trick for grading them. Story 1 is written with maybe the 300 most common English words, present tense, short sentences: *"My name is Eleo. I am from Iran. I am an accountant."* Story 5 adds past tense. Story 10 has feelings and reasons. Story 20 is the full, beautiful version of your journey — the one you could tell in an interview or at a dinner and make people lean in. Same life, told twenty times, each time in richer English. By the end you haven't just "studied English" — you've rehearsed exactly the sentences your real life requires. And notice what story this becomes in a job interview: *"Tell me about yourself"* is the first question every interviewer asks. Your app literally trains the answer.

For the reading screen: tap a word for the Farsi meaning, but also tap a whole *sentence* to see it in Farsi — beginners need that. A play button reads the story aloud, highlighting each word as it's spoken (karaoke style — the Web Speech API can do this in the browser for free). And one feature I'd add for you specifically: a "say it with me" mode, where you listen to a sentence, then record yourself saying it. Reading aloud your own story is speaking practice disguised as reading.

**Idea 2 — learning English and accounting at the same time. This is your second bookshelf.**

You type "accounts payable," and a curriculum agent goes to work: it researches the topic, decides the 30–50 terms that live around it (invoice, vendor, accrual, aging report, reconciliation…), and plans a story sequence. Each story teaches 5–8 terms *inside a narrative* — not definitions, but a story: a small company forgets to pay an invoice, the vendor calls, the accountant fixes it. You feel the meaning of the words because things *happen* with them. Finished stories feed the next ones: yesterday's new words appear again today, so nothing is learned once and lost.

And here's a quiet bonus you mentioned yourself: your master's was 10 years ago. These stories refresh your accounting at the same time they build your English. One reading session, two preparations for the same interview.

**The shape of the whole app, then, is a small library with three shelves:**
**My Story** (your life, 20 graded stories), **My Career** (accounting tracks you request), and **Curiosity** (any topic, researched and written at your level). One learner profile and one growing vocabulary list connect all three — and nothing is hardcoded to English or Farsi, so the day you want French, you change two settings and your same life becomes your French textbook.

Two design principles to keep it feeling "very nice and perfect," as you said: **it should feel like a book, not software** — calm reading page, big comfortable text, one story at a time, no dashboards shouting at you. And **progress should be visible and warm** — a bookshelf that fills with covers as you finish stories, so on a discouraging day you can look at fifteen finished spines and see proof that you're moving.

If you'd like, I'll start with the piece everything depends on: the Farsi onboarding interview agent and the prompt that turns your life corpus into graded Story 1 through Story 20 — with the exact difficulty rules written out. Then you can scaffold it in SvelteKit with deepagents.js the way you usually do. Shall we start there?

## Eleo

Okay, I want you to get ready and give me the prompt that I need to send to the cloud. I want to use svelte kit and deep agents harness. And I want to set up the GitHub Actions to deploy to the GitHub Pages. Feel free to ask any question that you will need to improve the application, so just go ahead and start. I want to read your prompt first and then decide if I want to build that application.

## Claude

*(Checked the browser-only architecture pattern, confirmed that direct browser calls to the Anthropic API work with the `anthropic-dangerous-direct-browser-access: true` header for a bring-your-own-key static site, and then created the full build prompt: `PROMPT-dastan-reading-app.md`.)*

Your prompt is ready — paste it into Claude Code as-is. A few decisions I made for you while writing it; tell me if you want any changed before you build:

**The name.** I called it *Dastan* (داستان) — "story." Rename freely; it only affects the repo name and title.

**Both API providers.** It supports Anthropic *and* OpenAI with your bring-your-own-key pattern from the research agent, defaulting to Anthropic since you'll be working in Claude Code anyway. The key stays in the browser, nothing else touches it — same hard constraint you always use.

**Lazy generation with an approval gate.** The agent writes the *outline* of your stories first, shows you the titles in Farsi and English, and only generates stories as you advance. This keeps each session cheap and uses the deepagents human-in-the-loop interrupt — a genuinely agentic feature you can point to in your portfolio.

**Self-calibrating difficulty.** The exact rule is in there: it counts your word-taps per story and quietly adjusts the next story's level. No self-rating.

**Typing-first onboarding.** Farsi voice recognition in browsers is unreliable, so the interview is typed by default with voice behind a feature flag. TTS for reading works great everywhere, including the karaoke highlighting.

**Design with a soul.** Persian illuminated-manuscript direction — ivory paper, lapis and saffron, bookshelf spines that fill with an illumination pattern as you finish stories. Literata for English reading, Vazirmatn for Farsi, full RTL handling. It should feel like a book you love, not a dashboard.

It's structured in three milestones so Claude Code stops for your review instead of building everything blind, and the GitHub Actions workflow for Pages is included complete. Read it through — if the plan feels right, start with just Milestone 1 and you'll have a deployed, readable app with tap-to-translate and audio before you invest in the full onboarding flow.

## Eleo

For the number of stories, it doesn't have to be 20. It can be less or more. It depends on the storyteller. If I'm talking about my story just for five pages, it can be just ten stories or whatever. You can make a story. I don't want all those stories to be the same or something hard to make a new story. It doesn't have to be 20 stories; it can be less or more. AI can decide if it can have more ideas to make the stories more, or if it's hard, it can be less.

## Claude

*(Edited the prompt file to remove the fixed count of 20.)*

Done — and you're right, this is the better design. A fixed 20 would force the storyteller to either pad a thin corpus with repetitive stories or squeeze a rich life into too few. Now the prompt says it plainly: **the author agent decides the count from how much material there is** — maybe 8–10 stories from five pages, maybe 25+ from a rich interview — and never pads to hit a number. Every story has to bring something genuinely new, or the book is simply shorter.

Three things I adjusted along with it:

The **approval gate** now shows you the planned titles *and* the count, and you can ask to trim, merge, or extend before anything is generated — so you stay the editor of your own book.

**Difficulty** now spreads from your assessed starting level up to level 20 across however many stories exist, instead of assuming one level per story. The tap-based calibration still fine-tunes on top.

And there's now a **"+" on the My Story shelf** too — anytime, you can ask for one more story about any chapter of your life ("write another one about my first week in New York"). Adding a story is always one tap, never a project.

The updated prompt is ready. If it reads right to you, paste it into Claude Code and start with Milestone 1.

---

*End of conversation export. The build prompt itself lives in `PROMPT-dastan-reading-app.md`.*
