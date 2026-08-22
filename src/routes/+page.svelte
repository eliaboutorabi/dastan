<script lang="ts">
	import { base } from '$app/paths';
	import Spine from '$lib/components/Spine.svelte';
	import { library, SHELVES } from '$lib/stores/library.svelte';
	import { settings } from '$lib/settings/store.svelte';
	import type { StringKey } from '$lib/i18n';
	import { t } from '$lib/i18n/ui.svelte';
	import type { Shelf } from '$lib/types';


	const shelfBlurb = (shelf: Shelf) => `shelf.${shelf}.blurb` as StringKey;
	const shelfTitle = (shelf: Shelf) => `shelf.${shelf}` as StringKey;

	function statusLabel(status: string): string {
		if (status === 'finished') return t('shelf.finished');
		if (status === 'reading') return t('shelf.reading');
		return t('shelf.level', { n: 0 });
	}
</script>

<header class="masthead">
	<h1>{t('shelf.title')}</h1>
	<p>{t('app.tagline')}</p>
</header>

{#if !settings.hasKey}
	<div class="notice card">
		<p>{t('shelf.needsKey')}</p>
		<a class="btn btn-primary" href="{base}/settings/">{t('shelf.addKey')}</a>
	</div>
{/if}

{#each SHELVES as shelf (shelf)}
	{@const stories = library.byShelf(shelf)}
	<section class="shelf">
		<div class="shelf-head">
			<h2>{t(shelfTitle(shelf))}</h2>
			<p>{t(shelfBlurb(shelf))}</p>
		</div>

		<div class="rail" role="list">
			{#if stories.length}
				{#each stories as story (story.id)}
					<div role="listitem">
						<Spine
							{story}
							href="{base}/read/{story.id}/"
							label={statusLabel(story.status)}
							locked={story.status === 'locked'}
							lockedHint={t('shelf.locked')}
						/>
						{#if story.bundled}
							<span class="tag">{t('shelf.empty.sample')}</span>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="empty">{t('shelf.comingNext')}</p>
			{/if}
		</div>
	</section>
{/each}

<style>
	.masthead {
		padding: 2rem 1.25rem 0.5rem;
	}

	.masthead h1 {
		font-family: var(--font-read);
		font-size: 1.6rem;
	}

	.masthead p {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.notice {
		margin: 1rem 1.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.notice p {
		margin: 0;
		font-size: 0.95rem;
	}

	.shelf {
		margin-top: 1.75rem;
	}

	.shelf-head {
		padding: 0 1.25rem;
	}

	.shelf-head h2 {
		font-family: var(--font-read);
		font-size: 1.15rem;
	}

	.shelf-head p {
		margin: 0.15rem 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	/* The rail is a real shelf: the books stand on a hairline with a soft
	   shadow under them, and it scrolls sideways on a phone. */
	.rail {
		display: flex;
		align-items: flex-end;
		gap: 0.6rem;
		padding: 1rem 1.25rem 1.1rem;
		margin-top: 0.5rem;
		overflow-x: auto;
		scrollbar-width: thin;
		background:
			linear-gradient(transparent 96%, var(--rule) 96%, var(--rule) 97%, transparent 97%);
	}

	.rail > div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.tag {
		font-size: 0.68rem;
		color: var(--ink-soft);
		max-width: 78px;
		text-align: center;
		line-height: 1.25;
	}

	.empty {
		margin: 0;
		padding-bottom: 1.5rem;
		color: var(--ink-faint);
		font-size: 0.88rem;
	}
</style>
