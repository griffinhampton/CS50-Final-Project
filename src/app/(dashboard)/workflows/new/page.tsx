import WorkflowBuilder from "@/components/workflow/WorkflowBuilder";
import { getServerSessionUser } from "@/lib/server-session";

//sends user to workflow builder

export default async function NewWorkflowPage() {
    const user = await getServerSessionUser();
    if (!user) {
        return (
            <div className="space-y-4 p-6">
                <h1 className="text-3xl font-bold">New Workflow</h1>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Please log in.</div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <WorkflowBuilder />
        </div>
    );
}

