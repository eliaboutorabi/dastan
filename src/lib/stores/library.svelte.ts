import { allStories, getStory, putStory } from '$lib/db';
import { SAMPLE_STORY } from '$lib/content/sampleStory';
import type { Shelf, Story } from '$lib/types';

/**
 * The bookshelf, in memory.
 *
 * On the very first run it seeds the bundled sample story, so a brand-new
 * visitor with no key at all still lands on a shelf with a book on it rather
 * than on an empty room with a form in the middle.
 */
class Library {
	stories = $state<Story[]>([]);
	loaded = $state(false);

	async load() {
		let stories = await allStories();
		if (!stories.some((s) => s.id === SAMPLE_STORY.id) && !stories.length) {
			await putStory({ ...SAMPLE_STORY });
			stories = await allStories();
		}
		this.stories = stories;
		this.loaded = true;
	}

	byShelf(shelf: Shelf): Story[] {
		return this.stories.filter((s) => s.shelf === shelf).sort((a, b) => a.seq - b.seq);
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
}

export const library = new Library();

export const SHELVES: Shelf[] = ['my-story', 'my-career', 'curiosity'];
