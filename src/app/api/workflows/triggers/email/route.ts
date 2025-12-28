import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { gmailListMessageIds } from "@/services/email/google";
import { runWorkflow } from "@/services/workflow/run-workflow";

//uses time function to automate workflows (uses a scheduler (vercel cron))
//protected with an env variable i have in vercel

function isAuthorized(req: NextRequest): boolean {
	const secret = process.env.WORKFLOW_TRIGGER_SECRET;
	if (!secret) return false;

	const auth = req.headers.get("authorization") ?? "";
	if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length) === secret;

	const url = new URL(req.url);
	const token = url.searchParams.get("token");
	return token === secret;
}

type WorkflowTrigger = { type?: unknown };

function parseTrigger(raw: string): WorkflowTrigger {
	try {
		const v = JSON.parse(raw) as unknown;
		return (v && typeof v === "object") ? (v as WorkflowTrigger) : {};
	} catch {
		return {};
	}
}

export async function POST(req: NextRequest) {
	if (!isAuthorized(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	// Active workflows only.
	const workflows = await prisma.userWorkflows.findMany({
		where: { isActive: true },
		select: {
			id: true,
			userId: true,
			trigger: true,
			actions: true,
			createdAt: true,
			lastEmailTriggerAt: true,
			runCount: true,
		},
	});

	let checked = 0;
	let triggered = 0;
	const triggeredWorkflowIds: number[] = [];

	for (const wf of workflows) {
		const trigger = parseTrigger(wf.trigger);
		if (trigger.type !== "gmailNewEmail") continue;
		checked++;

		const user = await prisma.user.findUnique({
			where: { id: wf.userId },
			select: { id: true, lastLogin: true },
		});
		if (!user) continue;

		const afterDate = wf.lastEmailTriggerAt ?? user.lastLogin ?? wf.createdAt;
		const after = Math.floor(afterDate.getTime() / 1000);

		let hasNew = false;
		try {
			const ids = await gmailListMessageIds({ userId: user.id, query: `after:${after}`, maxResults: 1 });
			hasNew = ids.length > 0;
		} catch {
			hasNew = false;
		}

		if (!hasNew) continue;

		const now = new Date();
		try {
			await runWorkflow({
				workflowId: wf.id,
				userId: user.id,
				source: "trigger",
				markEmailTriggerAt: now,
			});
		} catch {
			continue;
		}

		triggered++;
		triggeredWorkflowIds.push(wf.id);
	}

	return NextResponse.json({ ok: true, checked, triggered, triggeredWorkflowIds });
}

//testing function
export async function GET(req: NextRequest) {
	return POST(req);
}
