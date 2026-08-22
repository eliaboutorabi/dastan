<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import WordPopup from '$lib/components/WordPopup.svelte';
	import { lookupWord, translateSentence } from '$lib/agents/translator';
	import { getStory, recordWordTap } from '$lib/db';
	import { dirOf, translate, type StringKey } from '$lib/i18n';
	import { MissingKeyError } from '$lib/llm/provider';
	import { parseStory, type Sentence, type Token } from '$lib/reader/tokenize';
	import { Speaker } from '$lib/reader/tts.svelte';
	import { settings, type ThemeId } from '$lib/settings/store.svelte';
	import { library } from '$lib/stores/library.svelte';
	import { recalibrate } from '$lib/agents/ladder';
	import type { Story, WordSense } from '$lib/types';

	const t = $derived((key: StringKey, vars?: Record<string, string | number>) =>
		translate(settings.current.nativeLanguage, key, vars)
	);
	const nativeDir = $derived(dirOf(settings.current.nativeLanguage));
	const targetDir = $derived(dirOf(settings.current.targetLanguage));

	let story = $state<Story | null>(null);
	let notFound = $state(false);
	const parsed = $derived(story ? parseStory(story.body) : null);

	// --- word tap ---------------------------------------------------------
	let tappedWord = $state('');
	let tappedSentence = $state('');
	let sense = $state<WordSense | null>(null);
	let senseLoading = $state(false);
	let senseError = $state<string | null>(null);
	let anchor = $state<{ x: number; y: number } | null>(null);

	// --- sentence translation --------------------------------------------
	let openSentence = $state<string | null>(null);
	let sentenceText = $state<string | null>(null);
	let sentenceError = $state<string | null>(null);

	// --- read aloud -------------------------------------------------------
	const speaker = new Speaker();
	const ttsSupported = Speaker.supported;

	let finished = $state(false);
	let calibrationNote = $state<string | null>(null);

	$effect(() => {
		const id = page.params.id;
		if (!id) return;
		getStory(id).then((found) => {
			if (found) {
				story = found;
				notFound = false;
			} else {
				notFound = true;
			}
		});
	});

	$effect(() => {
		speaker.configure({
			lang: settings.current.targetLanguage,
			rate: settings.current.speechRate,
			voiceURI: settings.current.voiceURI
		});
	});

	onDestroy(() => speaker.stop());

	function friendlyError(error: unknown): string {
		if (error instanceof MissingKeyError) return t('reader.noKey');
		const message = error instanceof Error ? error.message : String(error);
		if (/401|invalid.*key|authentication/i.test(message)) return t('reader.noKey');
		return message;
	}

	async function onWordTap(event: MouseEvent, token: Token, sentence: Sentence) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		anchor = { x: rect.left + rect.width / 2, y: rect.top };
		tappedWord = token.text;
		tappedSentence = sentence.text;
		sense = null;
		senseError = null;
		senseLoading = true;

		try {
			const result = await lookupWord(token.text, sentence.text);
			sense = result;
			// The tap itself is the signal the app calibrates on, so it is
			// recorded whether or not the learner reads the whole popup.
			await recordWordTap({
				word: token.text,
				sentence: sentence.text,
				meaningNative: result.meaning
			});
			if (story) {
				const updated = { ...story, tapCount: story.tapCount + 1 };
				story = updated;
				await library.save(updated);
			}
		} catch (error) {
			senseError = friendlyError(error);
		} finally {
			senseLoading = false;
		}
	}

	function closePopup() {
		tappedWord = '';
		sense = null;
		senseError = null;
		anchor = null;
	}

	async function onSentenceTap(sentence: Sentence) {
		if (openSentence === sentence.text) {
			openSentence = null;
			return;
		}
		openSentence = sentence.text;
		sentenceText = null;
		sentenceError = null;
		try {
			sentenceText = await translateSentence(sentence.text);
		} catch (error) {
			sentenceError = friendlyError(error);
		}
	}

	function togglePlay() {
		if (!parsed) return;
		if (!speaker.speaking) {
			speaker.start(parsed.paragraphs);
		} else if (speaker.paused) {
			speaker.resume();
		} else {
			speaker.pause();
		}
	}

	async function finishStory() {
		if (!story || !parsed) return;
		speaker.stop();
		const { direction } = recalibrate(story.level, story.tapCount, parsed.wordCount);
		const updated: Story = {
			...story,
			status: 'finished',
			finishedAt: new Date().toISOString()
		};
		story = updated;
		await library.save(updated);
		finished = true;
		// The learner is never shown the tap rate or a level number — only this
		// one gentle sentence about what happens next.
		calibrationNote =
			direction === 'easier'
				? t('reader.finished.easier')
				: direction === 'harder'
					? t('reader.finished.harder')
					: t('reader.finished.body');
	}

	const speeds = [0.7, 1, 1.25];
	const themes: ThemeId[] = ['paper', 'sepia', 'night'];
