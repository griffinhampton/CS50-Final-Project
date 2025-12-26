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

type PriorityCategory = "high" | "medium" | "low";

export type PrioritizedEmailEntry = {
	messageId: string;
	threadId?: string;
	fromRaw: string;
	fromEmail: string | null;
	subject: string;
	snippet: string;
	hasAttachment: boolean;
	receivedAt: string | null;
	labels?: string[];
	link: string | null;
	urgency: number; // 1..3
	impact: number; // 1..3
	priorityScore: number; // urgency * impact
	category: PriorityCategory;
	canUnsubscribe: boolean;
	phishing: {
		dangerScore: number; // 0..100
		cueCount: number;
		cueScore: number; // 0..60
		premiseScore: number; // 0..40
		premise: {
			workRelevance: number; // 0..10
			authorityAppearance: number; // 0..10
			urgencyThreat: number; // 0..10
			contextFamiliarity: number; // 0..10
		};
		cues: string[]; // list of cue identifiers
	};
};

export type PrioritySummaryData = {
	type: "prioritySummary";
	version: 1;
	windowStart: string;
	windowEnd: string;
	inboxLink: string;
	counts: { high: number; medium: number; low: number; total: number };
	categories: {
		high: PrioritizedEmailEntry[];
		medium: PrioritizedEmailEntry[];
		low: PrioritizedEmailEntry[];
	};
};

function normalizeText(input: string) {
	return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseEmailAddress(fromRaw: string): string | null {
	// Examples:
	//   "Name" <user@example.com>
	//   user@example.com
	const match = fromRaw.match(/<([^>]+@[^>]+)>/);
	if (match?.[1]) return match[1].trim();
	const bare = fromRaw.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
	return bare?.[1]?.trim() ?? null;
}

function extractUrls(text: string): string[] {
	// Very lightweight URL detector.
	const urls: string[] = [];
	const re = /\bhttps?:\/\/[^\s<>"]+/gi;
	let match: RegExpExecArray | null;
	while ((match = re.exec(text))) {
		urls.push(match[0]);
		if (urls.length >= 25) break;
	}
	return urls;
}

function domainFromEmail(email: string | null): string | null {
	if (!email) return null;
	const at = email.lastIndexOf("@");
	if (at === -1) return null;
	return email.slice(at + 1).toLowerCase();
}

function isFreeEmailDomain(domain: string) {
	return ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com"].includes(domain);
}

function cueScoreFromCueCount(cueCount: number): number {
	// Mapping per user's table (0–60).
	if (cueCount <= 3) return 60;
	if (cueCount <= 7) return 45;
	if (cueCount <= 12) return 30;
	if (cueCount <= 17) return 15;
	return 6;
}

function clampInt(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, Math.round(n)));
}

function computePremiseAlignment(params: {
	subject: string;
	text: string;
	fromEmail: string | null;
	userEmail: string | null;
	username: string;
}) {
	const hay = normalizeText(`${params.subject}\n${params.text}`);
	const fromDomain = domainFromEmail(params.fromEmail);
	const userEmailLower = (params.userEmail ?? "").toLowerCase();
	const usernameLower = (params.username ?? "").toLowerCase();

	// Heuristic scoring 0..10 for each.
	let workRelevance = 0;
	if (["invoice", "meeting", "calendar", "interview", "contract", "ticket", "jira", "github", "pull request", "deployment", "build", "billing"].some((k) => hay.includes(k))) {
		workRelevance = 8;
	} else if (["report", "update", "request", "approval"].some((k) => hay.includes(k))) {
		workRelevance = 5;
	} else {
		workRelevance = 2;
	}

	let authorityAppearance = 0;
	if (["ceo", "cfo", "hr", "it", "admin", "security", "support", "payroll"].some((k) => hay.includes(k))) authorityAppearance = 6;
	if (fromDomain && !isFreeEmailDomain(fromDomain)) authorityAppearance = Math.max(authorityAppearance, 5);
	if (fromDomain && ["microsoft.com", "google.com", "apple.com", "amazon.com"].includes(fromDomain)) authorityAppearance = Math.max(authorityAppearance, 7);

	let urgencyThreat = 0;
	if (["urgent", "immediately", "action required", "suspended", "locked", "verify", "unauthorized", "security alert", "final notice"].some((k) => hay.includes(k))) urgencyThreat = 8;
	else if (["asap", "today", "deadline", "overdue"].some((k) => hay.includes(k))) urgencyThreat = 6;
	else urgencyThreat = 2;

	let contextFamiliarity = 0;
	if (userEmailLower && hay.includes(userEmailLower)) contextFamiliarity = 10;
	else if (usernameLower && usernameLower.length >= 3 && hay.includes(usernameLower)) contextFamiliarity = 7;
	else if (["your account", "your password", "your invoice", "your order", "your subscription"].some((k) => hay.includes(k))) contextFamiliarity = 5;
	else contextFamiliarity = 2;

	return {
		workRelevance: clampInt(workRelevance, 0, 10),
		authorityAppearance: clampInt(authorityAppearance, 0, 10),
		urgencyThreat: clampInt(urgencyThreat, 0, 10),
		contextFamiliarity: clampInt(contextFamiliarity, 0, 10),
	};
}

