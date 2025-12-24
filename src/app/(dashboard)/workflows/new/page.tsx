import WorkflowCanvas from "@/components/workflow/workflowCanvas";

export default function NewWorkflowPage() {
	return (
		<div className="relative h-full w-full">
			<div className="absolute inset-0">
				<WorkflowCanvas />
			</div>
			<div className="relative z-10 p-6">
				<h1>Create New Workflow</h1>
			</div>
		</div>
	);
}

