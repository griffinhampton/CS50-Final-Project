import WorkflowCanvas from "@/components/workflow/workflowCanvas";

export default function WorkflowLayout({
	children,
}: {
	children: React.ReactNode;
}) {
    return (
    <div className="relative h-full">
        <div className="absolute inset-0">
            <WorkflowCanvas />
        </div>
        <div className="relative z-10 p-6">
            {children}
        </div>
    </div>
    )
}