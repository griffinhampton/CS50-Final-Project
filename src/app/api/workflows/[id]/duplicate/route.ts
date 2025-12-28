import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Params = { id: string };

//confirms workflow pages (for each unique workflow) actually exist and arent duplicates

export async function POST(req: NextRequest, ctx: { params: Promise<Params> | Params }) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const params = (await (ctx.params as any)) as Params;
	const id = Number(params.id);
	if (!Number.isFinite(id)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

	const workflow = await prisma.userWorkflows.findFirst({ where: { id, userId: user.id } });
	if (!workflow) return NextResponse.json({ message: "Not found" }, { status: 404 });

	const copy = await prisma.userWorkflows.create({
		data: {
			userId: user.id,
			name: `${workflow.name} (copy)`,
			trigger: workflow.trigger,
			actions: workflow.actions,
			isActive: false,
		},
		select: { id: true, name: true, isActive: true, createdAt: true, lastRun: true, runCount: true },
	});

	return NextResponse.json({ workflow: copy }, { status: 201 });
}
