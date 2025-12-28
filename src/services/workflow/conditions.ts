import "server-only";

import type { WorkflowCondition } from "@/types/workflow";

//mainly time conditionals/managers for workflows, but ensures workflows are done in order

function parseHm(value: string): number | null {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
	if (!m) return null;
	return Number(m[1]) * 60 + Number(m[2]);
}

function localMinutesAtOffset(now: Date, timezoneOffsetMinutes: number): number {
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

		if (start === end) return false;
		if (start < end) return mins >= start && mins < end;
		return mins >= start || mins < end;
	}
	return true;
}
