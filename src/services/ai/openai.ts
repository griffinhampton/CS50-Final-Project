import "server-only";

//server side helper that calls open ai chat completion API

export type OpenAIChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export async function openAIChatCompletion(options: {
	apiKey: string;
	baseUrl?: string;
	model: string;
	messages: OpenAIChatMessage[];
	maxTokens?: number;
	temperature?: number;
}) {
	const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
	const url = `${baseUrl}/chat/completions`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${options.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: options.model,
			messages: options.messages,
			max_tokens: options.maxTokens ?? 200,
			temperature: options.temperature ?? 0.2,
		}),
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`AI request failed (${res.status}): ${text || res.statusText}`);
	}

	const json = (await res.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
	};

	const content = json.choices?.[0]?.message?.content;
	return typeof content === "string" ? content.trim() : "";
}
