/** The data model that lives in IndexedDB. Nothing here is language-specific. */

export interface LearnerProfile {
	name: string;
	/** BCP-47 tag of the language the learner already thinks in, e.g. "fa". */
	nativeLanguage: string;
	/** BCP-47 tag of the language being learned, e.g. "en". */
	targetLanguage: string;
	/** 1–20, continuously recalibrated from tap rate. Never self-reported. */
	level: number;
	interests: string[];
	createdAt: string;
}

/** Written by the interviewer agent, in the learner's native language. */
export interface LifeCorpus {
	sections: { title: string; content: string }[];
	updatedAt: string;
}

export type Shelf = 'my-story' | 'my-career' | 'curiosity';

export interface Story {
	id: string;
	shelf: Shelf;
	/** Set for career and curiosity sequences. */
	trackId?: string;
	/** Position within its book or track, starting at 1. */
	seq: number;
	/** The ladder level this was written at, 1–20. */
	level: number;
	title: string;
	titleNative: string;
	/** Target-language prose. Paragraphs separated by blank lines. */
	body: string;
	/** The 3–8 new words this story exists to teach. */
	targetWords: string[];
	/** target word -> native meaning *as used in this story*. */
	glossary: Record<string, string>;
	status: 'locked' | 'available' | 'reading' | 'finished';
	/** Word taps recorded while reading — the calibration signal. */
	tapCount: number;
	finishedAt?: string;
	/** Sources, when the story was built on researched facts (curiosity shelf). */
	sources?: { title: string; url: string }[];
	/** True when the app shipped this story rather than generating it. */
	bundled?: boolean;
}

export interface VocabEntry {
	/** Lemma, target language. Stored lowercase; this is the key. */
	word: string;
	/** The sentence it was first tapped in. */
	firstContext: string;
	/** Contextual translation captured at the first tap. */
	meaningNative: string;
	/** Times the learner asked for it. */
	taps: number;
	/** Times it has appeared in stories since. */
	exposures: number;
	status: 'new' | 'learning' | 'known';
	lastSeenAt: string;
}

/** A career or curiosity sequence. */
export interface Track {
	id: string;
	shelf: Shelf;
	topic: string;
	/** The curriculum agent's 30–50 planned terms. */
	termPlan: string[];
	storyIds: string[];
	done: boolean;
}

/** One cached contextual translation, keyed by (word, sentence). */
export interface TranslationCacheEntry {
	key: string;
	word: string;
	sentence: string;
	nativeLanguage: string;
	meaning: string;
	partOfSpeech: string;
	/** One short line, only when the word is used in a non-obvious sense. */
	note?: string;
	createdAt: string;
}

/** A cached whole-sentence translation. */
export interface SentenceCacheEntry {
	key: string;
	sentence: string;
	nativeLanguage: string;
	translation: string;
	createdAt: string;
}

/** The shape the contextual-translation prompt must return. */
export interface WordSense {
	meaning: string;
	partOfSpeech: string;
	note?: string;
}
