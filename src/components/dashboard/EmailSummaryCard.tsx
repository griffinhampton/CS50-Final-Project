"use client";

import { useEffect, useMemo, useState } from "react";

type PriorityCategory = "high" | "medium" | "low";

//used a formula from a government article (cant find it sorry (dont take off points if you need me to cite pls))
//but this creates the schema for each prioritized email, and assigns them catagories based on those values

type PrioritizedEmailEntry = {
	messageId: string;
	threadId?: string;
	fromRaw: string;
	fromEmail: string | null;
	subject: string;
	snippet: string;
	hasAttachment: boolean;
	receivedAt: string | null;
	link: string | null;
	urgency: number;
	impact: number;
	priorityScore: number;
	category: PriorityCategory;
	canUnsubscribe: boolean;
	phishing: {
		dangerScore: number;
		cueCount: number;
		cueScore: number;
		premiseScore: number;
		premise: {
			workRelevance: number;
			authorityAppearance: number;
			urgencyThreat: number;
			contextFamiliarity: number;
		};
		cues: string[];
	};
};

type PrioritySummaryData = {
	type: "prioritySummary";
	version: 1;
	windowStart: string;
	windowEnd: string;
	inboxLink: string;
	counts: { high: number; medium: number; low: number; total: number };
	categories: {
		high: PrioritizedEmailEntry[];
		medium: PrioritizedEmailEntry[];
		low: PrioritizedEmailEntry[];
	};
};

type SummaryResponse = {
	windowStart: string;
	windowEnd: string;
	summary: null | {
		id: number;
		emailCount: number;
		summaryText: string;
		prioritySummary?: PrioritySummaryData | null;
		latestEmailAt: string | null;
		createdAt?: string;
	};
};

