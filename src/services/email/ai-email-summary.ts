import "server-only";

import type { WorkflowCondition } from "@/types/workflow";
import { openAIChatCompletion } from "@/services/ai/openai";

export type EmailForAISummary = {
	from: string;
	subject: string;
	snippet: string;
	hasAttachment: boolean;
	receivedAt: Date | null;
};

function safeLine(input: string) {
	return input.replace(/\s+/g, " ").trim();
}

function conditionText(condition: WorkflowCondition): string {
	if (!condition || condition.type === "none") return "none";
	if (condition.type === "emailHasAttachment") return "has attachment";
	if (condition.type === "emailContains") return `contains: ${String(condition.value ?? "").trim()}`;
	if (condition.type === "timeBetween") return `time between ${condition.start} and ${condition.end}`;
	return "none";
}

export async function generateShortEmailSummaryWithAI(options: {
	emails: EmailForAISummary[];
	windowStart: Date;
	windowEnd: Date;
	condition: WorkflowCondition;
}) {
	const apiKey = process.env.CLIENT_AI_API_KEY;
	if (!apiKey) throw new Error("Missing CLIENT_AI_API_KEY");

	const model = process.env.AI_MODEL || "gpt-4o-mini";
	const baseUrl = process.env.AI_BASE_URL;

	// Keep payload small + predictable.
	const maxEmailsForPrompt = Math.min(Math.max(Number(process.env.AI_MAX_EMAILS ?? "25"), 1), 50);
	const maxSnippetChars = Math.min(Math.max(Number(process.env.AI_MAX_SNIPPET_CHARS ?? "400"), 50), 1500);

	const selected = options.emails.slice(0, maxEmailsForPrompt);
	const lines: string[] = [];
	lines.push(`Window: ${options.windowStart.toISOString()} → ${options.windowEnd.toISOString()}`);
	lines.push(`Condition: ${conditionText(options.condition)}`);
	lines.push(`Email count: ${options.emails.length}`);
	lines.push("");

	for (const e of selected) {
		const receivedAt = e.receivedAt ? e.receivedAt.toISOString() : "unknown";
		const att = e.hasAttachment ? "yes" : "no";
		lines.push(`- From: ${safeLine(e.from || "Unknown")}`);
		lines.push(`  Subject: ${safeLine(e.subject || "(no subject)")}`);
		lines.push(`  ReceivedAt: ${receivedAt}`);
		lines.push(`  Attachment: ${att}`);
		const snippet = safeLine(e.snippet).slice(0, maxSnippetChars);
		if (snippet) lines.push(`  Snippet: ${snippet}`);
		lines.push("");
	}

	const prompt = lines.join("\n").trim();

	return openAIChatCompletion({
		apiKey,
		baseUrl,
		model,
		maxTokens: 220,
		temperature: 0.2,
		messages: [
			{
				role: "system",
				content:
					"You are an assistant that summarizes a batch of emails. Return a SHORT summary (max 6 bullet points). Focus on what's important and actionable. Do not invent facts. Do not include sensitive personal data beyond what is already provided.",
			},
			{
				role: "user",
				content: `Summarize these emails:\n\n${prompt}`,
			},
		],
	});
}
