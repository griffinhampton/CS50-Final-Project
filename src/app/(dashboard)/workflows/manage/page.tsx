import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/server-session";
import ManageWorkflowsClient from "@/components/workflow/ManageWorkflowsClient";

export default async function ManageWorkflowsPage() {
	const user = await getServerSessionUser();
	if (!user) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-3xl font-bold">Manage Workflows</h1>
				<div className="text-sm text-zinc-600 dark:text-zinc-300">Please log in.</div>
			</div>
		);
	}

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

	return (
		<div className="space-y-6 p-6">
			<h1 className="text-3xl font-bold">Manage Workflows</h1>
			<ManageWorkflowsClient initialWorkflows={workflows} maxActive={10} />
		</div>
	);
}