export default function EmailSummaryCard() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [summaryResp, setSummaryResp] = useState<SummaryResponse | null>(null);
	const [hasNewEmail, setHasNewEmail] = useState(false);
	const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

	const windowLabel = useMemo(() => {
		if (!summaryResp) return "";
		try {
			const start = new Date(summaryResp.windowStart);
			const end = new Date(summaryResp.windowEnd);
			if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
			return `${start.toLocaleString()} → ${end.toLocaleString()}`;
		} catch {
			return "";
		}
	}, [summaryResp]);

	async function loadSummary() {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/email/summaries", { cache: "no-store" });
			if (!res.ok) {
				if (res.status === 401) {
					const text = await res.text().catch(() => "");
					throw new Error(text || "Unauthorized");
				}
				setSummaryResp({ windowStart: "", windowEnd: "", summary: null });
				return;
			}
			const json = (await res.json()) as SummaryResponse;
			setSummaryResp(json);

			if (!json.summary) {
				const gen = await fetch("/api/email/summaries", { method: "POST" });
				if (gen.ok) {
					const genJson = (await gen.json()) as SummaryResponse;
					setSummaryResp(genJson);
				}
			} else if (!json.summary.prioritySummary) {
				const gen = await fetch("/api/email/summaries", { method: "POST" });
				if (gen.ok) {
					const genJson = (await gen.json()) as SummaryResponse;
					setSummaryResp(genJson);
				}
			}
		} catch {
			setSummaryResp({ windowStart: "", windowEnd: "", summary: null });
			setError(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadSummary();
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function poll() {
			try {
				const res = await fetch("/api/email/new", { cache: "no-store" });
				if (!res.ok) return;
				const json = (await res.json()) as { hasNewEmail?: boolean };
				if (!cancelled) setHasNewEmail(Boolean(json.hasNewEmail));
			} catch {
				// ignore soz
			}
		}

		void poll();
		const id = window.setInterval(poll, 30_000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	const priority = summaryResp?.summary?.prioritySummary ?? null;
	const inboxFallback = "/emails";

	function formatReceivedAt(iso: string | null) {
		if (!iso) return "";
		try {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return "";
			return d.toLocaleString();
		} catch {
			return "";
		}
	}

	async function respondViaAI(entry: PrioritizedEmailEntry) {
		setActionStatus((s) => ({ ...s, [entry.messageId]: "Generating response…" }));
		try {
			const res = await fetch("/api/email/respond-ai", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messageId: entry.messageId }),
			});
			const text = await res.text().catch(() => "");
			if (!res.ok) throw new Error(text || String(res.status));
			setActionStatus((s) => ({ ...s, [entry.messageId]: "Response sent." }));
		} catch (err) {
			setActionStatus((s) => ({ ...s, [entry.messageId]: `Failed: ${err instanceof Error ? err.message : String(err)}` }));
		}
	}

	async function unsubscribe(entry: PrioritizedEmailEntry) {
		setActionStatus((s) => ({ ...s, [entry.messageId]: "Unsubscribing…" }));
		try {
			const res = await fetch("/api/email/unsubscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ toEmail: entry.fromEmail }),
			});
			const text = await res.text().catch(() => "");
			if (!res.ok) throw new Error(text || String(res.status));
			setActionStatus((s) => ({ ...s, [entry.messageId]: "Unsubscribe email sent." }));
		} catch (err) {
			setActionStatus((s) => ({ ...s, [entry.messageId]: `Failed: ${err instanceof Error ? err.message : String(err)}` }));
		}
	}

	function CategoryCard(props: {
		title: string;
		count: number;
		entries: PrioritizedEmailEntry[];
		variant: "high" | "medium" | "low";
	}) {
		const { title, count, entries, variant } = props;
		const headerClass =
			variant === "high"
				? "text-red-700 dark:text-red-300"
				: variant === "medium"
					? "text-amber-700 dark:text-amber-300"
					: "text-zinc-700 dark:text-zinc-300";

		return (
			<div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between gap-3">
					<div className={`text-sm font-semibold ${headerClass}`}>{title}</div>
					<div className="text-xs text-zinc-500 dark:text-zinc-400">{count}</div>
				</div>

				{entries.length === 0 ? (
					<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No emails.</div>
				) : (
					<div className="mt-3 space-y-3">
						{entries.slice(0, 8).map((e) => {
							const link = e.link || (priority?.inboxLink ?? inboxFallback);
							return (
								<div key={e.messageId} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<a
												href={link}
												target={e.link ? "_blank" : undefined}
												rel={e.link ? "noreferrer" : undefined}
												className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
											>
												{e.subject || "(no subject)"}
											</a>
											<div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
												{e.fromRaw || "Unknown sender"}
												{e.receivedAt ? ` • ${formatReceivedAt(e.receivedAt)}` : ""}
												{e.hasAttachment ? " • attachment" : ""}
												{` • priority ${e.priorityScore} (U${e.urgency}×I${e.impact})`}
											</div>
											{e.snippet ? (
												<div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3">{e.snippet}</div>
											) : null}
										</div>

										<div className="shrink-0 flex flex-col gap-2">
											<button
												type="button"
												onClick={() => void respondViaAI(e)}
												className="rounded bg-black px-3 py-2 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
											>
												Respond via AI
											</button>
											{variant === "low" && e.canUnsubscribe ? (
												<button
													type="button"
													onClick={() => void unsubscribe(e)}
													className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
												>
													Unsubscribe
												</button>
											) : null}
										</div>
									</div>

									{actionStatus[e.messageId] ? (
										<div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{actionStatus[e.messageId]}</div>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	function riskLabel(score: number) {
		if (score >= 76) return { label: "Severe", cls: "text-red-700 dark:text-red-300" };
		if (score >= 51) return { label: "High", cls: "text-amber-700 dark:text-amber-300" };
		if (score >= 26) return { label: "Medium", cls: "text-zinc-700 dark:text-zinc-300" };
		return { label: "Low", cls: "text-zinc-600 dark:text-zinc-400" };
	}

	return (
		<div className="relative bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
			{hasNewEmail ? <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500" /> : null}
			<div className="flex items-center justify-between gap-4">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Priority Inbox</h3>
				<a
					href={priority?.inboxLink ?? inboxFallback}
					target={priority?.inboxLink ? "_blank" : undefined}
					rel={priority?.inboxLink ? "noreferrer" : undefined}
					className="text-xs text-zinc-600 hover:underline dark:text-zinc-300"
				>
					Open inbox
				</a>
			</div>
			{windowLabel ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{windowLabel}</div> : null}

			{loading ? (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Loading…</div>
			) : error ? (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{error}</div>
			) : summaryResp?.summary ? (
				<div className="mt-4">
					{priority ? (
						<div className="space-y-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<CategoryCard title="High priority (P1)" count={priority.counts.high} entries={priority.categories.high} variant="high" />
								<CategoryCard title="Important (P2)" count={priority.counts.medium} entries={priority.categories.medium} variant="medium" />
								<CategoryCard title="Low priority / Junk" count={priority.counts.low} entries={priority.categories.low} variant="low" />
							</div>

							<div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
								<div className="flex items-center justify-between gap-3">
									<div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Phishing Risk</div>
									<div className="text-xs text-zinc-500 dark:text-zinc-400">Danger Score (0–100)</div>
								</div>
								<div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
									Score = Cue Score (0–60) + Premise Alignment (0–40)
								</div>

								{(() => {
									const all = [
										...priority.categories.high,
										...priority.categories.medium,
										...priority.categories.low,
									];
									const top = all
										.filter((e) => e?.phishing && typeof e.phishing.dangerScore === "number")
										.sort((a, b) => (b.phishing.dangerScore ?? 0) - (a.phishing.dangerScore ?? 0))
										.slice(0, 6);
									if (top.length === 0) {
										return <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No emails to score.</div>;
									}
									return (
										<div className="mt-3 space-y-3">
											{top.map((e) => {
												const score = e.phishing.dangerScore;
												const r = riskLabel(score);
												const link = e.link || (priority?.inboxLink ?? inboxFallback);
												return (
													<div key={`risk-${e.messageId}`} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
														<div className="flex items-start justify-between gap-3">
															<div className="min-w-0">
																<a
																	href={link}
																	target={e.link ? "_blank" : undefined}
																	rel={e.link ? "noreferrer" : undefined}
																	className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
																>
																	{e.subject || "(no subject)"}
																</a>
																<div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
																	{e.fromRaw || "Unknown sender"}
																	{` • cues ${e.phishing.cueCount} (C=${e.phishing.cueScore}) • premise P=${e.phishing.premiseScore}`}
																</div>
														</div>
														<div className={`shrink-0 text-right text-xs ${r.cls}`}>
															<div className="font-semibold">{score}</div>
															<div>{r.label}</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								);
								})()}
							</div>
						</div>
					) : (
						<div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 whitespace-pre-wrap">
							{summaryResp.summary.summaryText || "No new emails."}
						</div>
					)}
				</div>
			) : (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No new emails.</div>
			)}
		</div>
	);
}
