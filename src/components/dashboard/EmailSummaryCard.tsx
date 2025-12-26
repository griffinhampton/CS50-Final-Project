"use client";

import { useEffect, useMemo, useState } from "react";

type SummaryResponse = {
	windowStart: string;
	windowEnd: string;
	summary: null | {
		id: number;
		emailCount: number;
		summaryText: string;
		latestEmailAt: string | null;
		createdAt?: string;
	};
};

export default function EmailSummaryCard() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [summaryResp, setSummaryResp] = useState<SummaryResponse | null>(null);
	const [hasNewEmail, setHasNewEmail] = useState(false);

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
				// If summaries aren't available yet (or Gmail isn't connected), treat it as
				// "no new emails" rather than surfacing an error in the dashboard.
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
			}
		} catch {
			// Same intent: keep the dashboard calm unless auth is broken.
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
				// ignore
			}
		}

		void poll();
		const id = window.setInterval(poll, 30_000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	return (
		<div className="relative bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
			{hasNewEmail ? <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500" /> : null}
			<h3 className="text-sm text-zinc-600 dark:text-zinc-400">Email Summary</h3>
			{windowLabel ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{windowLabel}</div> : null}

			{loading ? (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Loading…</div>
			) : error ? (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{error}</div>
			) : summaryResp?.summary ? (
				<div className="mt-4">
					<div className="text-xs text-zinc-500 dark:text-zinc-400">
						{summaryResp.summary.emailCount} email{summaryResp.summary.emailCount === 1 ? "" : "s"}
					</div>
					<div className="mt-3 space-y-3">
						<div className="flex justify-end">
							<div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-zinc-900 text-white dark:bg-white dark:text-black">
								Summarize my emails since last login.
							</div>
						</div>
						<div className="flex justify-start">
							<div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
								{summaryResp.summary.summaryText}
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No new emails.</div>
			)}
		</div>
	);
}
