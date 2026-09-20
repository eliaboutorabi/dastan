<script lang="ts">
	/**
	 * `HugeiconsIcon`, but one whose `icon` prop actually takes effect.
	 *
	 * The upstream Svelte component builds its paths once, in `onMount`, from
	 * the `icon` it was mounted with — and the `$effect` that keeps it in sync
	 * forwards only size, stroke, colour and class. `icon` is not among them,
	 * so swapping it changes nothing at all. Nothing errors and nothing warns;
	 * the old glyph simply stays.
	 *
	 * That matters here because several of these icons are meant to change
	 * state: play becomes pause, the microphone becomes a stop square, the
	 * keep-this-word button becomes a tick. Every one of those would have been
	 * frozen on its first glyph while the code around it read correctly.
	 *
	 * Keying the block on `icon` remounts the component when — and only when —
	 * the icon changes: free for the static ones, a handful of SVG nodes for
	 * the rest.
	 *
	 * (Same fix as the one in the Arbor project; same upstream cause.)
	 */
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { IconSvgElement } from '@hugeicons/svelte';

	interface Props {
		icon: IconSvgElement;
		size?: number;
		strokeWidth?: number;
		class?: string;
	}

	let { icon, ...rest }: Props = $props();
</script>

{#key icon}
	<HugeiconsIcon {icon} aria-hidden="true" {...rest} />
{/key}
