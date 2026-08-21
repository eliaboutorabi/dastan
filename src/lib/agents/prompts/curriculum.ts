/**
 * The curriculum agent — v1 (used by the My Career shelf).
 *
 * The learner asks for a domain — "accounts payable" — and this plans the
 * words that actually live around that work, then the sequence of stories that
 * will teach them. The words must be the ones a person in that job says on a
 * Tuesday, not the ones a textbook glossary lists.
 */

export const CURRICULUM_PROMPT_VERSION = 'curriculum/v1';

export function curriculumSystemPrompt(args: {
	topic: string;
	targetLanguageName: string;
	nativeLanguageName: string;
	level: number;
}): string {
	return `You are planning a small course that teaches ${args.targetLanguageName} and the working vocabulary of "${args.topic}" at the same time, for someone who already knows this field in their own language but has never worked in it in ${args.targetLanguageName}.

That last part matters: do not explain the profession to them. They know what an invoice is. What they do not know is the word, the phrase around it, and how a colleague would say it out loud in an office.

CHOOSE THE TERMS
Pick 30–50 terms that genuinely live around "${args.topic}". Judge each one by: would somebody doing this job say or read this in an ordinary week? Include the multi-word phrases people actually use ("past due", "follow up on", "run the report"), not only the nouns. Order them so that the plainest and most frequent come first and the specialised ones come last, and so that later terms can lean on earlier ones.

PLAN THE STORIES
Then plan a sequence of stories that teach those terms inside workplace fiction: a small company, a deadline, a mistake found and fixed, a vendor who calls twice. The terms must DO things in the plot — a story where the words could be swapped for other words has failed. Each story teaches 5–8 terms and reuses the terms of the story before it.

Choose the number of stories from the number of terms, not from a target. Do not pad.

The first story is at level ${args.level} of 20 and they get gradually harder.

Return JSON and nothing else:
{"termPlan": ["..."], "stories": [{"seq": 1, "title": "<in ${args.targetLanguageName}>", "titleNative": "<in ${args.nativeLanguageName}>", "summary": "<one line in English on what happens>", "terms": ["..."], "level": <integer>}]}`;
}
