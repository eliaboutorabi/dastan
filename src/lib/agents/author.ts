import { getStory, putBook, putSource, putStories, putStory, allVocab } from '$lib/db';
import { forPrompt } from '$lib/files/extract';
import { languageName } from '$lib/i18n';
import { createChatModel, messageText } from '$lib/llm/provider';
import { settings } from '$lib/settings/store.svelte';
import type { Book, OutlineEntry, Shelf, Source, Story, VocabEntry } from '$lib/types';
import { clampLevel, levelPlan } from './ladder';
import {
	bookOutlineSystemPrompt,
	storySystemPrompt,
	type SourceBrief,
	type StoryRequest
} from './prompts/storyAuthor';

/**
 * The author.
 *
 * One path serves every shelf, because a life, a resume, a research paper and
 * a typed topic are all just *source material* — the only thing that changes
 * is the instruction block at the top of the prompt.
 *
 * The flow is deliberately two-stage: plan the whole book first and show the
 * learner the plan, then write stories only as they are reached. It keeps the
 * wait short, keeps the cost low, and — more importantly — leaves the learner
 * as the editor of their own book rather than the recipient of it.
 */

function parseJsonObject<T>(raw: string): T | null {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = (fenced ? fenced[1] : raw).trim();
	const start = candidate.indexOf('{');
	const end = candidate.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		return JSON.parse(candidate.slice(start, end + 1)) as T;
	} catch {
		return null;
	}
}

/**
 * What actually came back, trimmed down enough to put in front of a learner.
 *
 * A bare "that did not work" is the most frustrating possible failure: it
 * gives neither of us anything to act on. Showing the first line of the reply
 * distinguishes a refusal from a truncation from a model that answered in
 * prose, which are three different problems with three different fixes.
 */
function describeReply(raw: string): string {
	const clean = raw.trim().replace(/\s+/g, ' ');
	if (!clean) return 'the model replied with nothing at all';
	return `the model replied: “${clean.slice(0, 160)}${clean.length > 160 ? '…' : ''}”`;
}

const JSON_REMINDER =
	'\n\nYour last reply could not be read as JSON. Reply with the JSON object only — no explanation before it, no markdown fence around it, and nothing after it.';

/**
 * Ask, and if the reply cannot be parsed, ask once more with the format spelt
 * out. Models occasionally wrap the object in prose; a single corrective retry
 * costs one call and rescues most of those.
 */
async function askForJson<T>(args: {
	system: string;
	human: string;
	maxTokens: number;
}): Promise<{ parsed: T | null; raw: string }> {
	const model = createChatModel({ maxTokens: args.maxTokens });

	let raw = messageText((await model.invoke([['system', args.system], ['human', args.human]])).content);
	let parsed = parseJsonObject<T>(raw);
	if (parsed) return { parsed, raw };

	raw = messageText(
		(await model.invoke([['system', args.system + JSON_REMINDER], ['human', args.human]])).content
	);
	parsed = parseJsonObject<T>(raw);
	return { parsed, raw };
}

