import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

//prevents users from having more than 10 workflows, this is to lower load on my dbs/server
//also makes sure workflows have all the required fields before saving them, my last check before
//saving workflows in my db

type Params = { id: string };

type PatchBody = {
	name?: string;
	trigger?: unknown;
	actions?: unknown;
	isActive?: boolean;
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> | Params }) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const params = (await (ctx.params as any)) as Params;
	const id = Number(params.id);
	if (!Number.isFinite(id)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

	let body: PatchBody;
	try {
		body = (await req.json()) as PatchBody;
	} catch {
		return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
	}

	const workflow = await prisma.userWorkflows.findFirst({ where: { id, userId: user.id } });
	if (!workflow) return NextResponse.json({ message: "Not found" }, { status: 404 });

	const data: Record<string, unknown> = {};
	if (typeof body.name === "string") {
		const name = body.name.trim();
		if (!name) return NextResponse.json({ message: "Missing name" }, { status: 400 });
		data.name = name;
	}
	if (typeof body.isActive === "boolean") {
		if (body.isActive && !workflow.isActive) {
			const activeCount = await prisma.userWorkflows.count({
				where: { userId: user.id, isActive: true, NOT: { id } },
			});
			if (activeCount >= 10) {
				return NextResponse.json({ message: "Active workflow limit reached (max 10)" }, { status: 400 });
			}
		}
		data.isActive = body.isActive;
	}
	if (body.trigger !== undefined) data.trigger = JSON.stringify(body.trigger);
	if (body.actions !== undefined) data.actions = JSON.stringify(body.actions);

	const updated = await prisma.userWorkflows.update({
		where: { id },
		data,
		select: { id: true, name: true, isActive: true, createdAt: true },
	});

	return NextResponse.json({ workflow: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> | Params }) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const params = (await (ctx.params as any)) as Params;
	const id = Number(params.id);
	if (!Number.isFinite(id)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

	const workflow = await prisma.userWorkflows.findFirst({ where: { id, userId: user.id } });
	if (!workflow) return NextResponse.json({ message: "Not found" }, { status: 404 });

	await prisma.userWorkflows.delete({ where: { id } });
	return NextResponse.json({ ok: true });
}
