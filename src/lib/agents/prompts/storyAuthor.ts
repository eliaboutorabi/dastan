import { ladderBlock } from '../ladder';
import type { VocabEntry } from '$lib/types';

/**
 * The story author — v1.
 *
 * This is the prompt the app is really made of. Two jobs, kept separate on
 * purpose: first plan the book (how many stories, what each one is about),
 * then write one story at a time against that plan.
 *
 * The rule the author must never break: this is a STORY, with a person, a
 * small tension and a resolution. The moment it becomes a list of facts about
 * a life, the learner stops reading, and an unread story teaches nothing.
 */

export const STORY_AUTHOR_PROMPT_VERSION = 'story-author/v1';

/* --- planning the book --------------------------------------------------- */

/** What the book is being written from. The plan changes shape accordingly. */
export type SourceBrief =
	| { kind: 'life'; material: string }
	| { kind: 'document'; material: string; documentName: string }
	| { kind: 'career'; material: string; topic: string }
	| { kind: 'topic'; material: string; topic: string };

function sourceInstructions(source: SourceBrief, targetLanguageName: string): string {
	switch (source.kind) {
		case 'life':
			return `WHAT YOU ARE WRITING FROM
This is the learner's own life, told in their own words.

Write the stories in the FIRST PERSON — "I" — because these are the exact sentences they will one day say out loud about themselves. They already know what happens, because it happened to them. That is the design: no attention goes to "what is this about", so all of it goes to "how does ${targetLanguageName} say this".

THE ARC
Open with identity and family, in the present tense. Then childhood and school, where the past tense arrives exactly when the difficulty ladder allows it. Then work, and the decision to leave. Then arriving, the hard part, and the first small wins. The last story is always the whole life told the way you would tell it at a dinner table — the rich, fluent version. That is the one they will give when someone asks "tell me about yourself".`;

		case 'document':
			return `WHAT YOU ARE WRITING FROM
A document the learner uploaded: "${source.documentName}". They chose it because they want to understand it, and they want to learn ${targetLanguageName} while they do.

Your job is not to summarise it. A summary teaches nobody a language. Your job is to find the *story* inside it and tell that — a person doing the thing the document describes, a problem the document solves, a decision someone had to make.

If it is a resume, each story follows one job or one project, told in the first person, and the book becomes rehearsal for talking about that career out loud.
If it is a paper or a report, invent a character who runs into what it describes: an engineer whose bridge is cracking, a nurse who notices the pattern first.
If it is notes or a manual, dramatise the moment somebody needs to know this.

Every factual claim must come from the document. Invented people may not state invented facts.`;

		case 'career':
			return `WHAT YOU ARE WRITING FROM
The learner asked to learn the working vocabulary of "${source.topic}", in ${targetLanguageName}.

They already know this field in their own language. Do not explain the profession to them — they know what an invoice is. What they do not know is the word, the phrase around it, and how a colleague would say it out loud in an office.

These are workplace stories: a small company, a deadline, a mistake found and fixed, a vendor who calls twice. The terms must DO things in the plot. If the terms could be swapped for other words and the story would still work, the story has failed.`;

		case 'topic':
			return `WHAT YOU ARE WRITING FROM
The learner is curious about "${source.topic}", and the material below was gathered from open reference sources.

Every factual claim in your stories must come from that material. If it does not say something, you do not know it — leave it out rather than guess. Numbers, dates and names especially.

The people and the scene are yours to invent; that is what makes it a story instead of an article. Invented characters may not state invented facts.`;
	}
}

export function bookOutlineSystemPrompt(args: {
	source: SourceBrief;
	nativeLanguageName: string;
	targetLanguageName: string;
	startLevel: number;
}): string {
	return `You are an author who writes graded readers — short stories built so that someone learning ${args.targetLanguageName} can actually finish them.

${sourceInstructions(args.source, args.targetLanguageName)}

DECIDE THE COUNT YOURSELF
There is no target number of stories. Read the material and decide honestly how many stories it can carry, each bringing genuinely new events, people or depth. Thin material might make 6. Rich material might make 25 or more. Never pad: if you cannot make story N genuinely different from story N-1, the book simply ends at N-1. Padding is the one thing that will make this person stop reading.

DIFFICULTY
The first story is written at level ${args.startLevel} of 20 — easy enough that this person can read it today, without help. The last is at level 20. Spread the levels evenly across however many stories you chose.

Return JSON and nothing else:
{"bookTitle": "<a title for the whole book, in ${args.targetLanguageName}>", "bookTitleNative": "<the same, in ${args.nativeLanguageName}>", "stories": [{"seq": 1, "title": "<in ${args.targetLanguageName}>", "titleNative": "<in ${args.nativeLanguageName}>", "summary": "<one line, in English, on what happens in this story>", "level": <integer>}], "note": "<one sentence, in ${args.nativeLanguageName}, telling the learner why you chose this many stories>"}`;
}

/* --- writing one story --------------------------------------------------- */

export interface StoryRequest {
	level: number;
	targetLanguageName: string;
	nativeLanguageName: string;
	/** What this story is about, from the approved outline. */
	brief: string;
	/** Position in the book and the total, so the author knows where it sits. */
	seq: number;
	total: number;
	/** The corpus material relevant to this story. */
	sourceMaterial: string;
	/** Words the learner is currently learning — these must come back. */
	learningWords: VocabEntry[];
	/** Every new word from the previous story in this book. */
	previousNewWords: string[];
	/** First person for a life or a resume; third person elsewhere. */
	voice: 'first-person' | 'third-person';
}

export function storySystemPrompt(request: StoryRequest): string {
	const learning = request.learningWords.map((v) => v.word);
	const reuseCount = Math.ceil(learning.length * 0.6);

	return `You write graded reading stories for one specific learner of ${request.targetLanguageName}.

${ladderBlock(request.level)}

THIS STORY
It is story ${request.seq} of ${request.total}. What happens in it:
${request.brief}

Written in the ${request.voice === 'first-person' ? 'first person — "I" — because these are the exact sentences the learner will one day say aloud about themselves' : 'third person, following one character closely'}.

Material to write from (do not invent facts that contradict it, and do not use material that is not here):
${request.sourceMaterial}

IT MUST BE A STORY
A person, a small tension, a resolution. Something happens and something changes, even if it is small — a lost receipt, a phone call, a door that would not open. Never a list of facts. Never exposition. Never "I am an accountant. I like tea. I have two sisters." If you find yourself writing sentences that could be reordered without loss, you are not writing a story.

WORDS
- Teach the new target words by putting them where the reader can feel what they mean from what is happening. Bold each target word with **double asterisks** on its FIRST appearance only.
- Bring back at least ${reuseCount} of these words the learner is currently learning — naturally, where they belong: ${learning.length ? learning.join(', ') : '(none yet)'}
- Every one of these words from the previous story must appear again: ${request.previousNewWords.length ? request.previousNewWords.join(', ') : '(none yet)'}
- Do not explain a word inside the story. The story shows; the glossary tells.

Return JSON and nothing else:
{"title": "<title in ${request.targetLanguageName}>", "titleNative": "<the same title in ${request.nativeLanguageName}>", "body": "<the story, paragraphs separated by a blank line>", "targetWords": ["<the new words this story teaches, lowercase>"], "glossary": {"<target word>": "<its meaning in ${request.nativeLanguageName}, as used in THIS story>"}}`;
}
