import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLoginWindowEmailSummary } from "@/services/email/summarize-login-window";

const SOURCE_LOGIN_WINDOW_ALL = "loginWindowAll";

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const u = await prisma.user.findUnique({
		where: { id: user.id },
		select: { id: true, createdAt: true, lastLogin: true, previousLogin: true },
	});
	if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });
	if (!u.lastLogin) return NextResponse.json({ message: "Missing current login timestamp" }, { status: 400 });

	const windowStart = u.previousLogin ?? u.createdAt;
	const windowEnd = u.lastLogin;

	const summary = await prisma.emailSummary.findUnique({
		where: {
			userId_windowStart_windowEnd_source: {
				userId: u.id,
				windowStart,
				windowEnd,
				source: SOURCE_LOGIN_WINDOW_ALL,
			},
		},
		select: {
			id: true,
			emailCount: true,
			summaryText: true,
			latestEmailAt: true,
			createdAt: true,
		},
	});

	return NextResponse.json({
		windowStart: windowStart.toISOString(),
		windowEnd: windowEnd.toISOString(),
		summary: summary
			? {
				id: summary.id,
				emailCount: summary.emailCount,
				summaryText: summary.summaryText,
				latestEmailAt: summary.latestEmailAt ? summary.latestEmailAt.toISOString() : null,
				createdAt: summary.createdAt.toISOString(),
			}
			: null,
	});
}

export async function POST(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	// Idempotent: if already exists for this login window, just return it.
	const u = await prisma.user.findUnique({
		where: { id: user.id },
		select: { id: true, createdAt: true, lastLogin: true, previousLogin: true },
	});
	if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });
	if (!u.lastLogin) return NextResponse.json({ message: "Missing current login timestamp" }, { status: 400 });

	const windowStart = u.previousLogin ?? u.createdAt;
	const windowEnd = u.lastLogin;

	const existing = await prisma.emailSummary.findUnique({
		where: {
			userId_windowStart_windowEnd_source: {
				userId: u.id,
				windowStart,
				windowEnd,
				source: SOURCE_LOGIN_WINDOW_ALL,
			},
		},
		select: { id: true, emailCount: true, summaryText: true, latestEmailAt: true, createdAt: true },
	});

	if (existing) {
		return NextResponse.json({
			windowStart: windowStart.toISOString(),
			windowEnd: windowEnd.toISOString(),
			summary: {
				id: existing.id,
				emailCount: existing.emailCount,
				summaryText: existing.summaryText,
				latestEmailAt: existing.latestEmailAt ? existing.latestEmailAt.toISOString() : null,
				createdAt: existing.createdAt.toISOString(),
			},
		});
	}

	try {
		const { recordId, result } = await generateLoginWindowEmailSummary({
			userId: u.id,
			source: SOURCE_LOGIN_WINDOW_ALL,
			condition: { type: "none" },
			limit: 500,
		});

		return NextResponse.json({
			windowStart: result.windowStart,
			windowEnd: result.windowEnd,
			summary: {
				id: recordId,
				emailCount: result.emailCount,
				summaryText: result.summaryText,
				latestEmailAt: result.latestEmailAt,
			},
		});
	} catch (err) {
		return NextResponse.json(
			{ message: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}
