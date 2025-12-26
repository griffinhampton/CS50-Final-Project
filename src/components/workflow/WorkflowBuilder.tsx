"use client";

import { useRef, useState } from "react";
import WorkflowCanvas from "@/components/workflow/workflowCanvas";
import type { WorkflowGraphDefinition, WorkflowTrigger } from "@/types/workflow";

type SaveResponse = { workflow?: { id: number } };

export default function WorkflowBuilder() {
	const [name, setName] = useState("My Workflow");
	const [triggerType, setTriggerType] = useState<WorkflowTrigger["type"]>("manual");
	const [createdWorkflowId, setCreatedWorkflowId] = useState<number | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	const graphRef = useRef<WorkflowGraphDefinition | null>(null);

	async function saveWorkflow() {
		setStatus("Saving...");
		const res = await fetch("/api/workflows", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				trigger: { type: triggerType },
				actions: graphRef.current ?? { nodes: [], edges: [] },
				isActive: true,
			}),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setStatus(`Save failed: ${text || res.status}`);
			return;
		}

		const json = (await res.json()) as SaveResponse;
		setCreatedWorkflowId(json.workflow?.id ?? null);
		setStatus("Saved.");
	}

	async function testRun() {
		if (!createdWorkflowId) {
			setStatus("Save the workflow first.");
			return;
		}
		setStatus("Running...");
		const res = await fetch("/api/workflows/run", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ workflowId: createdWorkflowId }),
		});
		const text = await res.text().catch(() => "");
		if (!res.ok) {
			setStatus(`Run failed: ${text || res.status}`);
			return;
		}
		setStatus(`Run complete: ${text}`);
	}

	return (
		<div className="relative h-full w-full">
			<div className="absolute inset-0">
				<WorkflowCanvas
					onGraphChange={(graph) => {
						graphRef.current = graph;
					}}
				/>
			</div>

			<div className="absolute left-4 top-4 z-30 w-105 max-w-[calc(100%-2rem)] rounded-lg border border-zinc-200 bg-white/95 p-4 text-sm text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/85 dark:text-zinc-100">
				<div className="text-base font-semibold">Workflow</div>
				<div className="mt-3 space-y-3">
					<label className="block">
						<div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</div>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
							placeholder="My Workflow"
						/>
					</label>

					<label className="block">
						<div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Trigger</div>
						<select
							value={triggerType}
							onChange={(e) => setTriggerType(e.target.value as WorkflowTrigger["type"])}
							className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
						>
							<option value="manual">Manual</option>
							<option value="gmailNewEmail">Gmail: New email</option>
						</select>
					</label>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={saveWorkflow}
							className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
						>
							Save
						</button>
						<button
							type="button"
							onClick={testRun}
							className="w-full rounded border border-zinc-200 bg-white px-4 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
						>
							Test run
						</button>
					</div>

					{createdWorkflowId ? (
						<div className="text-xs text-zinc-600 dark:text-zinc-300">Saved as id {createdWorkflowId}</div>
					) : null}
					{status ? (
						<div className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">{status}</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
