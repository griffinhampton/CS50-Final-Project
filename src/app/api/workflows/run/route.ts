import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { runWorkflow } from "@/services/workflow/run-workflow";

//runs workflows

type RunWorkflowBody = {
	workflowId: number;
};

export async function POST(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	let body: RunWorkflowBody;
	try {
		body = (await req.json()) as RunWorkflowBody;
	} catch {
		return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
	}

	const workflowId = Number(body.workflowId);
	if (!Number.isFinite(workflowId)) {
		return NextResponse.json({ message: "Missing workflowId" }, { status: 400 });
	}

	try {
		const resp = await runWorkflow({ workflowId, userId: user.id, source: "manual" });
		return NextResponse.json(resp);
	} catch (err) {
		return NextResponse.json(
			{ message: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}

	return NextResponse.json({ message: "Unknown error" }, { status: 500 });
	
}

