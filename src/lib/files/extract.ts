/**
 * Reading a document the learner uploaded — entirely inside the browser.
 *
 * There is no server in this app, so nothing is "uploaded" anywhere: the file
 * is opened in the tab, its text pulled out, and only that text is ever sent
 * on, and then only to the learner's own AI provider when a story is written.
 * That is worth being precise about, because people upload resumes here.
 */

export interface ExtractedDocument {
	text: string;
	wordCount: number;
	pages?: number;
	name: string;
	mime: string;
	size: number;
}

export class UnsupportedFileError extends Error {}
export class FileTooLargeError extends Error {}

/** 20 MB. Past this the browser tab starts to struggle, not the parser. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv'];

export function isSupported(file: File): boolean {
	const name = file.name.toLowerCase();
	return (
		file.type === 'application/pdf' ||
		name.endsWith('.pdf') ||
		name.endsWith('.docx') ||
		file.type.startsWith('text/') ||
		TEXT_EXTENSIONS.some((extension) => name.endsWith(extension))
	);
}

export async function extractDocument(file: File): Promise<ExtractedDocument> {
	if (file.size > MAX_FILE_BYTES) throw new FileTooLargeError(file.name);

	const name = file.name.toLowerCase();
	let text: string;
	let pages: number | undefined;

	if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
		const result = await extractPdf(file);
		text = result.text;
		pages = result.pages;
	} else if (name.endsWith('.docx')) {
		text = await extractDocx(file);
	} else if (file.type.startsWith('text/') || TEXT_EXTENSIONS.some((e) => name.endsWith(e))) {
		text = await file.text();
	} else {
		throw new UnsupportedFileError(file.name);
	}

	const cleaned = tidy(text);
	return {
		text: cleaned,
		wordCount: countWords(cleaned),
		pages,
		name: file.name,
		mime: file.type || 'application/octet-stream',
		size: file.size
	};
}

/**
 * pdf.js is loaded on demand — it is by far the heaviest thing in the bundle,
 * and most sessions never open a PDF at all. Its worker is resolved through
 * `import.meta.url` so the URL stays correct under the Pages sub-path.
 */
async function extractPdf(file: File): Promise<{ text: string; pages: number }> {
	const pdfjs = await import('pdfjs-dist');
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.min.mjs',
		import.meta.url
	).href;

	const data = new Uint8Array(await file.arrayBuffer());
	// The loading task owns the worker; keeping a reference to it is what lets
	// the worker be torn down afterwards rather than leaking per upload.
	const task = pdfjs.getDocument({ data });
	const document = await task.promise;
	const pageCount = document.numPages;

	const pages: string[] = [];
	for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
		const page = await document.getPage(pageNumber);
		const content = await page.getTextContent();
		// Items carry their own end-of-line flag; honouring it is what keeps
		// words from fusing together across a line break.
		let pageText = '';
		for (const item of content.items) {
			if (!('str' in item)) continue;
			pageText += item.str;
			pageText += 'hasEOL' in item && item.hasEOL ? '\n' : ' ';
		}
		pages.push(pageText);
	}
	await task.destroy();

	return { text: pages.join('\n\n'), pages: pageCount };
}

async function extractDocx(file: File): Promise<string> {
	// mammoth ships no types, and its package `browser` field swaps the two
	// Node-only modules for browser equivalents when the bundler resolves it.
	const mammoth = (await import('mammoth')) as unknown as {
		extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
	};
	const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
	return result.value;
}

/**
 * Documents arrive with the debris of their layout — soft hyphens, runs of
 * spaces from a two-column PDF, page numbers stranded on their own line. The
 * author agent reads better prose than that, and so would a person.
 */
function tidy(raw: string): string {
	return raw
		.replace(/\r\n/g, '\n')
		.replace(/­/g, '')
		.replace(/[ \t ]+/g, ' ')
		// A hyphen at a line break is a word split across lines, not a real hyphen.
		.replace(/(\w)-\n(\w)/g, '$1$2')
		// A line that is only a number is a page number.
		.replace(/^\s*\d{1,4}\s*$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.split('\n')
		.map((line) => line.trim())
		.join('\n')
		.trim();
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function countWords(text: string): number {
	return (text.match(WORD_RE) ?? []).length;
}

/**
 * What actually goes into the author prompt. A long document would blow the
 * context window and cost the learner real money, so the middle is dropped
 * rather than the end — the opening and the closing of a document are usually
 * where its shape lives.
 */
export function forPrompt(text: string, maxChars = 24000): string {
	if (text.length <= maxChars) return text;
	const head = Math.floor(maxChars * 0.65);
	const tail = maxChars - head;
	return `${text.slice(0, head)}\n\n[…]\n\n${text.slice(-tail)}`;
}