function id(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const SHELF_FOR_KIND: Record<Source['kind'], Shelf> = {
	life: 'my-story',
	career: 'my-career',
	topic: 'curiosity',
	document: 'documents'
};

function briefFor(source: Source): SourceBrief {
	const material = forPrompt(source.content);
	switch (source.kind) {
		case 'life':
			return { kind: 'life', material };
		case 'document':
			return { kind: 'document', material, documentName: source.file?.name ?? source.title };
		case 'career':
			return { kind: 'career', material, topic: source.title };
		case 'topic':
			return { kind: 'topic', material, topic: source.title };
	}
}

interface OutlineReply {
	bookTitle: string;
	bookTitleNative: string;
	stories: OutlineEntry[];
	note?: string;
}

/**
 * Stage one: read the source and plan the book. Nothing is written yet, and
 * nothing is saved until the learner approves it at the gate.
 */
export async function planBook(
	source: Source,
	options: { targetCount?: number } = {}
): Promise<{ book: Book; outline: OutlineEntry[] }> {
	const startLevel = clampLevel(settings.current.level);
	const brief = briefFor(source);

	const countInstruction = options.targetCount
		? `\n\nThe learner has asked for about ${options.targetCount} stories. Honour that if the material can carry it; if it genuinely cannot, come closer to it than you otherwise would and say so in your note.`
		: '';

	const { parsed, raw } = await askForJson<OutlineReply>({
		system:
			bookOutlineSystemPrompt({
				source: brief,
				nativeLanguageName: languageName(settings.current.nativeLanguage),
				targetLanguageName: languageName(settings.current.targetLanguage),
				startLevel
			}) + countInstruction,
		human: `MATERIAL:\n\n${brief.material}`,
		// Room for a long outline plus whatever thinking the model does first.
		// Too small a ceiling truncates the JSON mid-object, which reads as a
		// parse failure and hides the real cause.
		maxTokens: 12000
	});

	if (!parsed?.stories?.length) {
		throw new Error(`The plan came back in a shape I could not read — ${describeReply(raw)}`);
	}

	// The author chooses the count; the app owns the ladder, so the levels are
	// re-spread here rather than trusted from the model.
	const plan = levelPlan(startLevel, parsed.stories.length);
	const outline: OutlineEntry[] = parsed.stories.map((entry, index) => ({
		seq: index + 1,
		title: entry.title,
		titleNative: entry.titleNative ?? '',
		summary: entry.summary ?? '',
		level: plan[index]
	}));

	const book: Book = {
		id: id('book'),
		sourceId: source.id,
		shelf: SHELF_FOR_KIND[source.kind],
		title: parsed.bookTitle || source.title,
		titleNative: parsed.bookTitleNative || '',
		outline,
		storyIds: [],
		note: parsed.note,
		status: 'awaiting-approval',
		createdAt: new Date().toISOString()
	};

	return { book, outline };
}

interface StoryReply {
	title: string;
	titleNative: string;
	body: string;
	targetWords: string[];
	glossary: Record<string, string>;
}

/** Stage two: write one story from the approved plan. */
export async function writeStory(args: {
	book: Book;
	source: Source;
	entry: OutlineEntry;
	previousStoryId?: string;
}): Promise<Story> {
	const { book, source, entry } = args;

	const vocabulary = await allVocab();
	const learningWords: VocabEntry[] = vocabulary.filter((word) => word.status === 'learning');
	const previous = args.previousStoryId ? await getStory(args.previousStoryId) : undefined;

	const request: StoryRequest = {
		level: entry.level,
		targetLanguageName: languageName(settings.current.targetLanguage),
		nativeLanguageName: languageName(settings.current.nativeLanguage),
		brief: entry.summary || entry.title,
		seq: entry.seq,
		total: book.outline.length,
		sourceMaterial: forPrompt(source.content, 14000),
		learningWords,
		previousNewWords: previous?.targetWords ?? [],
		voice: source.kind === 'life' ? 'first-person' : 'third-person'
	};

	const { parsed, raw } = await askForJson<StoryReply>({
		system: storySystemPrompt(request),
		human: `Write story ${entry.seq}: ${entry.title}`,
		maxTokens: 12000
	});

	if (!parsed?.body) {
		throw new Error(`Story ${entry.seq} came back in a shape I could not read — ${describeReply(raw)}`);
	}

	return {
		id: id('story'),
		shelf: book.shelf,
		bookId: book.id,
		seq: entry.seq,
		level: entry.level,
		title: parsed.title || entry.title,
		titleNative: parsed.titleNative || entry.titleNative,
		body: parsed.body,
		targetWords: (parsed.targetWords ?? []).map((word) => word.toLowerCase()),
		glossary: parsed.glossary ?? {},
		status: entry.seq === 1 ? 'available' : 'locked',
		tapCount: 0,
		sources: source.references
	};
}

/**
 * The approved book. Only the first stories are written now — the rest are
 * written as the learner reaches them, which keeps the wait to one story and
 * means an abandoned book costs almost nothing.
 */
export const EAGER_STORIES = 2;

export async function createApprovedBook(args: {
	source: Source;
	book: Book;
	onProgress?: (written: number, total: number) => void;
}): Promise<Book> {
	const { source, book } = args;
	await putSource(source);

	const eager = book.outline.slice(0, EAGER_STORIES);
	const written: Story[] = [];
	let previousStoryId: string | undefined;

	for (const entry of eager) {
		const story = await writeStory({ book, source, entry, previousStoryId });
		written.push(story);
		previousStoryId = story.id;
		args.onProgress?.(written.length, eager.length);
	}

	await putStories(written);

	const saved: Book = { ...book, status: 'active', storyIds: written.map((s) => s.id) };
	await putBook(saved);
	return saved;
}

/**
 * Called when the learner opens a story that has been planned but not yet
 * written. This is the lazy half of the generation strategy.
 */
export async function ensureStoryWritten(book: Book, source: Source, seq: number): Promise<Story> {
	const existing = book.storyIds.length ? await getStory(book.storyIds[seq - 1] ?? '') : undefined;
	if (existing) return existing;

	const entry = book.outline.find((candidate) => candidate.seq === seq);
	if (!entry) throw new Error(`Story ${seq} is not in this book's plan.`);

	const story = await writeStory({
		book,
		source,
		entry,
		previousStoryId: book.storyIds[seq - 2]
	});
	await putStory(story);

	const storyIds = [...book.storyIds];
	storyIds[seq - 1] = story.id;
	await putBook({ ...book, storyIds });
	return story;
}
