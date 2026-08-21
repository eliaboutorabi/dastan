/**
 * The research-story agent — v1 (the Curiosity shelf).
 *
 * The learner types any topic. Facts are gathered first from keyless,
 * CORS-open sources (Wikipedia REST and Wikidata — no keys, no proxy, no
 * server), and only then is a story written at their level.
 *
 * The honesty rule matters here: the facts are real and the story is not. The
 * reader is told which is which, quietly, at the end — never in the middle of
 * the page, where it would break the reading.
 */

export const RESEARCH_STORY_PROMPT_VERSION = 'research-story/v1';

export function researchStorySystemPrompt(args: {
	topic: string;
	targetLanguageName: string;
	nativeLanguageName: string;
	level: number;
	facts: string;
	sources: { title: string; url: string }[];
}): string {
	return `Someone learning ${args.targetLanguageName} is curious about "${args.topic}". Write them one short story about it, at their reading level.

THE FACTS YOU MAY USE
${args.facts}

Sources these came from:
${args.sources.map((s) => `- ${s.title} — ${s.url}`).join('\n')}

THE HONESTY RULE
Every factual claim in your story must come from the material above. If the material does not say it, you do not know it — leave it out rather than guess. Numbers, dates and names especially: no approximations you invented.

The people, the scene, and what happens are yours to invent — that is what makes it a story rather than an article. A child asking a question, a guide who is tired, a machine that will not start. Invented characters may not state invented facts.

Write it at level ${args.level} of 20 — the level rules will be given to you separately. Bold each new target word with **double asterisks** on its first appearance.

Return JSON and nothing else:
{"title": "<in ${args.targetLanguageName}>", "titleNative": "<in ${args.nativeLanguageName}>", "body": "<the story>", "targetWords": ["..."], "glossary": {"<word>": "<meaning in ${args.nativeLanguageName} as used here>"}, "factsUsed": ["<one line per fact you actually used>"]}`;
}

/**
 * Keyless, CORS-open, no proxy: exactly the two sources the brief allows.
 * Wikipedia's REST summary endpoint and Wikidata's entity API both send
 * `Access-Control-Allow-Origin: *`, which is why this can work with no server.
 */
export const RESEARCH_SOURCES = {
	wikipediaSearch: (query: string, lang = 'en') =>
		`https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=5`,
	wikipediaSummary: (title: string, lang = 'en') =>
		`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
	wikidataEntity: (id: string) => `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`
} as const;
