export type WorkflowCondition =
	| { type: "none" }
	| { type: "emailContains"; value: string }
	| { type: "emailHasAttachment" }
	| { type: "timeBetween"; start: string; end: string; timezoneOffsetMinutes: number };

export type WorkflowTrigger =
	| { type: "manual" }
	| { type: "gmailNewEmail" };

export type WorkflowNodeActionKind = "gmailSend" | "gmailEnsureLabel" | "gmailSummarizeEmails";

export type WorkflowNodeKind = WorkflowNodeActionKind | "start" | "if";

export type IfNodeConfig = {
	condition: WorkflowCondition;
};

export type SummarizeEmailsConfig = {
	maxEmails: number;
	contains?: string;
	hasAttachment?: boolean;
};

export type WorkflowGraphDefinition = {
	nodes: Array<{
		id: string;
		kind: WorkflowNodeKind;
		// Back-compat: older graphs stored a free-text condition.
		condition?: WorkflowCondition | string;
		config: Record<string, unknown>;
	}>;
	edges: Array<{
		id: string;
		source: string;
		target: string;
		sourceHandle?: string;
		targetHandle?: string;
	}>;
};
