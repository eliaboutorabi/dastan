import { en, type StringKey } from './en';
import { fa } from './fa';

export type { StringKey };

/** Every UI language the chrome can speak. */
export const catalogues: Record<string, Record<string, string>> = { en, fa };

/** Languages the learner can pick from in Settings. */
export const languageOptions = [
	{ code: 'fa', label: 'فارسی', english: 'Farsi' },
	{ code: 'en', label: 'English', english: 'English' },
	{ code: 'es', label: 'Español', english: 'Spanish' },
	{ code: 'fr', label: 'Français', english: 'French' },
	{ code: 'de', label: 'Deutsch', english: 'German' },
	{ code: 'ar', label: 'العربية', english: 'Arabic' },
	{ code: 'uk', label: 'Українська', english: 'Ukrainian' },
	{ code: 'ru', label: 'Русский', english: 'Russian' },
	{ code: 'zh', label: '中文', english: 'Chinese' },
	{ code: 'pt', label: 'Português', english: 'Portuguese' }
];

const RTL_LANGUAGES = new Set(['fa', 'ar', 'he', 'ur', 'ps', 'sd', 'ckb', 'yi', 'dv']);

/** Text direction for a BCP-47 tag. */
export function dirOf(language: string): 'rtl' | 'ltr' {
	return RTL_LANGUAGES.has(language.split('-')[0]) ? 'rtl' : 'ltr';
}

export function languageName(code: string): string {
	return languageOptions.find((l) => l.code === code)?.english ?? code;
}

/**
 * Look up a UI string, falling back to English and then to the key itself so a
 * missing translation degrades into something readable rather than blank.
 * `{name}` placeholders are filled from `vars`.
 */
export function translate(
	language: string,
	key: StringKey,
	vars?: Record<string, string | number>
): string {
	const table = catalogues[language.split('-')[0]] ?? en;
	const raw = table[key] ?? (en as Record<string, string>)[key] ?? key;
	if (!vars) return raw;
	return raw.replace(/\{(\w+)\}/g, (match, name) =>
		name in vars ? String(vars[name]) : match
	);
}
