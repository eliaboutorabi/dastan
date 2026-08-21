import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MockChatModel } from './mock';
import { settings, type ProviderId } from '$lib/settings/store.svelte';

export interface ModelOptions {
	/** Higher for authoring, near zero for translation. */
	temperature?: number;
	maxTokens?: number;
}

export class MissingKeyError extends Error {
	constructor() {
		super('missing-api-key');
		this.name = 'MissingKeyError';
	}
}

/**
 * The one place a provider is chosen.
 *
 * Everything above this line — translator, author, interviewer — only ever
 * sees a LangChain `BaseChatModel`, so swapping Anthropic for OpenAI (or for
 * the offline mock) changes nothing else in the app.
 *
 * There is no server in this app, so the call goes straight from the browser
 * to the provider. Both SDKs refuse to do that unless you say so explicitly:
 * Anthropic also wants the `anthropic-dangerous-direct-browser-access` header,
 * which is what makes the API answer a request that carries an `Origin`.
 */
export function createChatModel(options: ModelOptions = {}): BaseChatModel {
	const { provider, apiKey, model } = settings.current;
	const temperature = options.temperature ?? 0;
	const maxTokens = options.maxTokens ?? 1024;

	if (provider === 'mock') return new MockChatModel({});

	const key = apiKey.trim();
	if (!key) throw new MissingKeyError();

	if (provider === 'openai') {
		return new ChatOpenAI({
			apiKey: key,
			model,
			temperature,
			maxTokens,
			configuration: { dangerouslyAllowBrowser: true }
		});
	}

	return new ChatAnthropic({
		apiKey: key,
		model,
		temperature,
		maxTokens,
		clientOptions: {
			dangerouslyAllowBrowser: true,
			defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' }
		}
	});
}

/** Reads a LangChain message back as plain text, whatever shape it arrived in. */
export function messageText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((part) =>
				typeof part === 'string'
					? part
					: part && typeof part === 'object' && 'text' in part
						? String((part as { text: unknown }).text)
						: ''
			)
			.join('');
	}
	return String(content ?? '');
}

/**
 * A one-token round trip that proves the key, the model name and the browser
 * CORS path all work — the "Test the connection" button in Settings.
 */
export async function testConnection(): Promise<string> {
	const model = createChatModel({ maxTokens: 16 });
	const response = await model.invoke([
		['system', 'Reply with exactly one word: PONG'],
		['human', 'PING']
	]);
	return messageText(response.content).trim();
}

export function providerLabelKey(provider: ProviderId) {
	return `settings.provider.${provider}` as const;
}
