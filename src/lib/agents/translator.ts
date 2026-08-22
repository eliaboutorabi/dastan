import {
	getCachedSense,
	getCachedSentence,
	putCachedSense,
	putCachedSentence,
	senseKey
} from '$lib/db';
import { createChatModel, messageText } from '$lib/llm/provider';
import { languageName } from '$lib/i18n';
import { settings } from '$lib/settings/store.svelte';
import type { WordSense } from '$lib/types';
import {
	sentenceSystemPrompt,
	sentenceUserPrompt,
	wordSenseSystemPrompt,
	wordSenseUserPrompt
} from './prompts/translation';

/**
 * Pulls the JSON object out of a model reply, tolerating a markdown fence or a
 * stray sentence around it. A translation that fails to parse should degrade
 * into a readable message, never into a thrown error in the middle of reading.
 */
function parseJsonObject<T>(raw: string): T | null {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = (fenced ? fenced[1] : raw).trim();
	const start = candidate.indexOf('{');
	const end = candidate.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		return JSON.parse(candidate.slice(start, end + 1)) as T;
	} catch {
		return null;
	}
}

/**
 * What a tapped word means *in this sentence*, in the learner's own language.
 *
 * Cached per (word, sentence, native language) in IndexedDB — the same word in
 * the same sentence is looked up once, ever, and re-reading a story is free.
 */
export async function lookupWord(word: string, sentence: string): Promise<WordSense> {
	const native = settings.current.nativeLanguage;
	const key = senseKey(word, sentence, native);

	const cached = await getCachedSense(key);
	if (cached) {
		return {
			simple: cached.simple ?? '',
			native: cached.meaning,
			partOfSpeech: cached.partOfSpeech,
			note: cached.note
		};
	}

	const model = createChatModel({ temperature: 0, maxTokens: 400 });
	const response = await model.invoke([
		[
			'system',
			wordSenseSystemPrompt({
				nativeLanguageName: languageName(native),
				targetLanguageName: languageName(settings.current.targetLanguage)
			})
		],
		['human', wordSenseUserPrompt(word, sentence)]
	]);

	const raw = messageText(response.content);
	const parsed = parseJsonObject<WordSense>(raw);
	// A reply that parses into neither field still has to show the learner
	// something, so the raw text becomes the native meaning rather than nothing.
	const sense: WordSense =
		parsed?.native || parsed?.simple
			? {
					simple: parsed.simple?.trim() ?? '',
					native: parsed.native?.trim() ?? '',
					partOfSpeech: parsed.partOfSpeech ?? '',
					note: parsed.note?.trim() || undefined
				}
			: { simple: '', native: raw.trim(), partOfSpeech: '' };

	await putCachedSense({
		key,
		word: word.toLowerCase(),
		sentence,
		nativeLanguage: native,
		simple: sense.simple,
		meaning: sense.native,
		partOfSpeech: sense.partOfSpeech,
		note: sense.note,
		createdAt: new Date().toISOString()
	});

	return sense;
}

/** The whole sentence in the learner's language — for when a word is not enough. */
export async function translateSentence(sentence: string): Promise<string> {
	const native = settings.current.nativeLanguage;
	const key = `${native}::${sentence.trim()}`;

	const cached = await getCachedSentence(key);
	if (cached) return cached.translation;

	const model = createChatModel({ temperature: 0, maxTokens: 600 });
	const response = await model.invoke([
		['system', sentenceSystemPrompt(languageName(native))],
		['human', sentenceUserPrompt(sentence)]
	]);

	const translation = messageText(response.content).trim().replace(/^["'«»]|["'«»]$/g, '');

	await putCachedSentence({
		key,
		sentence,
		nativeLanguage: native,
		translation,
		createdAt: new Date().toISOString()
	});

	return translation;
}
