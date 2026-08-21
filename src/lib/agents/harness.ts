import { createDeepAgent } from 'deepagents/browser';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createChatModel, messageText } from '$lib/llm/provider';

/**
 * The deepagents harness, running entirely in the browser.
 *
 * There is no server anywhere in this app, so the agents live in the same tab
 * as the reader. deepagents ships a dedicated browser build — the Node-only
 * pieces (real filesystem, sandboxes) are absent from it, and the virtual file
 * system falls back to the in-state backend, which is exactly what we want:
 * the life corpus, the curricula and the plans are state, and state is what we
 * persist to IndexedDB.
 *
 * Milestone 2 hangs the interviewer, the level assessor and the author agent
 * off this, including the human-in-the-loop approval gate before a whole book
 * is generated (`interruptOn`). Milestone 1 uses it for one thing: proving,
 * from the deployed site, that all of this really does run in a browser.
 */

export interface AgentOptions {
	model?: BaseChatModel;
	systemPrompt: string;
	/** Seed files for the agent's virtual file system, path -> contents. */
	files?: Record<string, string>;
	/** Tool names that should pause for the learner's approval. */
	interruptOn?: string[];
}

export function createAgent(options: AgentOptions) {
	return createDeepAgent({
		model: options.model ?? createChatModel({ temperature: 0.4, maxTokens: 4096 }),
		systemPrompt: options.systemPrompt,
		interruptOn: options.interruptOn
			? Object.fromEntries(options.interruptOn.map((tool) => [tool, true]))
			: undefined
	});
}

/** deepagents stores virtual files as line arrays with timestamps. */
function toAgentFiles(files: Record<string, string>) {
	const now = new Date().toISOString();
	return Object.fromEntries(
		Object.entries(files).map(([path, content]) => [
			path,
			{ content: content.split('\n'), created_at: now, modified_at: now }
		])
	);
}

export interface HarnessRunResult {
	text: string;
	/** Paths that existed in the virtual file system when the run finished. */
	files: string[];
}

export async function runAgent(
	options: AgentOptions,
	prompt: string
): Promise<HarnessRunResult> {
	const agent = createAgent(options);
	const result = (await agent.invoke({
		messages: [{ role: 'user', content: prompt }],
		...(options.files ? { files: toAgentFiles(options.files) } : {})
	})) as { messages: { content: unknown }[]; files?: Record<string, unknown> };

	const last = result.messages.at(-1);
	return {
		text: messageText(last?.content).trim(),
		files: Object.keys(result.files ?? {})
	};
}

/**
 * The Settings diagnostic. It asks a real agent to use its virtual file system
 * — write a file, read it back — which exercises the tool loop, the state
 * backend and the provider in one go. If this passes in a browser, the rest of
 * the harness will run there too.
 */
export async function runHarnessSelfTest(): Promise<HarnessRunResult> {
	return runAgent(
		{
			systemPrompt:
				'You are checking that your own tools work. Use write_file to save the single word DASTAN to /diagnostic.txt, then use read_file to read it back, then reply with exactly the word you read and nothing else.'
		},
		'Run the diagnostic.'
	);
}
