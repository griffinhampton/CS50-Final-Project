"use client";

import { useMemo, useState } from "react";

type WorkflowAction =
	| { type: "gmailSend"; to: string; subject: string; bodyText: string }
	| { type: "gmailEnsureLabel"; name: string };

export default function NewWorkflowPanel() {
	const [name, setName] = useState("My Workflow");
	const [to, setTo] = useState("");
	const [subject, setSubject] = useState("");
	const [bodyText, setBodyText] = useState("");
	const [labelName, setLabelName] = useState("");
	const [createdWorkflowId, setCreatedWorkflowId] = useState<number | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	const actions = useMemo<WorkflowAction[]>(() => {
		const list: WorkflowAction[] = [];
		if (labelName.trim()) list.push({ type: "gmailEnsureLabel", name: labelName.trim() });
		if (to.trim() && subject.trim()) {
			list.push({ type: "gmailSend", to: to.trim(), subject: subject.trim(), bodyText });
		}
		return list;
	}, [bodyText, labelName, subject, to]);

	async function createWorkflow() {
		setStatus("Saving...");
		const res = await fetch("/api/workflows", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				trigger: { type: "manual" },
				actions,
				isActive: true,
			}),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			setStatus(`Save failed: ${text || res.status}`);
			return;
		}

		const json = (await res.json()) as { workflow?: { id: number } };
		setCreatedWorkflowId(json.workflow?.id ?? null);
		setStatus("Saved.");
	}

	async function runWorkflow() {
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
		<div className="absolute left-4 top-4 z-20 w-105 max-w-full rounded-lg border border-zinc-200 bg-white/95 p-4 text-sm text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/85 dark:text-zinc-100">
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

				<div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Actions</div>
				<label className="block">
					<div className="text-xs text-zinc-600 dark:text-zinc-300">Ensure label exists (optional)</div>
					<input
						value={labelName}
						onChange={(e) => setLabelName(e.target.value)}
						className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
						placeholder="e.g. Important"
					/>
				</label>

				<label className="block">
					<div className="text-xs text-zinc-600 dark:text-zinc-300">Send email</div>
					<input
						value={to}
						onChange={(e) => setTo(e.target.value)}
						className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
						placeholder="to@example.com"
					/>
					<input
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						className="mt-2 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
						placeholder="Subject"
					/>
					<textarea
						value={bodyText}
						onChange={(e) => setBodyText(e.target.value)}
						className="mt-2 min-h-24 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
						placeholder="Body"
					/>
				</label>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={createWorkflow}
						className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
					>
						Save
					</button>
					<button
						type="button"
						onClick={runWorkflow}
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
	);
}
