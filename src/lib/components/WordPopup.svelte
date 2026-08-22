<script lang="ts">
	import { settings } from '$lib/settings/store.svelte';
	import { dirOf, translate, type StringKey } from '$lib/i18n';
	import { Speaker } from '$lib/reader/tts.svelte';
	import type { WordSense } from '$lib/types';

	interface Props {
		word: string;
		sense: WordSense | null;
		loading: boolean;
		error: string | null;
		/** Where the tapped word sits on screen, for the anchored layout. */
		anchor: { x: number; y: number } | null;
		onclose: () => void;
	}

	let { word, sense, loading, error, anchor, onclose }: Props = $props();

	const t = $derived((key: StringKey, vars?: Record<string, string | number>) =>
		translate(settings.current.nativeLanguage, key, vars)
	);
	const nativeDir = $derived(dirOf(settings.current.nativeLanguage));

	let card = $state<HTMLDivElement | null>(null);
	let placement = $state<{ left: number; top: number } | null>(null);

	// Under 640px the card is a sheet at the bottom of the screen, which never
	// covers the word being read and never clips off the edge. Above that it
	// sits next to the word, where the eye already is.
	$effect(() => {
		if (!card || !anchor) return;
		if (window.innerWidth < 640) {
			placement = null;
			return;
		}
		const width = card.offsetWidth;
		const height = card.offsetHeight;
		const margin = 12;
		const left = Math.min(
			Math.max(margin, anchor.x - width / 2),
			window.innerWidth - width - margin
		);
		const above = anchor.y - height - 14;
		placement = { left, top: above > margin ? above : anchor.y + 26 };
	});

	$effect(() => {
		card?.focus();
	});

	function speak() {
		Speaker.say(word, settings.current.targetLanguage, settings.current.voiceURI, 0.85);
	}
</script>

<div
	class="scrim"
	role="presentation"
	onclick={onclose}
	onkeydown={(event) => event.key === 'Escape' && onclose()}
></div>

<div
	bind:this={card}
	class="card"
	class:anchored={placement !== null}
	style:left={placement ? `${placement.left}px` : undefined}
	style:top={placement ? `${placement.top}px` : undefined}
	role="dialog"
	aria-modal="true"
	aria-label={word}
	tabindex="-1"
	onkeydown={(event) => event.key === 'Escape' && onclose()}
>
	<div class="head">
		<span class="word" lang={settings.current.targetLanguage} dir="ltr">{word}</span>
		<button class="icon" type="button" onclick={speak} aria-label={t('reader.speak')}>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4" />
			</svg>
		</button>
	</div>

	<div class="body" dir={nativeDir} lang={settings.current.nativeLanguage}>
		{#if loading}
			<p class="muted">{t('reader.thinking')}</p>
		{:else if sense}
			<p class="meaning">{sense.meaning}</p>
			{#if sense.partOfSpeech}
				<p class="pos">{sense.partOfSpeech}</p>
			{/if}
			{#if sense.note}
				<p class="note">{sense.note}</p>
			{/if}
		{:else if error}
			<p class="error">{error}</p>
		{/if}
	</div>

	<button class="btn btn-primary got-it" type="button" onclick={onclose}>
		{t('reader.gotIt')}
	</button>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--ink) 18%, transparent);
	}

	.card {
		position: fixed;
		z-index: 41;
		inset-inline: 0;
		bottom: 0;
		margin-inline: auto;
		width: min(100%, 420px);
		padding: 1rem 1.1rem calc(1rem + env(safe-area-inset-bottom));
		background: var(--paper-raised);
		border: 1px solid var(--rule);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: var(--shadow-pop);
	}

	.card.anchored {
		inset-inline: auto;
		bottom: auto;
		width: min(340px, calc(100vw - 24px));
		border-radius: var(--radius-lg);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--rule);
	}

	.word {
		font-family: var(--font-read);
		font-size: 1.3rem;
		font-weight: 600;
	}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: var(--lapis-wash);
		fill: var(--lapis);
		cursor: pointer;
	}

	.body {
		min-height: 3.2rem;
		padding: 0.7rem 0 0.3rem;
	}

	.body p {
		margin: 0 0 0.35rem;
	}

	.meaning {
		font-size: 1.05rem;
		line-height: 1.6;
	}

	.pos {
		font-size: 0.82rem;
		color: var(--ink-faint);
	}

	.note {
		font-size: 0.88rem;
		color: var(--ink-soft);
		padding-inline-start: 0.6rem;
		border-inline-start: 2px solid var(--saffron);
		line-height: 1.55;
	}

	.muted {
		color: var(--ink-faint);
	}

	.error {
		color: var(--alarm);
		font-size: 0.92rem;
		line-height: 1.55;
	}

	.got-it {
		width: 100%;
		margin-top: 0.5rem;
	}
</style>