</script>

<div class="reader" dir={targetDir}>
	<header dir={nativeDir}>
		<a class="back" href="{base}/" aria-label={t('nav.back')}>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" />
			</svg>
			{t('nav.back')}
		</a>
	</header>

	{#if notFound}
		<p class="missing">{t('reader.notFound')}</p>
	{:else if story && parsed}
		<article>
			<h1 dir={targetDir}>{story.title}</h1>
			<p class="native-title" dir={nativeDir}>{story.titleNative}</p>
			<p class="hint" dir={nativeDir}>{t('reader.tapHint')} {t('reader.sentenceHint')}</p>

			{#each parsed.paragraphs as paragraph (paragraph.start)}
				<p class="para">
					{#each paragraph.sentences as sentence (sentence.start)}<span class="sentence"
							>{#each sentence.tokens as token (token.start)}{#if token.kind === 'word'}<button
										type="button"
										class="word"
										class:bold={token.bold}
										class:speaking={speaker.cursor >= token.start && speaker.cursor < token.end}
										onclick={(event) => onWordTap(event, token, sentence)}>{token.text}</button
									>{:else}<span class="gap">{token.text}</span>{/if}{/each}<button
							type="button"
							class="pilcrow"
							aria-label={t('reader.translateSentence')}
							onclick={() => onSentenceTap(sentence)}>¶</button
						><span class="gap">{sentence.trailing}</span></span
						>{#if openSentence === sentence.text}<span class="sentence-translation" dir={nativeDir}
							>{#if sentenceError}<span class="error">{sentenceError}</span>{:else if sentenceText}{sentenceText}{:else}{t(
									'common.loading'
								)}{/if}</span
						>{/if}{/each}
				</p>
			{/each}

			{#if Object.keys(story.glossary).length}
				<section class="glossary" dir={nativeDir}>
					<h2>{t('reader.glossary')}</h2>
					<dl>
						{#each Object.entries(story.glossary) as [word, meaning] (word)}
							<div>
								<dt dir={targetDir} lang={settings.current.targetLanguage}>{word}</dt>
								<dd>{meaning}</dd>
							</div>
						{/each}
					</dl>
				</section>
			{/if}

			{#if story.sources?.length}
				<section class="sources" dir={nativeDir}>
					<h2>{t('reader.sources')}</h2>
					<p>{t('reader.sources.note')}</p>
					<ul>
						{#each story.sources as source (source.url)}
							<li>
								<a href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<div class="finish" dir={nativeDir}>
				{#if finished}
					<div class="celebration">
						<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
							<circle cx="20" cy="20" r="17" fill="none" stroke="var(--saffron)" stroke-width="2" />
							<path d="M13 20.5l5 5 9-11" fill="none" stroke="var(--lapis)" stroke-width="2.5" />
						</svg>
						<p class="celebration-title">{t('reader.finished.title')}</p>
						<p>{calibrationNote}</p>
						<a class="btn" href="{base}/">{t('nav.shelf')}</a>
					</div>
				{:else}
					<button class="btn btn-primary" type="button" onclick={finishStory}>
						{t('reader.finish')}
					</button>
				{/if}
			</div>
		</article>

		<div class="bar" dir="ltr">
			{#if ttsSupported}
				<button
					class="play"
					type="button"
					onclick={togglePlay}
					aria-label={speaker.speaking && !speaker.paused ? t('reader.pause') : t('reader.play')}
				>
					{#if speaker.speaking && !speaker.paused}
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
							><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg
						>
					{:else}
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
							><path d="M7 4l13 8-13 8z" /></svg
						>
					{/if}
				</button>

				<div class="group" role="group" aria-label={t('reader.speed')}>
					{#each speeds as speed (speed)}
						<button
							type="button"
							class:on={settings.current.speechRate === speed}
							onclick={() => settings.set('speechRate', speed)}>{speed}×</button
						>
					{/each}
				</div>
			{:else}
				<span class="unsupported">{t('reader.ttsUnsupported')}</span>
			{/if}

			<div class="group" role="group" aria-label={t('reader.textSize')}>
				<button
					type="button"
					onclick={() => settings.set('textSize', Math.max(15, settings.current.textSize - 1))}
					aria-label="{t('reader.textSize')} −">A−</button
				>
				<button
					type="button"
					onclick={() => settings.set('textSize', Math.min(26, settings.current.textSize + 1))}
					aria-label="{t('reader.textSize')} +">A+</button
				>
			</div>

			<div class="group" role="group" aria-label={t('reader.theme')}>
				{#each themes as theme (theme)}
					<button
						type="button"
						class="swatch {theme}"
						class:on={settings.current.theme === theme}
						onclick={() => settings.set('theme', theme)}
						aria-label={t(`reader.theme.${theme}` as StringKey)}
					></button>
				{/each}
			</div>
		</div>
	{:else}
		<p class="missing">{t('common.loading')}</p>
	{/if}
</div>

{#if tappedWord}
	<WordPopup
		word={tappedWord}
		{sense}
		loading={senseLoading}
		error={senseError}
		{anchor}
		onclose={closePopup}
	/>
{/if}

<style>
	.reader {
		min-height: 100dvh;
		padding-bottom: calc(78px + env(safe-area-inset-bottom));
	}

	header {
		padding: 0.9rem 1.25rem 0;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 0.9rem;
	}

	/* The sanctuary: one column, generous margins, a measure that stops the
	   eye getting lost on a wide screen. */
	article {
		max-width: 65ch;
		margin: 0 auto;
		padding: 1rem 1.4rem 3rem;
		font-family: var(--font-read);
	}

	h1 {
		font-family: var(--font-read);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.native-title {
		margin: 0.25rem 0 0;
		color: var(--ink-soft);
		font-family: var(--font-rtl);
		font-size: 1rem;
	}

	.hint {
		margin: 1rem 0 1.75rem;
		padding: 0.6rem 0.8rem;
		background: var(--lapis-wash);
		border-radius: var(--radius);
		color: var(--ink-soft);
		font-family: var(--font-rtl);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.para {
		font-size: var(--read-size);
		line-height: 1.75;
		margin: 0 0 1.35rem;
	}

	.sentence {
		display: inline;
	}

	/* Words are real buttons, so they are keyboard-reachable — but they must
	   read as running text, not as a page full of controls. */
	.word {
		display: inline;
		padding: 0;
		margin: 0;
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

	.word.bold {
		font-weight: 600;
		box-shadow: inset 0 -2px 0 var(--saffron);
	}

	.word.speaking {
		background: var(--saffron-wash);
		box-shadow: 0 0 0 2px var(--saffron-wash);
	}

	.gap {
		white-space: pre-wrap;
	}

	.pilcrow {
		border: none;
		background: none;
		padding: 0 0.15em;
		font-size: 0.8em;
		color: var(--ink-faint);
		cursor: pointer;
		vertical-align: baseline;
	}

	.pilcrow:hover {
		color: var(--lapis);
	}

	.sentence-translation {
		display: block;
		margin: 0.4rem 0 0.8rem;
		padding: 0.55rem 0.75rem;
		background: var(--paper-sunken);
		border-inline-start: 3px solid var(--lapis);
		border-radius: 0 var(--radius) var(--radius) 0;
		font-family: var(--font-rtl);
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.error {
		color: var(--alarm);
	}

	.glossary,
	.sources {
		margin-top: 2.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--rule);
		font-family: var(--font-rtl);
	}

	.glossary h2,
	.sources h2 {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ink-soft);
		margin-bottom: 0.75rem;
	}

	.glossary dl {
		margin: 0;
	}

	.glossary div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.45rem 0;
		border-bottom: 1px dotted var(--rule);
	}

	.glossary dt {
		font-family: var(--font-read);
		font-weight: 600;
		min-width: 7rem;
	}

	.glossary dd {
		margin: 0;
		flex: 1;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.sources p {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin: 0 0 0.5rem;
	}

	.sources ul {
		margin: 0;
		padding-inline-start: 1.1rem;
		font-size: 0.88rem;
	}

	.finish {
		margin-top: 2.5rem;
		text-align: center;
		font-family: var(--font-rtl);
	}

	.celebration {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.25rem 1.75rem;
		background: var(--saffron-wash);
		border-radius: var(--radius-lg);
	}

	.celebration p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	.celebration-title {
		font-size: 1.1rem !important;
		font-weight: 600;
		color: var(--ink) !important;
	}

	.celebration .btn {
		margin-top: 0.6rem;
	}

	.bar {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.55rem 0.9rem calc(0.55rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--paper) 93%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--rule);
	}

	.play {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 46px;
		height: 46px;
		border: none;
		border-radius: 50%;
		background: var(--lapis);
		fill: var(--paper);
		cursor: pointer;
	}

	.group {
		display: inline-flex;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.group button {
		min-width: 44px;
		min-height: 40px;
		padding: 0 0.5rem;
		border: none;
		background: var(--paper-raised);
		font-size: 0.85rem;
		cursor: pointer;
	}

	.group button + button {
		border-inline-start: 1px solid var(--rule);
	}

	.group button.on {
		background: var(--lapis-wash);
		color: var(--lapis);
		font-weight: 600;
	}

	.swatch {
		width: 44px;
	}

	.swatch.paper {
		background: #f7f2e7;
	}

	.swatch.sepia {
		background: #f0e4ce;
	}

	.swatch.night {
		background: #14161c;
	}

	.swatch.on {
		box-shadow: inset 0 0 0 3px var(--saffron);
	}

	.unsupported,
	.missing {
		color: var(--ink-faint);
		font-size: 0.9rem;
		text-align: center;
		padding: 2rem 1.25rem;
	}
</style>
