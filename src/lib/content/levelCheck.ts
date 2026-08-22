/**
 * The placement check.
 *
 * Nobody is asked to rate their own English — people either flatter themselves
 * or, far more often, sell themselves short. Instead the learner reads six
 * short passages that climb the ladder and taps the words they do not know,
 * which is the exact thing they already do while reading. The passages ship in
 * the bundle, so this works with no API key and costs nothing.
 *
 * Each passage is written to the rules of its own level: the level-1 passage
 * really is present simple in sentences of at most seven words. They were
 * counted, not estimated.
 */

export interface CheckPassage {
	level: number;
	text: string;
}

export const CHECK_PASSAGES: CheckPassage[] = [
	{
		level: 1,
		text: 'My name is Sara. I live in a small city. I have one sister. She is a teacher. I work in a shop. The shop sells bread and milk. I walk to work. I like my job.'
	},
	{
		level: 4,
		text: 'Last winter my bicycle broke. I walked to work every morning. It was cold, but I liked it. The streets were quiet and empty. One day I found a small key. I kept it in my pocket. I hoped someone would ask for it.'
	},
	{
		level: 8,
		text: 'The manager who hired me said the job was simple. For two months she was right. Then the company bought a second warehouse. Suddenly nobody knew where anything was stored. I spent that autumn making a list of every shelf. Nobody had asked me to do it. Later that list saved us a lot of money.'
	},
	{
		level: 12,
		text: 'By the time the auditors arrived, we had found the error ourselves. It had been sitting in the accounts for eleven months. Every quarter had looked slightly better than it really was. If we had waited another week, someone else would have found it. That conversation would have gone very differently.'
	},
	{
		level: 16,
		text: 'What strikes me now is how little of it was ever about the numbers. The figures were only a way of arguing about something else entirely. Who had been careless. Whose department would absorb the loss. Whether the reporting process ought to be rebuilt from scratch. Had we been able to say those things directly, we would have saved three months.'
	},
	{
		level: 20,
		text: 'There is a particular species of exhaustion that comes not from overwork but from ambiguity: the sense that one is being measured against a standard nobody has bothered to articulate. I had felt it before, in other offices, in other countries, but never so acutely as in that fluorescent-lit quarter when the rules seemed to shift each time I thought I had grasped them.'
	}
];

/**
 * Turn "words tapped per passage" into a level.
 *
 * The judgement is deliberately conservative. Starting a learner one level too
 * easy costs them a pleasant afternoon; starting them two levels too hard makes
 * them close the app and not come back. So the level chosen is the hardest
 * passage they read comfortably — under five percent unknown — and not the
 * hardest one they merely survived.
 */
export function levelFromTaps(tapsPerPassage: number[]): number {
	const COMFORTABLE = 0.05;
	const STRUGGLING = 0.12;

	let best = 1;
	for (const [index, passage] of CHECK_PASSAGES.entries()) {
		const taps = tapsPerPassage[index] ?? 0;
		const total = countWords(passage.text);
		const rate = taps / total;

		if (rate <= COMFORTABLE) {
			best = passage.level;
			continue;
		}
		// Between comfortable and struggling: they can read it with effort, so
		// credit them half the distance from the previous anchor and stop.
		if (rate < STRUGGLING && index > 0) {
			best = Math.round((CHECK_PASSAGES[index - 1].level + passage.level) / 2);
		}
		break;
	}
	return Math.min(20, Math.max(1, best));
}

function countWords(text: string): number {
	return (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
}
