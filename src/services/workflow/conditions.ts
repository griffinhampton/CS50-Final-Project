import "server-only";

import type { WorkflowCondition } from "@/types/workflow";

function parseHm(value: string): number | null {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
	if (!m) return null;
	return Number(m[1]) * 60 + Number(m[2]);
}

function localMinutesAtOffset(now: Date, timezoneOffsetMinutes: number): number {
	// timezoneOffsetMinutes matches JS Date.getTimezoneOffset(): minutes to add to local to get UTC.
	// To get the user's local time, shift UTC by -offset.
	const shifted = new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
	return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function conditionMatchesNow(condition: WorkflowCondition, now = new Date()): boolean {
	if (!condition || condition.type === "none") return true;

	if (condition.type === "timeBetween") {
		const start = parseHm(condition.start);
		const end = parseHm(condition.end);
		if (start === null || end === null) return false;

		const tz = Number.isFinite(condition.timezoneOffsetMinutes)
			? condition.timezoneOffsetMinutes
			: now.getTimezoneOffset();

		const mins = localMinutesAtOffset(now, tz);

		// If start==end, interpret as "always false" (0-length window).
		if (start === end) return false;
		if (start < end) return mins >= start && mins < end;
		// wraps midnight
		return mins >= start || mins < end;
	}

	// Email-based conditions are evaluated in email summarizer logic; as a runtime gate, treat them as true.
	return true;
}
