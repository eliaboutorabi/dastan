import { settings } from '$lib/settings/store.svelte';
import { dirOf, translate, type StringKey } from './index';

/**
 * The chrome's voice.
 *
 * Two directions matter in this app and they are not the same one. The buttons
 * and labels follow `uiLanguage`; a Farsi meaning inside a popup follows
 * `nativeLanguage`; the story itself follows `targetLanguage`. Keeping the
 * three separate here is what lets someone read English in an English
 * interface and still get a word explained in Farsi.
 *
 * These read `settings.current` on every call, so a component that calls them
 * while rendering re-renders when the setting changes.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
	return translate(settings.current.uiLanguage, key, vars);
}

export function uiDir(): 'rtl' | 'ltr' {
	return dirOf(settings.current.uiLanguage);
}

export function nativeDir(): 'rtl' | 'ltr' {
	return dirOf(settings.current.nativeLanguage);
}

export function targetDir(): 'rtl' | 'ltr' {
	return dirOf(settings.current.targetLanguage);
}
