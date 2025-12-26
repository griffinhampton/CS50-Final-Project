"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WorkflowRow = {
	id: number;
	name: string;
	trigger: string;
	isActive: boolean;
	createdAt: string | Date;
	lastRun: string | Date | null;
	runCount: number;
};

type TriggerType = "manual" | "gmailNewEmail" | "unknown";

function parseTriggerType(trigger: string): TriggerType {
	const raw = typeof trigger === "string" ? trigger : "";
	const trimmed = raw.trim();
	if (!trimmed) return "unknown";
	if (trimmed === "manual" || trimmed === "gmailNewEmail") return trimmed;
	if (trimmed.startsWith("{")) {
		try {
			const json = JSON.parse(trimmed) as unknown;
			const t = (json as any)?.type;
			if (t === "manual" || t === "gmailNewEmail") return t;
		} catch {
			// ignore
		}
	}
	return "unknown";
}

export default function ManageWorkflowsClient({
	initialWorkflows,
	maxActive,
}: {
	initialWorkflows: WorkflowRow[];
	maxActive: number;
}) {
	const router = useRouter();
	const [workflows, setWorkflows] = useState<WorkflowRow[]>(initialWorkflows);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const activeCount = useMemo(() => workflows.filter((w) => w.isActive).length, [workflows]);

	async function deleteWorkflow(id: number) {
		setError(null);
		setBusyId(id);
		const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setError(text || `Delete failed (${res.status})`);
			setBusyId(null);
			return;
		}
		setWorkflows((prev) => prev.filter((w) => w.id !== id));
		setBusyId(null);
		router.refresh();
	}

	async function duplicateWorkflow(id: number) {
		setError(null);
		setBusyId(id);
		const res = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setError(text || `Duplicate failed (${res.status})`);
			setBusyId(null);
			return;
		}
		const json = (await res.json()) as { workflow?: WorkflowRow };
		if (json.workflow) {
			setWorkflows((prev) => [json.workflow as WorkflowRow, ...prev]);
		}
		setBusyId(null);
		router.refresh();
	}

	async function toggleActive(id: number, nextActive: boolean) {
		setError(null);
		setBusyId(id);
		const res = await fetch(`/api/workflows/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isActive: nextActive }),
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setError(text || `Update failed (${res.status})`);
			setBusyId(null);
			return;
		}
		setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: nextActive } : w)));
		setBusyId(null);
		router.refresh();
	}

	async function runManualWorkflow(id: number) {
		setError(null);
		setBusyId(id);
		const res = await fetch("/api/workflows/run", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ workflowId: id }),
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setError(text || `Run failed (${res.status})`);
			setBusyId(null);
			return;
		}
		setBusyId(null);
		router.refresh();
	}

	return (
		<div className="space-y-4">
			<div className="text-sm text-zinc-600 dark:text-zinc-300">
				Active workflows: {activeCount}/{maxActive}
			</div>
			{error ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
					{error}
				</div>
			) : null}

			{workflows.length === 0 ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
					No workflows yet.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3">
					{workflows.map((w) => {
						const isBusy = busyId === w.id;
						const canActivate = w.isActive || activeCount < maxActive;
						const triggerType = parseTriggerType(w.trigger);
						const isAutomatic = triggerType !== "manual";
						return (
							<div
								key={w.id}
								className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<div className="truncate text-base font-semibold">{w.name}</div>
										<div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">id {w.id} • runs {w.runCount}</div>
									</div>
									<div className="shrink-0 flex items-center gap-2">
										{isAutomatic ? (
											<div
												className={
													w.isActive
														? "rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white"
														: "rounded bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200"
												}
											>
												Automatic
											</div>
										) : null}
										{triggerType === "manual" ? (
											<button
												type="button"
												disabled={isBusy}
												onClick={() => runManualWorkflow(w.id)}
												className="cursor-pointer rounded bg-black px-3 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200"
											>
												Run now
											</button>
										) : null}
										<button
											type="button"
											disabled={isBusy || (!w.isActive && !canActivate)}
											onClick={() => toggleActive(w.id, !w.isActive)}
											className="cursor-pointer rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
										>
											{w.isActive ? "Deactivate" : "Activate"}
										</button>
									</div>
								</div>

								<div className="mt-3 flex flex-wrap gap-2">
									<Link
										href={`/workflows/${w.id}`}
										className="cursor-pointer rounded bg-black px-3 py-2 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
									>
										Edit
									</Link>
									<button
										type="button"
										disabled={isBusy}
										onClick={() => duplicateWorkflow(w.id)}
										className="cursor-pointer rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
									>
										Duplicate
									</button>
									<button
										type="button"
										disabled={isBusy}
										onClick={() => deleteWorkflow(w.id)}
										className="cursor-pointer rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
									>
										Delete
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
