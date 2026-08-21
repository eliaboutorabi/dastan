/**
 * The grading ladder — the heart of the app.
 *
 * Every story-writing prompt embeds the rules for the level it is writing at.
 * Levels 1, 5, 10, 15 and 20 are anchors taken from the design brief;
 * everything between them is interpolated linearly, so level 7 is a real,
 * describable place and not a rounding of level 5.
 */

export interface LevelRules {
	level: number;
	/** Size of the allowed common-word pool. 0 means "no restriction". */
	vocabularySize: number;
	/** Grammar the story may use, cumulative, written for the model to read. */
	grammar: string;
	/** Longest sentence in words. 0 means "no limit". */
	maxSentenceWords: number;
	/** Story length in words. */
	minWords: number;
	maxWords: number;
	/** How many new target words this story teaches. */
	newWords: number;
}

interface Anchor extends LevelRules {}

const ANCHORS: Anchor[] = [
	{
		level: 1,
		vocabularySize: 300,
		grammar:
			'Present simple only. No subordinate clauses of any kind. No past tense, no future, no modals. One idea per sentence.',
		maxSentenceWords: 7,
		minWords: 100,
		maxWords: 150,
		newWords: 3
	},
	{
		level: 5,
		vocabularySize: 600,
		grammar:
			'Present simple and past simple. The joining words "and", "but", "because", "so". Still no relative clauses, no perfect tenses, no passive.',
		maxSentenceWords: 10,
		minWords: 200,
		maxWords: 250,
		newWords: 5
	},
	{
		level: 10,
		vocabularySize: 1200,
		grammar:
			'Everything below, plus the future ("will", "going to"), comparatives and superlatives, and at most one relative clause per paragraph ("the woman who called me").',
		maxSentenceWords: 14,
		minWords: 300,
		maxWords: 400,
		newWords: 6
	},
	{
		level: 15,
		vocabularySize: 2500,
		grammar:
			'Everything below, plus the present perfect, conditionals ("if I had known"), and the passive voice used sparingly where it is natural.',
		maxSentenceWords: 18,
		minWords: 450,
		maxWords: 550,
		newWords: 7
	},
	{
		level: 20,
		vocabularySize: 0,
		grammar:
			'Unrestricted natural prose. Any tense, any structure. Idioms may appear, introduced gently and only where a native speaker would truly use them.',
		maxSentenceWords: 0,
		minWords: 600,
		maxWords: 800,
		newWords: 8
	}
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

export function clampLevel(level: number): number {
	return Math.min(20, Math.max(1, Math.round(level)));
}

/** The rules for any level 1–20, interpolated between the anchors. */
export function rulesForLevel(rawLevel: number): LevelRules {
	const level = clampLevel(rawLevel);
	const upperIndex = ANCHORS.findIndex((a) => a.level >= level);
	const upper = ANCHORS[upperIndex === -1 ? ANCHORS.length - 1 : upperIndex];
	if (upper.level === level || upperIndex <= 0) return { ...upper, level };

	const lower = ANCHORS[upperIndex - 1];
	const t = (level - lower.level) / (upper.level - lower.level);

	return {
		level,
		// Level 20 lifts the vocabulary ceiling entirely; approaching it from 15
		// should widen towards that, not shrink towards zero.
		vocabularySize: upper.vocabularySize === 0 ? lerp(lower.vocabularySize, 6000, t) : lerp(lower.vocabularySize, upper.vocabularySize, t),
		grammar: t < 0.5 ? lower.grammar : upper.grammar,
		maxSentenceWords:
			upper.maxSentenceWords === 0 ? lerp(lower.maxSentenceWords, 24, t) : lerp(lower.maxSentenceWords, upper.maxSentenceWords, t),
		minWords: lerp(lower.minWords, upper.minWords, t),
		maxWords: lerp(lower.maxWords, upper.maxWords, t),
		newWords: lerp(lower.newWords, upper.newWords, t)
	};
}

/** The ladder rules rendered as the block that goes inside an author prompt. */
export function ladderBlock(level: number): string {
	const r = rulesForLevel(level);
	const vocab =
		r.vocabularySize === 0
			? 'Any word a fluent adult reader would know.'
			: `Only the ~${r.vocabularySize} most common words of the target language, plus the learner's own name, place names, and the target words listed below.`;
	const sentence =
		r.maxSentenceWords === 0
			? 'No sentence-length limit; vary sentence length the way good prose does.'
			: `No sentence may be longer than ${r.maxSentenceWords} words. Count them.`;
	return [
		`LEVEL ${r.level} OF 20.`,
		`Vocabulary: ${vocab}`,
		`Grammar: ${r.grammar}`,
		`Sentence length: ${sentence}`,
		`Length: ${r.minWords}–${r.maxWords} words.`,
		`New target words to teach in this story: ${r.newWords}.`
	].join('\n');
}

/**
 * Spread levels evenly from the learner's assessed starting level up to 20
 * across a book of `count` stories. The per-story tap calibration adjusts on
 * top of this.
 */
export function levelPlan(startLevel: number, count: number): number[] {
	const start = clampLevel(startLevel);
	if (count <= 1) return [start];
	return Array.from({ length: count }, (_, i) =>
		clampLevel(start + ((20 - start) * i) / (count - 1))
	);
}

/**
 * The calibration rule, implemented exactly as specified: tap rate above 6%
 * means the next story goes down a level, below 1.5% means it goes up.
 * The learner is never shown a score — only a gentle sentence.
 */
export function recalibrate(
	currentLevel: number,
	tapCount: number,
	wordCount: number
): { level: number; direction: 'easier' | 'harder' | 'same' } {
	if (wordCount <= 0) return { level: clampLevel(currentLevel), direction: 'same' };
	const tapRate = tapCount / wordCount;
	if (tapRate > 0.06) return { level: clampLevel(currentLevel - 1), direction: 'easier' };
	if (tapRate < 0.015) return { level: clampLevel(currentLevel + 1), direction: 'harder' };
	return { level: clampLevel(currentLevel), direction: 'same' };
}
