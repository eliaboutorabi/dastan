import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
	Book,
	LearnerProfile,
	LifeCorpus,
	SentenceCacheEntry,
	Source,
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
	sources: { key: string; value: Source };
	books: { key: string; value: Book; indexes: { 'by-shelf': string } };
	wordSenses: { key: string; value: TranslationCacheEntry };
	sentences: { key: string; value: SentenceCacheEntry };
}

const DB_NAME = 'dastan';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<DastanDB>> | null = null;

function db() {
	dbPromise ??= openDB<DastanDB>(DB_NAME, DB_VERSION, {
		// Upgrades are additive and each version guard runs in order, so someone
		// who already has stories and a vocabulary keeps every one of them.
		upgrade(database, oldVersion) {
			if (oldVersion < 1) {
				database.createObjectStore('meta');
				const stories = database.createObjectStore('stories', { keyPath: 'id' });
				stories.createIndex('by-shelf', 'shelf');
				const vocab = database.createObjectStore('vocab', { keyPath: 'word' });
				vocab.createIndex('by-status', 'status');
				database.createObjectStore('tracks', { keyPath: 'id' });
				database.createObjectStore('wordSenses', { keyPath: 'key' });
				database.createObjectStore('sentences', { keyPath: 'key' });
			}
			if (oldVersion < 2) {
				database.createObjectStore('sources', { keyPath: 'id' });
				const books = database.createObjectStore('books', { keyPath: 'id' });
				books.createIndex('by-shelf', 'shelf');
			}
		}
	});
	return dbPromise;
}

/**
 * IndexedDB stores values by structured-clone, and Svelte's reactive state is
 * a Proxy — handing one straight to `put` fails with "could not be cloned",
 * which is exactly what happened the first time a word was tapped on the
 * deployed site. Everything stored here is plain JSON, so a round trip is both
 * a faithful copy and a proxy stripper. Doing it at this layer means no caller
 * has to remember.
 */
function plain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/* --- profile & corpus ---------------------------------------------------- */

export async function getProfile(): Promise<LearnerProfile | undefined> {
	return (await db()).get('meta', 'profile') as Promise<LearnerProfile | undefined>;
}

export async function putProfile(profile: LearnerProfile): Promise<void> {
	await (await db()).put('meta', plain(profile), 'profile');
}

export async function getCorpus(): Promise<LifeCorpus | undefined> {
	return (await db()).get('meta', 'corpus') as Promise<LifeCorpus | undefined>;
}

export async function putCorpus(corpus: LifeCorpus): Promise<void> {
	await (await db()).put('meta', plain(corpus), 'corpus');
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
	await (await db()).put('stories', plain(story));
}

export async function putStories(stories: Story[]): Promise<void> {
	const tx = (await db()).transaction('stories', 'readwrite');
	await Promise.all([...stories.map((s) => tx.store.put(plain(s))), tx.done]);
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
	await (await db()).put('vocab', plain({ ...entry, word: entry.word.toLowerCase() }));
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
	meaningSimple: string;
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
				meaningSimple: args.meaningSimple,
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
	await (await db()).put('tracks', plain(track));
}

/* --- sources & books ------------------------------------------------------ */

export async function allSources(): Promise<Source[]> {
	const sources = await (await db()).getAll('sources');
	return sources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSource(id: string): Promise<Source | undefined> {
	return (await db()).get('sources', id);
}

export async function putSource(source: Source): Promise<void> {
	await (await db()).put('sources', plain(source));
}

export async function allBooks(): Promise<Book[]> {
	const books = await (await db()).getAll('books');
	return books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBook(id: string): Promise<Book | undefined> {
	return (await db()).get('books', id);
}

export async function putBook(book: Book): Promise<void> {
	await (await db()).put('books', plain(book));
}

/* --- translation caches -------------------------------------------------- */

/** Cache key for a contextual word sense: the word *and* the sentence it sits in. */
export function senseKey(word: string, sentence: string, native: string): string {
	// The `v2` is the prompt contract version. Bumping it retires cache entries
	// written under an older contract instead of serving half-filled ones.
	return `v2::${native}::${word.toLowerCase()}::${sentence.trim()}`;
}

export async function getCachedSense(key: string): Promise<TranslationCacheEntry | undefined> {
	return (await db()).get('wordSenses', key);
}

export async function putCachedSense(entry: TranslationCacheEntry): Promise<void> {
	await (await db()).put('wordSenses', plain(entry));
}

export async function getCachedSentence(key: string): Promise<SentenceCacheEntry | undefined> {
	return (await db()).get('sentences', key);
}

export async function putCachedSentence(entry: SentenceCacheEntry): Promise<void> {
	await (await db()).put('sentences', plain(entry));
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
	sources: Source[];
	books: Book[];
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
		tracks: await allTracks(),
		sources: await allSources(),
		books: await allBooks()
	};
}

/** Replaces the learner's data with the contents of a backup file. */
export async function importAll(backup: DastanBackup): Promise<number> {
	if (backup?.format !== 'dastan-backup') throw new Error('Not a Dastan backup file');
	const database = await db();
	const tx = database.transaction(
		['meta', 'stories', 'vocab', 'tracks', 'sources', 'books'],
		'readwrite'
	);
	await Promise.all([
		tx.objectStore('stories').clear(),
		tx.objectStore('vocab').clear(),
		tx.objectStore('tracks').clear(),
		tx.objectStore('sources').clear(),
		tx.objectStore('books').clear()
	]);
	if (backup.profile) await tx.objectStore('meta').put(backup.profile, 'profile');
	if (backup.corpus) await tx.objectStore('meta').put(backup.corpus, 'corpus');
	for (const story of backup.stories ?? []) await tx.objectStore('stories').put(plain(story));
	for (const word of backup.vocab ?? []) await tx.objectStore('vocab').put(plain(word));
	for (const track of backup.tracks ?? []) await tx.objectStore('tracks').put(plain(track));
	for (const source of backup.sources ?? []) await tx.objectStore('sources').put(plain(source));
	for (const book of backup.books ?? []) await tx.objectStore('books').put(plain(book));
	await tx.done;
	return backup.stories?.length ?? 0;
}

export async function eraseAll(): Promise<void> {
	const database = await db();
	const tx = database.transaction(
		['meta', 'stories', 'vocab', 'tracks', 'sources', 'books', 'wordSenses', 'sentences'],
		'readwrite'
	);
	await Promise.all([
		tx.objectStore('meta').clear(),
		tx.objectStore('stories').clear(),
		tx.objectStore('vocab').clear(),
		tx.objectStore('tracks').clear(),
		tx.objectStore('sources').clear(),
		tx.objectStore('books').clear(),
		tx.objectStore('wordSenses').clear(),
		tx.objectStore('sentences').clear(),
		tx.done
	]);
}
