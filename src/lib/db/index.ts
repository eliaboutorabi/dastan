import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
	LearnerProfile,
	LifeCorpus,
	SentenceCacheEntry,
	Story,
	Track,
	TranslationCacheEntry,
	VocabEntry
} from '$lib/types';

interface DastanDB extends DBSchema {
	meta: { key: string; value: unknown };
	stories: { key: string; value: Story; indexes: { 'by-shelf': string } };
	vocab: { key: string; value: VocabEntry; indexes: { 'by-status': string } };
	tracks: { key: string; value: Track };
	wordSenses: { key: string; value: TranslationCacheEntry };
	sentences: { key: string; value: SentenceCacheEntry };
}

const DB_NAME = 'dastan';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DastanDB>> | null = null;

function db() {
	dbPromise ??= openDB<DastanDB>(DB_NAME, DB_VERSION, {
		upgrade(database) {
			database.createObjectStore('meta');
			const stories = database.createObjectStore('stories', { keyPath: 'id' });
			stories.createIndex('by-shelf', 'shelf');
			const vocab = database.createObjectStore('vocab', { keyPath: 'word' });
			vocab.createIndex('by-status', 'status');
			database.createObjectStore('tracks', { keyPath: 'id' });
			database.createObjectStore('wordSenses', { keyPath: 'key' });
			database.createObjectStore('sentences', { keyPath: 'key' });
		}
	});
	return dbPromise;
}

/* --- profile & corpus ---------------------------------------------------- */

export async function getProfile(): Promise<LearnerProfile | undefined> {
	return (await db()).get('meta', 'profile') as Promise<LearnerProfile | undefined>;
}

export async function putProfile(profile: LearnerProfile): Promise<void> {
	await (await db()).put('meta', profile, 'profile');
}

export async function getCorpus(): Promise<LifeCorpus | undefined> {
	return (await db()).get('meta', 'corpus') as Promise<LifeCorpus | undefined>;
}

export async function putCorpus(corpus: LifeCorpus): Promise<void> {
	await (await db()).put('meta', corpus, 'corpus');
}

/* --- stories ------------------------------------------------------------- */

export async function allStories(): Promise<Story[]> {
	const stories = await (await db()).getAll('stories');
	return stories.sort((a, b) => a.shelf.localeCompare(b.shelf) || a.seq - b.seq);
}

export async function getStory(id: string): Promise<Story | undefined> {
	return (await db()).get('stories', id);
}

export async function putStory(story: Story): Promise<void> {
	await (await db()).put('stories', story);
}

export async function putStories(stories: Story[]): Promise<void> {
	const tx = (await db()).transaction('stories', 'readwrite');
	await Promise.all([...stories.map((s) => tx.store.put(s)), tx.done]);
}

/* --- vocabulary ---------------------------------------------------------- */

export async function allVocab(): Promise<VocabEntry[]> {
	const words = await (await db()).getAll('vocab');
	return words.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function getVocab(word: string): Promise<VocabEntry | undefined> {
	return (await db()).get('vocab', word.toLowerCase());
}

export async function putVocab(entry: VocabEntry): Promise<void> {
	await (await db()).put('vocab', { ...entry, word: entry.word.toLowerCase() });
}

/**
 * Record a tap. The first tap creates the entry with the meaning that was
 * shown; later taps only bump the counter, because the first context is the
 * one the learner will remember the word by.
 */
export async function recordWordTap(args: {
	word: string;
	sentence: string;
	meaningNative: string;
}): Promise<VocabEntry> {
	const word = args.word.toLowerCase();
	const now = new Date().toISOString();
	const existing = await getVocab(word);
	const entry: VocabEntry = existing
		? { ...existing, taps: existing.taps + 1, lastSeenAt: now }
		: {
				word,
				firstContext: args.sentence,
				meaningNative: args.meaningNative,
				taps: 1,
				exposures: 1,
				status: 'new',
				lastSeenAt: now
			};
	await putVocab(entry);
	return entry;
}

/* --- tracks -------------------------------------------------------------- */

export async function allTracks(): Promise<Track[]> {
	return (await db()).getAll('tracks');
}

export async function putTrack(track: Track): Promise<void> {
	await (await db()).put('tracks', track);
}

/* --- translation caches -------------------------------------------------- */

/** Cache key for a contextual word sense: the word *and* the sentence it sits in. */
export function senseKey(word: string, sentence: string, native: string): string {
	return `${native}::${word.toLowerCase()}::${sentence.trim()}`;
}

export async function getCachedSense(key: string): Promise<TranslationCacheEntry | undefined> {
	return (await db()).get('wordSenses', key);
}

export async function putCachedSense(entry: TranslationCacheEntry): Promise<void> {
	await (await db()).put('wordSenses', entry);
}

export async function getCachedSentence(key: string): Promise<SentenceCacheEntry | undefined> {
	return (await db()).get('sentences', key);
}

export async function putCachedSentence(entry: SentenceCacheEntry): Promise<void> {
	await (await db()).put('sentences', entry);
}

/* --- export / import / erase --------------------------------------------- */

export interface DastanBackup {
	format: 'dastan-backup';
	version: 1;
	exportedAt: string;
	profile?: LearnerProfile;
	corpus?: LifeCorpus;
	stories: Story[];
	vocab: VocabEntry[];
	tracks: Track[];
}

export async function exportAll(): Promise<DastanBackup> {
	return {
		format: 'dastan-backup',
		version: 1,
		exportedAt: new Date().toISOString(),
		profile: await getProfile(),
		corpus: await getCorpus(),
		stories: await allStories(),
		vocab: await allVocab(),
		tracks: await allTracks()
	};
}

/** Replaces the learner's data with the contents of a backup file. */
export async function importAll(backup: DastanBackup): Promise<number> {
	if (backup?.format !== 'dastan-backup') throw new Error('Not a Dastan backup file');
	const database = await db();
	const tx = database.transaction(['meta', 'stories', 'vocab', 'tracks'], 'readwrite');
	await Promise.all([
		tx.objectStore('stories').clear(),
		tx.objectStore('vocab').clear(),
		tx.objectStore('tracks').clear()
	]);
	if (backup.profile) await tx.objectStore('meta').put(backup.profile, 'profile');
	if (backup.corpus) await tx.objectStore('meta').put(backup.corpus, 'corpus');
	for (const story of backup.stories ?? []) await tx.objectStore('stories').put(story);
	for (const word of backup.vocab ?? []) await tx.objectStore('vocab').put(word);
	for (const track of backup.tracks ?? []) await tx.objectStore('tracks').put(track);
	await tx.done;
	return backup.stories?.length ?? 0;
}

export async function eraseAll(): Promise<void> {
	const database = await db();
	const tx = database.transaction(
		['meta', 'stories', 'vocab', 'tracks', 'wordSenses', 'sentences'],
		'readwrite'
	);
	await Promise.all([
		tx.objectStore('meta').clear(),
		tx.objectStore('stories').clear(),
		tx.objectStore('vocab').clear(),
		tx.objectStore('tracks').clear(),
		tx.objectStore('wordSenses').clear(),
		tx.objectStore('sentences').clear(),
		tx.done
	]);
}
