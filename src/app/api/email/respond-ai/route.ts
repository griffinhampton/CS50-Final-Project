import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { openAIChatCompletion } from "@/services/ai/openai";
import { gmailExtractTextContent, gmailGetMessage, gmailSendTextEmail } from "@/services/email/google";

//sanitizeReplyText borrowed from stackoverflow, takes the reply text out of markdown format
//this posts the info from the email to my openAI account, and uses that context to draft and send an email

function sanitizeReplyText(input: string): string {
	if (!input) return input;
	// Normalize newlines
	let t = input.replace(/\r\n/g, "\n");
	// Remove fenced code blocks entirely (they often wrap JSON or examples)
	t = t.replace(/```[\s\S]*?```/g, "");
	// Remove stray backtick fences
	t = t.replace(/`{3,}/g, "");
	// Remove wrapping quotes if the model returned a quoted string
	t = t.replace(/^\s*"([\s\S]*)"\s*$/, "$1").replace(/^\s*'([\s\S]*)'\s*$/, "$1");
	// Trim trailing spaces on each line
	t = t.split("\n").map((l) => l.replace(/[ \t]+$/g, "")).join("\n");
	// Collapse excessive blank lines to a maximum of one blank line
	t = t.replace(/\n{3,}/g, "\n\n");
	// Trim leading/trailing whitespace
	t = t.trim();
	return t;
}

function headerValue(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
	const target = name.toLowerCase();
	if (!Array.isArray(headers)) return "";
	for (const h of headers) {
		if (!h || typeof h.name !== "string") continue;
		if (h.name.toLowerCase() === target) return typeof h.value === "string" ? h.value : "";
	}
	return "";
}

function parseEmailAddress(fromRaw: string): string | null {
	const match = fromRaw.match(/<([^>]+@[^>]+)>/);
	if (match?.[1]) return match[1].trim();
	const bare = fromRaw.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
	return bare?.[1]?.trim() ?? null;
}

type Body = {
	messageId?: string;
	instruction?: string;
};

export async function POST(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	let body: Body;
	try {
		body = (await req.json()) as Body;
	} catch {
		return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
	}

	const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
	if (!messageId) return NextResponse.json({ message: "Missing messageId" }, { status: 400 });

	const apiKey = process.env.CLIENT_AI_API_KEY;
	if (!apiKey) return NextResponse.json({ message: "Missing CLIENT_AI_API_KEY" }, { status: 400 });

	const model = process.env.AI_MODEL || "gpt-4o-mini";
	const baseUrl = process.env.AI_BASE_URL;

	const msg = await gmailGetMessage({ userId: user.id, messageId, format: "full" });
	const headers = msg.payload?.headers ?? [];
	const fromRaw = headerValue(headers, "From");
	const subject = headerValue(headers, "Subject") || "(no subject)";
	const fromEmail = parseEmailAddress(fromRaw);
	if (!fromEmail) return NextResponse.json({ message: "Could not determine sender email" }, { status: 400 });

	const original = gmailExtractTextContent(msg);
	const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";

	const replyBodyRaw = await openAIChatCompletion({
		apiKey,
		baseUrl,
		model,
		maxTokens: 250,
		temperature: 0.3,
		messages: [
			{
				role: "system",
				content:
					"You write concise, helpful, professional email replies. Return ONLY the reply body text, no subject line, no greetings that invent facts, and no signatures unless the user asks.",
			},
			{
				role: "user",
				content:
					`Draft a reply to this email. Keep it short.\n\nFrom: ${fromRaw}\nSubject: ${subject}\n\nEmail content:\n${original}\n\n${instruction ? `Extra instruction: ${instruction}\n\n` : ""}`,
			},
		],
	});

	const replyBody = sanitizeReplyText(replyBodyRaw ?? "");
	if (!replyBody) return NextResponse.json({ message: "AI returned empty reply" }, { status: 500 });

	const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;

	await gmailSendTextEmail({
		userId: user.id,
		to: fromEmail,
		subject: replySubject,
		bodyText: replyBody,
	});

	return NextResponse.json({ ok: true });
}
