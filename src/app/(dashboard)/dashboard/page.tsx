import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/server-session";
import EmailSummaryCard from "@/components/dashboard/EmailSummaryCard";

export default async function DashboardPage() {
  const user = await getServerSessionUser();
  const totalWorkflows = user ? await prisma.userWorkflows.count({ where: { userId: user.id } }) : 0;
  const activeEmails = user ? await prisma.connectedEmailAccount.count({ where: { userId: user.id } }) : 0;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Total Workflows</h3>
          <p className="text-3xl font-bold mt-2">{totalWorkflows}</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Active Emails</h3>
          <p className="text-3xl font-bold mt-2">{activeEmails}</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">This Month</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>

		<EmailSummaryCard />
      </div>
    </div>
  );
}