<script lang="ts">
	import type { Story } from '$lib/types';
	import Icon from '$lib/components/Icon.svelte';
	import SquareLock01Icon from '@hugeicons/core-free-icons/SquareLock01Icon';

	interface Props {
		story: Story;
		href?: string;
		/** 0–1. Reaches 1 when the story is finished; drives the illumination. */
		progress?: number;
		label: string;
		locked?: boolean;
		lockedHint?: string;
	}

	let { story, href, progress = 0, label, locked = false, lockedHint }: Props = $props();

	const filled = $derived(story.status === 'finished' ? 1 : progress);
	// The border is one continuous path; revealing it by dash offset is what
	// makes a finished story look *completed* rather than merely marked.
	const PERIMETER = 2 * (52 + 188) - 8 * 4 + 2 * Math.PI * 8;
	const dash = $derived(PERIMETER * filled);
</script>

<svelte:element
	this={href && !locked ? 'a' : 'div'}
	{...href && !locked ? { href } : { role: 'group' }}
	class="spine"
	class:locked
	class:done={story.status === 'finished'}
	class:current={story.status === 'reading'}
	title={locked ? lockedHint : story.titleNative}
	aria-label={locked ? `${story.title} — ${lockedHint}` : `${story.title} — ${label}`}
>
	<svg class="illumination" viewBox="0 0 60 200" aria-hidden="true">
		<!-- The unlit groove the illumination fills into. -->
		<rect x="4" y="6" width="52" height="188" rx="8" class="groove" />
		<rect
			x="4"
			y="6"
			width="52"
			height="188"
			rx="8"
			class="lit"
			style:stroke-dasharray="{dash} {PERIMETER}"
		/>
		<!-- Tazhib-inspired corner ornaments: four small lotus buds that only
		     appear once the border has come all the way round. -->
		<g class="ornaments" style:opacity={filled >= 1 ? 1 : 0}>
			<path d="M30 12c2.5 0 4 1.6 4 3.4S32.5 19 30 19s-4-1.8-4-3.6S27.5 12 30 12z" />
			<path d="M30 181c2.5 0 4 1.6 4 3.4S32.5 188 30 188s-4-1.8-4-3.6S27.5 181 30 181z" />
			<circle cx="30" cy="15.5" r="1.1" class="pip" />
			<circle cx="30" cy="184.5" r="1.1" class="pip" />
		</g>
	</svg>

	<span class="title">{story.title}</span>

	{#if locked}
		<span class="lock"><Icon icon={SquareLock01Icon} size={14} /></span>
	{:else}
		<span class="level">{story.level}</span>
	{/if}
</svelte:element>

<style>
	.spine {
		position: relative;
		display: block;
		flex: 0 0 auto;
		width: 60px;
		height: 200px;
		border-radius: 8px;
		background: var(--paper-raised);
		border: 1px solid var(--rule);
		text-decoration: none;
		color: var(--ink);
		overflow: hidden;
		transition: transform 0.18s ease, box-shadow 0.18s ease;
	}

	a.spine:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-page);
	}

	.spine.done {
		background: var(--lapis);
		border-color: var(--lapis);
		color: #f7f2e7;
	}

	.spine.current {
		box-shadow: 0 0 0 2px var(--saffron), var(--shadow-page);
	}

	.spine.locked {
		opacity: 0.55;
		background: var(--paper-sunken);
	}

	.illumination {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.groove {
		fill: none;
		stroke: color-mix(in srgb, var(--saffron) 25%, transparent);
		stroke-width: 1.5;
	}

	.lit {
		fill: none;
		stroke: var(--saffron);
		stroke-width: 1.5;
		stroke-linecap: round;
		/* The one animated thing in the app: a story's border closing. */
		transition: stroke-dasharray 900ms cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.ornaments {
		fill: var(--saffron);
		transition: opacity 500ms ease 700ms;
	}

	.ornaments .pip {
		fill: var(--lapis);
	}

	.title {
		position: absolute;
		inset: 26px 0 26px 0;
		display: flex;
		align-items: center;
		justify-content: center;
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: var(--font-read);
		font-size: 0.86rem;
		font-weight: 600;
		line-height: 1.1;
		letter-spacing: 0.01em;
		text-align: center;
		padding: 0 2px;
		overflow: hidden;
	}

	.level,
	.lock {
		position: absolute;
		inset-inline: 0;
		bottom: 8px;
		margin: 0 auto;
		width: fit-content;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--saffron);
		font-variant-numeric: tabular-nums;
	}

	.lock {
		color: var(--ink-faint);
		display: block;
		line-height: 0;
	}
</style>
