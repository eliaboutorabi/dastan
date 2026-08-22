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

export type Shelf = 'my-story' | 'my-career' | 'curiosity' | 'documents';

export interface Story {
	id: string;
	shelf: Shelf;
	/** Set for career and curiosity sequences. */
	trackId?: string;
	/** The book this story belongs to. */
	bookId?: string;
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
	/** Contextual translation captured at the first tap, in the native language. */
	meaningNative: string;
	/** The same meaning in plain target-language words. */
	meaningSimple: string;
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
	/** A short explanation in the target language, in very common words. */
	simple: string;
	/** The same meaning in the learner's own language. */
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
	/** A short explanation in the target language, in very common words. */
	simple: string;
	/** The same meaning in the language the learner thinks in. */
	native: string;
	partOfSpeech: string;
	/** One short line, only when the word is used in a non-obvious sense. */
	note?: string;
}

/* -------------------------------------------------------------------------
 * Sources and books.
 *
 * The three shelves are not three features. Underneath them there is one
 * mechanism: something the learner gives the app becomes a book of graded
 * stories. A life told out loud is a source. A research paper is a source. A
 * topic typed into a box is a source. Keeping that single shape means adding
 * a new kind of input later is a small job, not a new feature.
 * ---------------------------------------------------------------------- */

export type SourceKind =
	/** The learner's own life, gathered by the interviewer agent. */
	| 'life'
	/** A file the learner uploaded — resume, paper, article, notes. */
	| 'document'
	/** A domain the learner asked to learn the working vocabulary of. */
	| 'career'
	/** Anything the learner is curious about, researched from open sources. */
	| 'topic';

export interface Source {
	id: string;
	kind: SourceKind;
	/** What the learner calls it: "My life", "lease-accounting.pdf", "IFRS 16". */
	title: string;
	/** The material the author agent actually reads from. */
	content: string;
	/** Present for uploads. */
	file?: { name: string; mime: string; size: number; pages?: number };
	/** Present for conversations — kept so a book can always be re-made. */
	transcript?: { role: 'user' | 'assistant'; content: string }[];
	/** Present for researched topics. */
	references?: { title: string; url: string }[];
	createdAt: string;
}

/** One planned story, before it has been written. */
export interface OutlineEntry {
	seq: number;
	title: string;
	titleNative: string;
	summary: string;
	level: number;
}

export interface Book {
	id: string;
	sourceId: string;
	shelf: Shelf;
	title: string;
	titleNative: string;
	/** The author agent's plan, shown at the approval gate. */
	outline: OutlineEntry[];
	storyIds: string[];
	/** One line from the author on why it chose this many stories. */
	note?: string;
	status: 'planning' | 'awaiting-approval' | 'active' | 'finished' | 'archived';
	createdAt: string;
}
