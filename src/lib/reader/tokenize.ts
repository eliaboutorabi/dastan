/**
 * Turning a story into something you can tap and something you can follow
 * along with while it is read aloud.
 *
 * Everything is keyed to a character offset into one plain-text rendering of
 * the story, because that is the only thing `SpeechSynthesisUtterance`'s
 * `boundary` event gives us to work with: it reports `charIndex` into the text
 * it was handed. So the tokens the eye taps and the tokens the voice speaks
 * have to be the same tokens, measured the same way.
 */

export interface Token {
	kind: 'word' | 'other';
	text: string;
	/** Offset into the story's plain text. */
	start: number;
	end: number;
	/** True for a target word the author bolded on first appearance. */
	bold: boolean;
}

export interface Sentence {
	text: string;
	start: number;
	end: number;
	tokens: Token[];
}

export interface Paragraph {
	text: string;
	start: number;
	end: number;
	sentences: Sentence[];
}

export interface ParsedStory {
	/** The story with the ** markers removed — what gets spoken. */
	plain: string;
	paragraphs: Paragraph[];
	wordCount: number;
}

/** Strip the **bold** markers, remembering which stretches were bold. */
function unbold(body: string): { plain: string; boldRanges: [number, number][] } {
	const parts = body.split('**');
	let plain = '';
	const boldRanges: [number, number][] = [];
	parts.forEach((part, index) => {
		// Odd-numbered parts sit between a pair of markers.
		if (index % 2 === 1) boldRanges.push([plain.length, plain.length + part.length]);
		plain += part;
	});
	return { plain, boldRanges };
}

/** A token counts as bold when it starts inside a bolded stretch. */
function isBold(start: number, ranges: [number, number][]): boolean {
	return ranges.some(([from, to]) => start >= from && start < to);
}

// Letters, digits, and the apostrophes and hyphens that live inside words —
// so "don't" and "twenty-one" stay whole rather than splitting into pieces the
// learner cannot look up.
const WORD_RE = /[\p{L}\p{N}]+(?:['’‌-][\p{L}\p{N}]+)*/gu;

function tokenize(text: string, offset: number, boldRanges: [number, number][]): Token[] {
	const tokens: Token[] = [];
	let cursor = 0;
	for (const match of text.matchAll(WORD_RE)) {
		const at = match.index;
		if (at > cursor) {
			tokens.push({
				kind: 'other',
				text: text.slice(cursor, at),
				start: offset + cursor,
				end: offset + at,
				bold: false
			});
		}
		tokens.push({
			kind: 'word',
			text: match[0],
			start: offset + at,
			end: offset + at + match[0].length,
			bold: isBold(offset + at, boldRanges)
		});
		cursor = at + match[0].length;
	}
	if (cursor < text.length) {
		tokens.push({
			kind: 'other',
			text: text.slice(cursor),
			start: offset + cursor,
			end: offset + text.length,
			bold: false
		});
	}
	return tokens;
}

// Split after . ! ? … followed by whitespace, but not after a common
// abbreviation, where the full stop is not the end of anything.
const ABBREVIATIONS = /(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|Inc|Ltd|No)\.$/i;

function splitSentences(text: string, offset: number, boldRanges: [number, number][]): Sentence[] {
	const sentences: Sentence[] = [];
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char !== '.' && char !== '!' && char !== '?' && char !== '…') continue;
		// Swallow a run of closing punctuation: `?"` ends together.
		let end = i + 1;
		while (end < text.length && /["'”’)\]]/.test(text[end])) end++;
		const nextIsBreak = end >= text.length || /\s/.test(text[end]);
		if (!nextIsBreak) continue;
		const candidate = text.slice(start, end);
		if (ABBREVIATIONS.test(candidate.trimEnd())) continue;

		// Keep the trailing space with the sentence so offsets stay contiguous.
		let after = end;
		while (after < text.length && /\s/.test(text[after])) after++;
		const raw = text.slice(start, after);
		sentences.push({
			text: raw.trim(),
			start: offset + start,
			end: offset + end,
			tokens: tokenize(raw, offset + start, boldRanges)
		});
		start = after;
		i = after - 1;
	}
	if (start < text.length) {
		const raw = text.slice(start);
		if (raw.trim()) {
			sentences.push({
				text: raw.trim(),
				start: offset + start,
				end: offset + text.length,
				tokens: tokenize(raw, offset + start, boldRanges)
			});
		}
	}
	return sentences;
}

export function parseStory(body: string): ParsedStory {
	const { plain, boldRanges } = unbold(body.replace(/\r\n/g, '\n'));
	const paragraphs: Paragraph[] = [];

	let cursor = 0;
	for (const chunk of plain.split(/\n{2,}/)) {
		const start = plain.indexOf(chunk, cursor);
		cursor = start + chunk.length;
		if (!chunk.trim()) continue;
		paragraphs.push({
			text: chunk.trim(),
			start,
			end: start + chunk.length,
			sentences: splitSentences(chunk, start, boldRanges)
		});
	}

	const wordCount = (plain.match(WORD_RE) ?? []).length;
	return { plain, paragraphs, wordCount };
}

/** The sentence a given character offset falls inside — used by tap and by TTS. */
export function sentenceAt(story: ParsedStory, offset: number): Sentence | undefined {
	for (const paragraph of story.paragraphs) {
		for (const sentence of paragraph.sentences) {
			if (offset >= sentence.start && offset < sentence.end) return sentence;
		}
	}
	return undefined;
}
