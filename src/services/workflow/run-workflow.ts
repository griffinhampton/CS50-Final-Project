import "server-only";

import { prisma } from "@/lib/prisma";
import { gmailEnsureLabel, gmailSendTextEmail } from "@/services/email/google";
import { generateLoginWindowEmailSummary } from "@/services/email/summarize-login-window";
import type { WorkflowCondition } from "@/types/workflow";
import { conditionMatchesNow } from "@/services/workflow/conditions";

//loads workflow from prisma and parses actions, skips actions where conditions dont match
//executes gmail actions, and adds to runcount/lastrun

export type WorkflowAction =
	| { type: "gmailSend"; to: string; subject: string; bodyText: string; condition?: WorkflowCondition }
	| { type: "gmailEnsureLabel"; name: string; condition?: WorkflowCondition }
	| { type: "gmailSummarizeEmails"; maxEmails: number; condition?: WorkflowCondition };

type WorkflowGraph = {
	nodes?: Array<{ id: string; kind: string; condition?: unknown; config?: Record<string, unknown> }>;
	edges?: Array<{ id?: string; source: string; target: string }>;
};

function normalizeCondition(input: unknown): WorkflowCondition {
	if (!input) return { type: "none" };
	if (typeof input === "string") {
		const value = input.trim();
		return value ? { type: "emailContains", value } : { type: "none" };
	}
	if (typeof input === "object") {
		const t = (input as { type?: unknown }).type;
		if (t === "emailHasAttachment") return { type: "emailHasAttachment" };
		if (t === "emailContains") {
			const value = String((input as { value?: unknown }).value ?? "").trim();
			return value ? { type: "emailContains", value } : { type: "none" };
		}
		if (t === "timeBetween") {
			const start = String((input as { start?: unknown }).start ?? "").trim();
			const end = String((input as { end?: unknown }).end ?? "").trim();
			const tz = Number((input as { timezoneOffsetMinutes?: unknown }).timezoneOffsetMinutes);
			return {
				type: "timeBetween",
				start: start || "09:00",
				end: end || "17:00",
				timezoneOffsetMinutes: Number.isFinite(tz) ? tz : new Date().getTimezoneOffset(),
			};
		}
		if (t === "none") return { type: "none" };
	}
	return { type: "none" };
}

function deriveActionsFromGraph(graph: WorkflowGraph): WorkflowAction[] {
	const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
	const edges = Array.isArray(graph.edges) ? graph.edges : [];

	const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
	const nextBySource = new Map<string, string>();
	for (const e of edges) {
		if (typeof e.source === "string" && typeof e.target === "string") {
			if (!nextBySource.has(e.source)) nextBySource.set(e.source, e.target);
		}
	}

	const orderedNodeIds: string[] = [];
	let current = nextBySource.get("start");
	const visited = new Set<string>();
	while (current && !visited.has(current)) {
		visited.add(current);
		orderedNodeIds.push(current);
		current = nextBySource.get(current);
	}

	const actions: WorkflowAction[] = [];
	for (const id of orderedNodeIds) {
		const n = nodeById.get(id);
		if (!n) continue;

		if (n.kind === "gmailEnsureLabel") {
			const name = typeof n.config?.name === "string" ? n.config.name : "";
			if (name.trim()) actions.push({ type: "gmailEnsureLabel", name: name.trim(), condition: normalizeCondition(n.condition) });
			continue;
		}

		if (n.kind === "gmailSend") {
			const to = typeof n.config?.to === "string" ? n.config.to : "";
			const subject = typeof n.config?.subject === "string" ? n.config.subject : "";
			const bodyText = typeof n.config?.bodyText === "string" ? n.config.bodyText : "";
			if (to.trim() && subject.trim()) {
				actions.push({ type: "gmailSend", to: to.trim(), subject: subject.trim(), bodyText, condition: normalizeCondition(n.condition) });
			}
			continue;
		}

		if (n.kind === "gmailSummarizeEmails") {
			const maxEmailsRaw = n.config && typeof n.config.maxEmails === "number" ? n.config.maxEmails : 500;
			const maxEmails = Math.min(Math.max(maxEmailsRaw, 1), 500);
			actions.push({ type: "gmailSummarizeEmails", maxEmails, condition: normalizeCondition(n.condition) });
			continue;
		}
	}

	return actions;
}

function parseWorkflowActions(raw: string): WorkflowAction[] {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			// Legacy: saved as action list with no conditions.
			return parsed as WorkflowAction[];
		}
		if (parsed && typeof parsed === "object") {
			return deriveActionsFromGraph(parsed as WorkflowGraph);
		}
		return [];
	} catch {
		return [];
	}
}

export async function runWorkflow(options: {
	workflowId: number;
	userId: number;
	source: "manual" | "trigger";
	markEmailTriggerAt?: Date;
}) {
	const workflow = await prisma.userWorkflows.findFirst({
		where: { id: options.workflowId, userId: options.userId },
	});
	if (!workflow) throw new Error("Workflow not found");

	const actions = parseWorkflowActions(workflow.actions);

	const results: Array<{ action: WorkflowAction; ok: boolean; detail?: unknown }> = [];

	for (const action of actions) {
		try {
			if (action.condition && !conditionMatchesNow(action.condition)) {
				results.push({ action, ok: true, detail: { skipped: true, reason: "condition_not_met" } });
				continue;
			}

			if (action.type === "gmailSend") {
				const resp = await gmailSendTextEmail({
					userId: options.userId,
					to: action.to,
					subject: action.subject,
					bodyText: action.bodyText,
				});
				results.push({ action, ok: true, detail: resp });
				continue;
			}

			if (action.type === "gmailEnsureLabel") {
				const resp = await gmailEnsureLabel({ userId: options.userId, name: action.name });
				results.push({ action, ok: true, detail: resp });
				continue;
			}

			if (action.type === "gmailSummarizeEmails") {
				const resp = await generateLoginWindowEmailSummary({
					userId: options.userId,
					source: `workflow:${workflow.id}`,
					condition: action.condition ?? { type: "none" },
					limit: action.maxEmails,
				});
				results.push({ action, ok: true, detail: resp });
				continue;
			}

			results.push({ action, ok: false, detail: "Unsupported action type" });
		} catch (err) {
			results.push({ action, ok: false, detail: err instanceof Error ? err.message : String(err) });
		}
	}

	await prisma.userWorkflows.update({
		where: { id: workflow.id },
		data: {
			lastRun: new Date(),
			runCount: { increment: 1 },
			...(options.markEmailTriggerAt ? { lastEmailTriggerAt: options.markEmailTriggerAt } : null),
		},
	});

	return { workflowId: workflow.id, source: options.source, results };
}
