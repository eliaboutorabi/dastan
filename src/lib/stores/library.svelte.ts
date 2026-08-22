import { allBooks, allSources, allStories, getStory, putBook, putStory } from '$lib/db';
import { SAMPLE_STORY } from '$lib/content/sampleStory';
import type { Book, Shelf, Source, Story } from '$lib/types';

/**
 * Everything the learner has made, held in memory.
 *
 * Nothing is ever removed here. A book can be archived — which only moves it
 * out of the way on the bookshelf — but its stories stay readable and its
 * source stays in the library, so starting something new can never cost you
 * something old.
 */
class Library {
	stories = $state<Story[]>([]);
	books = $state<Book[]>([]);
	sources = $state<Source[]>([]);
	loaded = $state(false);

	async load() {
		let stories = await allStories();
		// The very first run seeds the bundled sample, so a new visitor lands on
		// a shelf with a book on it rather than an empty room with a form.
		if (!stories.length) {
			await putStory({ ...SAMPLE_STORY });
			stories = await allStories();
		}
		this.stories = stories;
		this.books = await allBooks();
		this.sources = await allSources();
		this.loaded = true;
	}

	byShelf(shelf: Shelf): Story[] {
		return this.stories.filter((s) => s.shelf === shelf).sort((a, b) => a.seq - b.seq);
	}

	/** Books on a shelf that have not been archived out of the way. */
	activeBooks(shelf: Shelf): Book[] {
		return this.books.filter((b) => b.shelf === shelf && b.status !== 'archived');
	}

	bookStories(book: Book): Story[] {
		return book.storyIds
			.map((storyId) => this.stories.find((s) => s.id === storyId))
			.filter((s): s is Story => Boolean(s));
	}

	sourceOf(book: Book): Source | undefined {
		return this.sources.find((s) => s.id === book.sourceId);
	}

	progressOf(book: Book): { done: number; total: number } {
		const stories = this.bookStories(book);
		return {
			done: stories.filter((s) => s.status === 'finished').length,
			total: book.outline.length || stories.length
		};
	}

	/** Stories that belong to no book — the bundled sample, for now. */
	looseStories(shelf: Shelf): Story[] {
		return this.byShelf(shelf).filter((s) => !s.bookId);
	}

	async refresh(id: string) {
		const updated = await getStory(id);
		if (!updated) return;
		this.stories = this.stories.map((s) => (s.id === id ? updated : s));
	}

	async save(story: Story) {
		await putStory(story);
		const exists = this.stories.some((s) => s.id === story.id);
		this.stories = exists
			? this.stories.map((s) => (s.id === story.id ? story : s))
			: [...this.stories, story];
	}

	async saveBook(book: Book) {
		await putBook(book);
		const exists = this.books.some((b) => b.id === book.id);
		this.books = exists ? this.books.map((b) => (b.id === book.id ? book : b)) : [book, ...this.books];
	}

	async setArchived(book: Book, archived: boolean) {
		await this.saveBook({ ...book, status: archived ? 'archived' : 'active' });
	}
}

export const library = new Library();

export const SHELVES: Shelf[] = ['my-story', 'my-career', 'documents', 'curiosity'];
