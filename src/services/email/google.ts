import "server-only";

import { EmailProvider } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/actions/encrypt";

type GoogleTokenResponse = {
	access_token: string;
	expires_in?: number;
	token_type?: string;
	scope?: string;
};

function base64UrlEncode(input: Buffer): string {
	return input
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function base64UrlDecodeToString(input: string): string {
	// Gmail uses base64url.
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	const padLen = (4 - (normalized.length % 4)) % 4;
	const padded = normalized + "=".repeat(padLen);
	return Buffer.from(padded, "base64").toString("utf8");
}

type GmailMessageListResponse = {
	messages?: Array<{ id: string; threadId?: string }>;
	nextPageToken?: string;
	resultSizeEstimate?: number;
};

export type GmailMessageHeader = { name: string; value: string };

export type GmailPayloadPart = {
	mimeType?: string;
	headers?: GmailMessageHeader[];
	body?: { size?: number; data?: string; attachmentId?: string };
	filename?: string;
	parts?: GmailPayloadPart[];
};

export type GmailMessage = {
	id: string;
	threadId?: string;
	internalDate?: string;
	labelIds?: string[];
	snippet?: string;
	payload?: GmailPayloadPart;
};

function walkPayloadParts(
	payload: GmailPayloadPart | undefined,
	onPart: (part: GmailPayloadPart) => void,
) {
	if (!payload) return;
	onPart(payload);
	const parts = payload.parts;
	if (!Array.isArray(parts)) return;
	for (const p of parts) {
		walkPayloadParts(p, onPart);
	}
}

export function gmailMessageHasAttachment(message: GmailMessage): boolean {
	let found = false;
	walkPayloadParts(message.payload, (p) => {
		if (found) return;
		const filename = typeof p.filename === "string" ? p.filename : "";
		const attachmentId = typeof p.body?.attachmentId === "string" ? p.body.attachmentId : "";
		if (filename.trim() || attachmentId.trim()) found = true;
	});
	return found;
}

export function gmailExtractTextContent(message: GmailMessage): string {
	// Prefer text/plain parts, fallback to snippet.
	let plain: string | null = null;
	let html: string | null = null;

	walkPayloadParts(message.payload, (p) => {
		const mimeType = typeof p.mimeType === "string" ? p.mimeType : "";
		const data = typeof p.body?.data === "string" ? p.body.data : "";
		if (!data) return;
		if (!plain && mimeType === "text/plain") plain = base64UrlDecodeToString(data);
		if (!html && mimeType === "text/html") html = base64UrlDecodeToString(data);
	});

	const plainText = typeof plain === "string" ? plain : "";
	if (plainText.trim()) return plainText;

	const htmlText = typeof html === "string" ? html : "";
	if (htmlText.trim()) {
		// Minimal HTML → text fallback.
		return htmlText
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
	return (typeof message.snippet === "string" ? message.snippet : "").trim();
}

export async function gmailListMessageIds(options: {
	userId: number;
	query?: string;
	maxResults?: number;
}) {
	const accessToken = await getValidGoogleAccessTokenForUser(options.userId);
	const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
	url.searchParams.set("maxResults", String(Math.min(Math.max(options.maxResults ?? 10, 1), 50)));
	if (options.query) url.searchParams.set("q", options.query);

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(`Gmail list messages failed: ${detail || res.status}`);
	}
	const json = (await res.json()) as GmailMessageListResponse;
	return (json.messages ?? []).map((m) => m.id).filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function gmailListMessageIdsAll(options: {
	userId: number;
	query?: string;
	limit?: number;
}) {
	const accessToken = await getValidGoogleAccessTokenForUser(options.userId);
	const limit = Math.min(Math.max(options.limit ?? 500, 1), 500);

	const ids: string[] = [];
	let pageToken: string | undefined;

	while (ids.length < limit) {
		const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
		url.searchParams.set("maxResults", String(Math.min(50, limit - ids.length)));
		if (options.query) url.searchParams.set("q", options.query);
		if (pageToken) url.searchParams.set("pageToken", pageToken);

		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
			cache: "no-store",
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			throw new Error(`Gmail list messages failed: ${detail || res.status}`);
		}

		const json = (await res.json()) as GmailMessageListResponse;
		const batch = (json.messages ?? [])
			.map((m) => m.id)
			.filter((id): id is string => typeof id === "string" && id.length > 0);
		ids.push(...batch);

		pageToken = typeof json.nextPageToken === "string" ? json.nextPageToken : undefined;
		if (!pageToken) break;
	}

	return ids;
}

export async function gmailGetMessage(options: {
	userId: number;
	messageId: string;
	format?: "full" | "metadata";
}) {
	const accessToken = await getValidGoogleAccessTokenForUser(options.userId);
	const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(options.messageId)}`);
	url.searchParams.set("format", options.format ?? "full");

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(`Gmail get message failed: ${detail || res.status}`);
	}
	return res.json() as Promise<GmailMessage>;
}

export async function getConnectedGoogleAccountForUser(userId: number) {
	return prisma.connectedEmailAccount.findFirst({
		where: { userId, provider: EmailProvider.GOOGLE },
		orderBy: { updatedAt: "desc" },
	});
}

export async function getValidGoogleAccessTokenForUser(userId: number): Promise<string> {
	const account = await getConnectedGoogleAccountForUser(userId);
	if (!account) throw new Error("No connected Google account found");

	const now = Date.now();
	const expiresAtMs = account.expiresAt ? account.expiresAt.getTime() : null;
	const notExpiringSoon = expiresAtMs ? expiresAtMs - now > 60_000 : false;

	if (account.accessTokenEnc && notExpiringSoon) {
		return decryptString(account.accessTokenEnc);
	}

	if (!account.refreshTokenEnc) {
		throw new Error("Missing refresh token. Reconnect Gmail with consent to grant offline access.");
	}

	const refreshToken = decryptString(account.refreshTokenEnc);
	const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.GMAIL_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw new Error("Missing Google OAuth client env vars");

	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
		cache: "no-store",
	});

	if (!tokenRes.ok) {
		const detail = await tokenRes.text().catch(() => "");
		throw new Error(`Google token refresh failed: ${detail || tokenRes.status}`);
	}

	const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
	if (!tokenJson.access_token) throw new Error("Google token refresh missing access_token");

	const newExpiresAt =
		typeof tokenJson.expires_in === "number"
			? new Date(Date.now() + tokenJson.expires_in * 1000)
			: null;

	await prisma.connectedEmailAccount.update({
		where: { id: account.id },
		data: {
			accessTokenEnc: encryptString(tokenJson.access_token),
			expiresAt: newExpiresAt,
		},
	});

	return tokenJson.access_token;
}

export async function gmailSendTextEmail(options: {
	userId: number;
	to: string;
	subject: string;
	bodyText: string;
}) {
	const accessToken = await getValidGoogleAccessTokenForUser(options.userId);

	const mime =
		`To: ${options.to}\r\n` +
		`Subject: ${options.subject}\r\n` +
		'MIME-Version: 1.0\r\n' +
		'Content-Type: text/plain; charset="UTF-8"\r\n' +
		"\r\n" +
		options.bodyText;

	const raw = base64UrlEncode(Buffer.from(mime, "utf8"));

	const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ raw }),
		cache: "no-store",
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(`Gmail send failed: ${detail || res.status}`);
	}

	return res.json() as Promise<{ id: string; threadId?: string; labelIds?: string[] }>;
}

export async function gmailEnsureLabel(options: {
	userId: number;
	name: string;
}) {
	const accessToken = await getValidGoogleAccessTokenForUser(options.userId);

	const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (!listRes.ok) {
		const detail = await listRes.text().catch(() => "");
		throw new Error(`Gmail labels list failed: ${detail || listRes.status}`);
	}

	const listJson = (await listRes.json()) as { labels?: Array<{ id: string; name: string }> };
	const existing = listJson.labels?.find((l) => l.name === options.name);
	if (existing) return existing;

	const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			name: options.name,
			labelListVisibility: "labelShow",
			messageListVisibility: "show",
		}),
		cache: "no-store",
	});

	if (!createRes.ok) {
		const detail = await createRes.text().catch(() => "");
		throw new Error(`Gmail label create failed: ${detail || createRes.status}`);
	}

	return createRes.json() as Promise<{ id: string; name: string }>;
}
