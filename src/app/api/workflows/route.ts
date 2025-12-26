import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type CreateWorkflowBody = {
	name: string;
	trigger?: unknown;
	actions?: unknown;
	isActive?: boolean;
};

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const workflows = await prisma.userWorkflows.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			isActive: true,
			createdAt: true,
			lastRun: true,
			runCount: true,
		},
	});

	return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	let body: CreateWorkflowBody;
	try {
		body = (await req.json()) as CreateWorkflowBody;
	} catch {
		return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
	}

	const name = String(body.name ?? "").trim();
	if (!name) return NextResponse.json({ message: "Missing name" }, { status: 400 });

	const trigger = body.trigger ?? { type: "manual" };
	const actions = body.actions ?? [];
	const isActive = Boolean(body.isActive);

	if (isActive) {
		const activeCount = await prisma.userWorkflows.count({ where: { userId: user.id, isActive: true } });
		if (activeCount >= 10) {
			return NextResponse.json(
				{ message: "Active workflow limit reached (max 10)" },
				{ status: 400 },
			);
		}
	}

	const workflow = await prisma.userWorkflows.create({
		data: {
			userId: user.id,
			name,
			trigger: JSON.stringify(trigger),
			actions: JSON.stringify(actions),
			isActive,
		},
		select: { id: true, name: true, isActive: true, createdAt: true },
	});

	return NextResponse.json({ workflow }, { status: 201 });
}
