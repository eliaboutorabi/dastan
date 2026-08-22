<script lang="ts">
	import { base } from '$app/paths';
	import { CHECK_PASSAGES, levelFromTaps } from '$lib/content/levelCheck';
	import { t } from '$lib/i18n/ui.svelte';
	import { parseStory } from '$lib/reader/tokenize';
	import { settings } from '$lib/settings/store.svelte';

	/**
	 * Finding the learner's level without ever asking them to rate themselves.
	 *
	 * They read passages that climb the ladder and tap the words they do not
	 * know — the same gesture they already use while reading, so there is
	 * nothing new to learn. The passages ship in the bundle, which means this
	 * costs nothing and works before any API key exists.
	 */

	let stage = $state<'intro' | 'reading' | 'result'>('intro');
	let index = $state(0);
	let unknown = $state<Set<string>[]>(CHECK_PASSAGES.map(() => new Set()));

	const passage = $derived(CHECK_PASSAGES[index]);
	const parsed = $derived(parseStory(passage.text));
	const result = $derived(levelFromTaps(unknown.map((set) => set.size)));

	function toggle(key: string) {
		const next = new Set(unknown[index]);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		unknown = unknown.map((set, i) => (i === index ? next : set));
	}

	function advance() {
		if (index < CHECK_PASSAGES.length - 1) index += 1;
		else stage = 'result';
	}

	function accept() {
		settings.replace({ level: result, levelCheckedAt: new Date().toISOString() });
	}

	function restart() {
		unknown = CHECK_PASSAGES.map(() => new Set());
		index = 0;
		stage = 'reading';
	}
</script>

<div class="page page-narrow">
	<header class="page-head">
		<a class="back" href="{base}/settings/">← {t('settings.title')}</a>
		<h1>{t('level.title')}</h1>
		<p>{t('level.blurb')}</p>
	</header>

	{#if stage === 'intro'}
		<div class="card">
			<button class="btn btn-primary" onclick={() => (stage = 'reading')}>
				{t('level.start')}
			</button>
		</div>
	{:else if stage === 'reading'}
		<div class="card">
			<div class="progress-row">
				<span class="section-label"
					>{t('level.progress', { n: index + 1, total: CHECK_PASSAGES.length })}</span
				>
				<div class="dots" aria-hidden="true">
					{#each CHECK_PASSAGES as _, dot (dot)}
						<span class:on={dot <= index}></span>
					{/each}
				</div>
			</div>

			<p class="instruction">{t('level.instruction')}</p>

			<p class="passage" lang={settings.current.targetLanguage}>
				{#each parsed.paragraphs as paragraph (paragraph.start)}
					{#each paragraph.sentences as sentence (sentence.start)}
						{#each sentence.tokens as token (token.start)}
							{#if token.kind === 'word'}
								<button
									type="button"
									class="word"
									class:unknown={unknown[index].has(`${token.start}`)}
									aria-pressed={unknown[index].has(`${token.start}`)}
									onclick={() => toggle(`${token.start}`)}>{token.text}</button
								>
							{:else}<span>{token.text}</span>{/if}
						{/each}
					{/each}
				{/each}
			</p>

			<div class="row">
				<button class="btn btn-primary" onclick={advance}>
					{index < CHECK_PASSAGES.length - 1 ? t('level.next') : t('level.finish')}
				</button>
				{#if unknown[index].size === 0}
					<span class="hint">{t('level.knownAll')}</span>
				{/if}
			</div>
		</div>
	{:else}
		<div class="card result">
			<p class="big">{t('level.result', { n: result })}</p>
			<p class="intro">{t('level.result.blurb')}</p>
			<div class="row">
				<a class="btn btn-primary" href="{base}/settings/" onclick={accept}>{t('level.accept')}</a>
				<button class="btn" onclick={restart}>{t('level.redo')}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: var(--s3);
		color: var(--ink-soft);
		text-decoration: none;
		font-size: var(--text-sm);
	}

	.progress-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		margin-bottom: var(--s4);
	}

	.dots {
		display: flex;
		gap: var(--s1);
	}

	.dots span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--rule-strong);
	}

	.dots span.on {
		background: var(--lapis);
	}

	.instruction {
		margin-bottom: var(--s4);
		padding: var(--s2) var(--s3);
		background: var(--lapis-wash);
		border-radius: var(--radius);
		color: var(--lapis-deep);
		font-size: var(--text-sm);
	}

	.passage {
		font-family: var(--font-read);
		font-size: var(--read-size);
		line-height: 1.85;
		margin-bottom: var(--s5);
	}

	.word {
		display: inline;
		padding: 0 1px;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		border-radius: 3px;
	}

	.word:hover {
		background: var(--lapis-wash);
	}

	.word.unknown {
		background: var(--saffron-wash);
		box-shadow: inset 0 -2px 0 var(--saffron);
		font-weight: 600;
	}

	.row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--s3);
	}

	.hint {
		color: var(--ink-faint);
		font-size: var(--text-sm);
	}

	.big {
		font-family: var(--font-read);
		font-size: var(--text-xl);
		margin-bottom: var(--s3);
	}

	.intro {
		color: var(--ink-soft);
		font-size: var(--text-base);
		line-height: 1.65;
		margin-bottom: var(--s5);
		max-width: 56ch;
	}
</style>
