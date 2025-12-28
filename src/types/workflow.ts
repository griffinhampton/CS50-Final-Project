
//determines type of workflow/workflows conditions, and exports what to do with them
//used for node building

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
