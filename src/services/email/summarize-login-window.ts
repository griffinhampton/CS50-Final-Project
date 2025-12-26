import "server-only";

import { prisma } from "@/lib/prisma";
import {
	gmailExtractTextContent,
	gmailGetMessage,
	gmailListMessageIdsAll,
	gmailMessageHasAttachment,
	type GmailMessage,
} from "@/services/email/google";

import { generateShortEmailSummaryWithAI } from "@/services/email/ai-email-summary";

import type { WorkflowCondition } from "@/types/workflow";

function headerValue(message: GmailMessage, name: string): string {
	const target = name.toLowerCase();
	const headers = message.payload?.headers;
	if (!Array.isArray(headers)) return "";
	for (const h of headers) {
		if (!h || typeof h.name !== "string") continue;
		if (h.name.toLowerCase() === target) return typeof h.value === "string" ? h.value : "";
	}
	return "";
}

function normalizeContains(value: string) {
	return value.trim().toLowerCase();
}

function matchesCondition(options: {
	condition: WorkflowCondition;
	subject: string;
	from: string;
	text: string;
	hasAttachment: boolean;
}) {
	const { condition } = options;
	if (!condition || condition.type === "none") return true;
	if (condition.type === "emailHasAttachment") return options.hasAttachment;
	if (condition.type === "emailContains") {
		const needle = normalizeContains(condition.value ?? "");
		if (!needle) return true;
		const haystack = `${options.subject}\n${options.from}\n${options.text}`.toLowerCase();
		return haystack.includes(needle);
	}
	return true;
}

function buildGmailQuery(params: {
	windowStart: Date;
	windowEnd: Date;
	condition: WorkflowCondition;
}) {
	const after = Math.floor(params.windowStart.getTime() / 1000);
	const before = Math.floor(params.windowEnd.getTime() / 1000);

	const parts: string[] = [`after:${after}`, `before:${before}`];

	if (params.condition?.type === "emailHasAttachment") {
		parts.push("has:attachment");
	}
	if (params.condition?.type === "emailContains") {
		const v = String(params.condition.value ?? "").trim();
		if (v) {
			// Use quoted search for phrases; Gmail search will interpret it reasonably.
			const escaped = v.replace(/"/g, "\\\"");
			parts.push(`"${escaped}"`);
		}
	}

	return parts.join(" ");
}

export type LoginWindowEmailSummaryResult = {
	windowStart: string;
	windowEnd: string;
	emailCount: number;
	latestEmailAt: string | null;
	summaryText: string;
	truncated: boolean;
};

