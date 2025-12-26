import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/server-session";

export default async function WorkflowsPage() {
	const user = await getServerSessionUser();
	if (!user) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-3xl font-bold">Workflows</h1>
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
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Workflows</h1>
				<Link
					href="/workflows/new"
					className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
				>
					New workflow
				</Link>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
					<h3 className="text-sm text-zinc-600 dark:text-zinc-400">Total Workflows</h3>
					<p className="text-3xl font-bold mt-2">{workflows.length}</p>
					<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Limit: 10</p>
				</div>
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
					<h3 className="text-sm text-zinc-600 dark:text-zinc-400">Active Workflows</h3>
					<p className="text-3xl font-bold mt-2">{workflows.filter((w) => w.isActive).length}</p>
				</div>
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
					<h3 className="text-sm text-zinc-600 dark:text-zinc-400">Total Runs</h3>
					<p className="text-3xl font-bold mt-2">{workflows.reduce((acc, w) => acc + (w.runCount ?? 0), 0)}</p>
				</div>
			</div>

			<div className="space-y-3">
				<div className="text-sm text-zinc-600 dark:text-zinc-300">Your workflows</div>
				{workflows.length === 0 ? (
					<div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
						No workflows yet.
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3">
						{workflows.map((w) => (
							<div
								key={w.id}
								className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
							>
								<div className="flex items-center justify-between gap-4">
									<div className="min-w-0">
										<div className="truncate text-base font-semibold">{w.name}</div>
										<div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
											id {w.id} • runs {w.runCount}
											{w.lastRun ? ` • last run ${w.lastRun.toLocaleString()}` : ""}
										</div>
									</div>
									<div className="shrink-0 text-xs">
										<span
											className={
												w.isActive
													? "rounded bg-zinc-900 px-2 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900"
													: "rounded border border-zinc-200 px-2 py-1 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
										}
										>
											{w.isActive ? "Active" : "Inactive"}
										</span>
									</div>
							</div>
						</div>
					))}
					</div>
				)}
			</div>
		</div>
	);
}

