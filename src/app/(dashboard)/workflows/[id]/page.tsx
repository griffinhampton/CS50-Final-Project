import WorkflowBuilder from "@/components/workflow/WorkflowBuilder";
import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/server-session";
import type { WorkflowGraphDefinition, WorkflowTrigger } from "@/types/workflow";

//my error testing file, mostly created using claude

function safeJsonParse(input: string): unknown {
	try {
		return JSON.parse(input) as unknown;
	} catch {
		return null;
	}
}

function coerceTrigger(raw: unknown): WorkflowTrigger {
	if (raw && typeof raw === "object" && "type" in raw) {
		const type = (raw as { type?: unknown }).type;
		if (type === "manual" || type === "gmailNewEmail") return { type };
	}
	if (typeof raw === "string") {
		const type = raw.trim();
		if (type === "manual" || type === "gmailNewEmail") return { type };
	}
	return { type: "manual" };
}

function coerceGraph(raw: unknown): WorkflowGraphDefinition {
	if (raw && typeof raw === "object") {
		const nodes = (raw as { nodes?: unknown }).nodes;
		const edges = (raw as { edges?: unknown }).edges;
		if (Array.isArray(nodes) && Array.isArray(edges)) {
			return raw as WorkflowGraphDefinition;
		}
	}
	return { nodes: [], edges: [] };
}

export default async function WorkflowDetailPage({ params }: { params: { id: string } }) {
	const user = await getServerSessionUser();
	if (!user) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-3xl font-bold">Workflow</h1>
				<div className="text-sm text-zinc-600 dark:text-zinc-300">Please log in.</div>
			</div>
		);
	}

	const id = Number(params.id);
	if (!Number.isFinite(id)) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-3xl font-bold">Workflow</h1>
				<div className="text-sm text-zinc-600 dark:text-zinc-300">Invalid workflow id.</div>
			</div>
		);
	}

	const workflow = await prisma.userWorkflows.findFirst({
		where: { id, userId: user.id },
		select: { id: true, name: true, trigger: true, actions: true, isActive: true },
	});

	if (!workflow) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-3xl font-bold">Workflow</h1>
				<div className="text-sm text-zinc-600 dark:text-zinc-300">Workflow not found.</div>
			</div>
		);
	}

	const triggerRaw = safeJsonParse(workflow.trigger);
	const actionsRaw = safeJsonParse(workflow.actions);

	return (
		<div className="relative h-full w-full">
			<WorkflowBuilder
				initialWorkflow={{
					id: workflow.id,
					name: workflow.name,
					isActive: workflow.isActive,
					trigger: coerceTrigger(triggerRaw),
					actions: coerceGraph(actionsRaw),
				}}
			/>
		</div>
	);
}