export async function generateLoginWindowEmailSummary(options: {
	userId: number;
	source: string;
	condition?: WorkflowCondition;
	limit?: number;
}) {
	const user = await prisma.user.findUnique({
		where: { id: options.userId },
		select: { id: true, createdAt: true, lastLogin: true, previousLogin: true },
	});
	if (!user) throw new Error("User not found");
	if (!user.lastLogin) throw new Error("Missing current login timestamp");

	const windowEnd = user.lastLogin;
	const windowStart = user.previousLogin ?? user.createdAt;
	const condition: WorkflowCondition = options.condition ?? { type: "none" };

	const query = buildGmailQuery({ windowStart, windowEnd, condition });

	const limit = Math.min(Math.max(options.limit ?? 500, 1), 500);
	const ids = await gmailListMessageIdsAll({ userId: user.id, query, limit });

	// Fetch full messages so we can support attachment checks + extract text.
	const emails: Array<{
		from: string;
		subject: string;
		text: string;
		hasAttachment: boolean;
		receivedAt: Date | null;
	}> = [];

	let latestEmailAt: Date | null = null;

	for (const id of ids) {
		const msg = await gmailGetMessage({ userId: user.id, messageId: id, format: "full" });
		const from = headerValue(msg, "From");
		const subject = headerValue(msg, "Subject");
		const text = gmailExtractTextContent(msg);
		const hasAttachment = gmailMessageHasAttachment(msg);
		const receivedAt = msg.internalDate && Number.isFinite(Number(msg.internalDate)) ? new Date(Number(msg.internalDate)) : null;

		if (
			!matchesCondition({
				condition,
				subject,
				from,
				text,
				hasAttachment,
			})
		) {
			continue;
		}

		emails.push({ from, subject, text, hasAttachment, receivedAt });
		if (receivedAt && (!latestEmailAt || receivedAt > latestEmailAt)) latestEmailAt = receivedAt;
	}

	const truncated = ids.length >= limit;

	let summaryText = "";
	const mode = (process.env.EMAIL_SUMMARY_MODE || "").toLowerCase();
	const shouldUseAI = mode === "ai" || (mode === "" && Boolean(process.env.CLIENT_AI_API_KEY));

	if (emails.length === 0) {
		summaryText = "No new emails.";
	} else if (shouldUseAI) {
		try {
			summaryText = await generateShortEmailSummaryWithAI({
				emails: emails.map((e) => ({
					from: e.from,
					subject: e.subject,
					snippet: e.text,
					hasAttachment: e.hasAttachment,
					receivedAt: e.receivedAt,
				})),
				windowStart,
				windowEnd,
				condition,
			});
		} catch {
			// Fall back to deterministic summary if AI fails.
			summaryText = "";
		}
	}

	if (!summaryText) {
		const senderCounts = new Map<string, number>();
		for (const e of emails) {
			const key = (e.from || "Unknown sender").trim();
			senderCounts.set(key, (senderCounts.get(key) ?? 0) + 1);
		}

		const topSenders = Array.from(senderCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		const lines: string[] = [];
		lines.push(`Email summary (${emails.length} email${emails.length === 1 ? "" : "s"})`);
		lines.push(`Window: ${windowStart.toLocaleString()} → ${windowEnd.toLocaleString()}`);

		if (condition.type !== "none") {
			lines.push(
				`Condition: ${condition.type === "emailContains" ? `contains \"${condition.value}\"` : "has attachment"}`,
			);
		}

		if (topSenders.length) {
			lines.push("Top senders:");
			for (const [sender, count] of topSenders) {
				lines.push(`- ${sender} (${count})`);
			}
		}

		lines.push("");
		lines.push("Highlights:");

		const highlightLimit = 10;
		for (const e of emails.slice(0, highlightLimit)) {
			const snippet = e.text.replace(/\s+/g, " ").trim().slice(0, 200);
			const att = e.hasAttachment ? " (attachment)" : "";
			lines.push(
				`- ${e.subject || "(no subject)"}${att} — ${e.from || "Unknown"}${snippet ? ` — ${snippet}` : ""}`,
			);
		}

		if (ids.length >= limit) {
			lines.push("");
			lines.push(`Note: capped at ${limit} emails for performance.`);
		}

		summaryText = lines.join("\n").trim();
	}

	// Persist
	const record = await prisma.emailSummary.upsert({
		where: {
			userId_windowStart_windowEnd_source: {
				userId: user.id,
				windowStart,
				windowEnd,
				source: options.source,
			},
		},
		create: {
			userId: user.id,
			provider: "GOOGLE",
			source: options.source,
			windowStart,
			windowEnd,
			condition: condition as unknown as object,
			emailCount: emails.length,
			summaryText,
			latestEmailAt,
		},
		update: {
			provider: "GOOGLE",
			condition: condition as unknown as object,
			emailCount: emails.length,
			summaryText,
			latestEmailAt,
		},
	});

	const result: LoginWindowEmailSummaryResult = {
		windowStart: windowStart.toISOString(),
		windowEnd: windowEnd.toISOString(),
		emailCount: record.emailCount,
		latestEmailAt: record.latestEmailAt ? record.latestEmailAt.toISOString() : null,
		summaryText: record.summaryText,
		truncated,
	};

	return { recordId: record.id, result };
}