function computePhishingRisk(params: {
	subject: string;
	text: string;
	fromRaw: string;
	fromEmail: string | null;
	hasAttachment: boolean;
	labels: string[];
	userEmail: string | null;
	username: string;
}) {
	const cues: string[] = [];
	const hay = normalizeText(`${params.subject}\n${params.text}`);

	// Observable phishing cues (each adds 1 distinct cue).
	if (!params.fromEmail) cues.push("missing_sender_email");
	if (params.fromRaw.toLowerCase().includes("no-reply") || params.fromRaw.toLowerCase().includes("noreply")) cues.push("noreply_sender");
	if (["dear customer", "dear user", "hello", "hi there", "valued customer"].some((k) => hay.includes(k))) cues.push("generic_greeting");
	if (["click here", "verify", "confirm", "login", "password", "account suspended", "unusual activity"].some((k) => hay.includes(k))) cues.push("credential_or_account_prompt");
	if (["gift card", "wire", "bank transfer", "crypto", "bitcoin"].some((k) => hay.includes(k))) cues.push("payment_scam_language");
	if (params.hasAttachment) cues.push("has_attachment");
	if (params.labels.includes("SPAM")) cues.push("gmail_marked_spam");
	if (params.subject.trim().endsWith("!") || params.subject.toUpperCase() === params.subject.trim() && params.subject.trim().length >= 8) cues.push("shouty_subject");

	const urls = extractUrls(params.text);
	if (urls.length >= 2) cues.push("multiple_links");
	if (urls.some((u) => u.toLowerCase().startsWith("http://"))) cues.push("non_https_link");
	if (urls.some((u) => /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(u))) cues.push("ip_address_link");
	if (urls.some((u) => /bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly/i.test(u))) cues.push("shortened_link");
	if (urls.some((u) => /@/.test(u.replace(/^https?:\/\//i, "")))) cues.push("at_symbol_in_link");

	// Sender-domain mismatch cue: email claims a brand, but sender domain is not that brand.
	const fromDomain = domainFromEmail(params.fromEmail);
	if (fromDomain) {
		if (hay.includes("paypal") && !fromDomain.includes("paypal")) cues.push("brand_sender_domain_mismatch_paypal");
		if (hay.includes("microsoft") && !fromDomain.includes("microsoft")) cues.push("brand_sender_domain_mismatch_microsoft");
		if (hay.includes("google") && !fromDomain.includes("google")) cues.push("brand_sender_domain_mismatch_google");
		if (hay.includes("apple") && !fromDomain.includes("apple")) cues.push("brand_sender_domain_mismatch_apple");
	}

	// Premise alignment (0..40)
	const premise = computePremiseAlignment({
		subject: params.subject,
		text: params.text,
		fromEmail: params.fromEmail,
		userEmail: params.userEmail,
		username: params.username,
	});
	const premiseScore = clampInt(
		premise.workRelevance + premise.authorityAppearance + premise.urgencyThreat + premise.contextFamiliarity,
		0,
		40,
	);

	const cueCount = Array.from(new Set(cues)).length;
	const cueScore = cueScoreFromCueCount(cueCount);
	const dangerScore = clampInt(cueScore + premiseScore, 0, 100);

	return {
		dangerScore,
		cueCount,
		cueScore,
		premiseScore,
		premise,
		cues: Array.from(new Set(cues)),
	};
}

function gmailWebLink(threadIdOrMessageId: string | undefined) {
	if (!threadIdOrMessageId) return null;
	// Best-effort: Gmail web UI deep link. This assumes primary account slot (u/0).
	return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadIdOrMessageId)}`;
}

function computeUrgency(subject: string, text: string): number {
	const hay = normalizeText(`${subject}\n${text}`);
	const high = ["urgent", "asap", "immediately", "action required", "past due", "overdue", "deadline", "final notice", "today"];
	if (high.some((k) => hay.includes(k))) return 3;
	const med = ["reminder", "tomorrow", "this week", "soon", "follow up", "follow-up", "time sensitive"];
	if (med.some((k) => hay.includes(k))) return 2;
	return 1;
}

function computeImpact(subject: string, text: string, hasAttachment: boolean, labels: string[]): number {
	const hay = normalizeText(`${subject}\n${text}`);
	// Gmail labels can hint importance.
	if (labels.includes("IMPORTANT")) return 3;
	if (labels.includes("CATEGORY_PERSONAL")) return Math.min(3, 2 + (hasAttachment ? 1 : 0));
	const high = [
		"invoice",
		"payment",
		"receipt",
		"account",
		"security",
		"password",
		"verify",
		"verification",
		"suspicious",
		"login",
		"meeting",
		"appointment",
		"interview",
		"offer",
		"legal",
		"contract",
		"billing",
		"refund",
		"delivery",
		"shipment",
	];
	let impact = high.some((k) => hay.includes(k)) ? 3 : 2;
	if (labels.includes("CATEGORY_PROMOTIONS") || labels.includes("CATEGORY_SOCIAL")) impact = 1;
	if (hasAttachment) impact = Math.min(3, impact + 1);
	return Math.max(1, Math.min(3, impact));
}

function isLikelyJunk(subject: string, text: string, fromRaw: string, labels: string[]) {
	const hay = normalizeText(`${subject}\n${text}`);
	const from = normalizeText(fromRaw);
	if (labels.includes("SPAM") || labels.includes("CATEGORY_PROMOTIONS") || labels.includes("CATEGORY_SOCIAL")) return true;
	if (hay.includes("unsubscribe") || hay.includes("newsletter") || hay.includes("% off") || hay.includes("sale") || hay.includes("promo")) {
		return true;
	}
	if (from.includes("no-reply") || from.includes("noreply")) return true;
	return false;
}

function categorizeEmail(urgency: number, impact: number, junk: boolean): PriorityCategory {
	if (junk) return "low";
	if (urgency === 3 && impact === 3) return "high";
	const score = urgency * impact;
	if (score >= 7) return "high";
	if (score >= 4) return "medium";
	return "low";
}

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
	prioritySummary?: PrioritySummaryData;
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
		select: { id: true, createdAt: true, lastLogin: true, previousLogin: true, email: true, username: true },
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
		messageId: string;
		threadId?: string;
		from: string;
		fromEmail: string | null;
		subject: string;
		text: string;
		hasAttachment: boolean;
		receivedAt: Date | null;
		labels: string[];
	}> = [];

	let latestEmailAt: Date | null = null;

	for (const id of ids) {
		const msg = await gmailGetMessage({ userId: user.id, messageId: id, format: "full" });
		const from = headerValue(msg, "From");
		const subject = headerValue(msg, "Subject");
		const text = gmailExtractTextContent(msg);
		const hasAttachment = gmailMessageHasAttachment(msg);
		const receivedAt = msg.internalDate && Number.isFinite(Number(msg.internalDate)) ? new Date(Number(msg.internalDate)) : null;
		const labels = Array.isArray(msg.labelIds) ? msg.labelIds.filter((x): x is string => typeof x === "string") : [];
		const fromEmail = parseEmailAddress(from);

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

		emails.push({
			messageId: msg.id,
			threadId: msg.threadId,
			from,
			fromEmail,
			subject,
			text,
			hasAttachment,
			receivedAt,
			labels,
		});
		if (receivedAt && (!latestEmailAt || receivedAt > latestEmailAt)) latestEmailAt = receivedAt;
	}

	const truncated = ids.length >= limit;

	let summaryText = "";
	let prioritySummary: PrioritySummaryData | undefined;
	const mode = (process.env.EMAIL_SUMMARY_MODE || "").toLowerCase();
	const shouldUseAI = mode === "ai" || (mode === "" && Boolean(process.env.CLIENT_AI_API_KEY));

	// Build priority dashboard data (deterministic; aligns with urgency×impact formulas).
	const high: PrioritizedEmailEntry[] = [];
	type Bucket = PrioritizedEmailEntry[];
	const medium: Bucket = [];
	const low: Bucket = [];
	const inboxLink = "https://mail.google.com/mail/u/0/#inbox";

	for (const e of emails) {
		const urgency = computeUrgency(e.subject, e.text);
		const impact = computeImpact(e.subject, e.text, e.hasAttachment, e.labels);
		const junk = isLikelyJunk(e.subject, e.text, e.from, e.labels);
		const category = categorizeEmail(urgency, impact, junk);
		const phishing = computePhishingRisk({
			subject: e.subject || "(no subject)",
			text: e.text,
			fromRaw: e.from,
			fromEmail: e.fromEmail,
			hasAttachment: e.hasAttachment,
			labels: e.labels,
			userEmail: user.email,
			username: user.username,
		});
		const entry: PrioritizedEmailEntry = {
			messageId: e.messageId,
			threadId: e.threadId,
			fromRaw: e.from,
			fromEmail: e.fromEmail,
			subject: e.subject || "(no subject)",
			snippet: e.text.replace(/\s+/g, " ").trim().slice(0, 220),
			hasAttachment: e.hasAttachment,
			receivedAt: e.receivedAt ? e.receivedAt.toISOString() : null,
			labels: e.labels,
			link: gmailWebLink(e.threadId || e.messageId),
			urgency,
			impact,
			priorityScore: urgency * impact,
			category,
			canUnsubscribe: junk,
			phishing,
		};

		if (category === "high") high.push(entry);
		else if (category === "medium") medium.push(entry);
		else low.push(entry);
	}

	// Sort most recent first within each bucket.
	const byDateDesc = (a: PrioritizedEmailEntry, b: PrioritizedEmailEntry) => {
		const ad = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
		const bd = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
		return bd - ad;
	};
	high.sort(byDateDesc);
	medium.sort(byDateDesc);
	low.sort(byDateDesc);

	prioritySummary = {
		type: "prioritySummary",
		version: 1,
		windowStart: windowStart.toISOString(),
		windowEnd: windowEnd.toISOString(),
		inboxLink,
		counts: { high: high.length, medium: medium.length, low: low.length, total: emails.length },
		categories: { high, medium, low },
	};

	if (emails.length === 0) {
		summaryText = "No new emails.";
	} else {
		// Optional AI: produce a short, single-paragraph overview. The per-email priority breakdown is deterministic.
		if (shouldUseAI) {
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
				summaryText = "";
			}
		}

		if (!summaryText) {
			summaryText = `Priority summary: ${high.length} high, ${medium.length} medium, ${low.length} low.`;
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

	// Persist structured data inside summaryText to avoid schema migrations.
	// The dashboard/API can detect and parse this JSON payload.
	if (prioritySummary) {
		summaryText = JSON.stringify({ ...prioritySummary, overview: summaryText });
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
		prioritySummary,
		truncated,
	};

	return { recordId: record.id, result };
}
