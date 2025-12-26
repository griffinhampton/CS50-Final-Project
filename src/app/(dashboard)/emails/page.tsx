import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/server-session";
import { EmailProvider } from "@/generated/prisma";

export default async function EmailsPage({
  searchParams,
}: {
  searchParams?: { connected?: string; error?: string };
}) {
  // This page is where users initiate OAuth; require login so the callback can
  // persist the connection to the correct user.
  const user = await getServerSessionUser();
  if (!user) redirect("/login");

  const connectedAccounts = await prisma.connectedEmailAccount.findMany({
    where: { userId: user.id },
    select: { id: true, provider: true, email: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const providers = new Set(connectedAccounts.map((a) => a.provider));
  const googleConnected = providers.has(EmailProvider.GOOGLE);
  const microsoftConnected = providers.has(EmailProvider.MICROSOFT);
  const yahooConnected = providers.has(EmailProvider.YAHOO);

  const connected = typeof searchParams?.connected === "string" ? searchParams.connected : null;
  const error = typeof searchParams?.error === "string" ? searchParams.error : null;

  return (
	<div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Connect Emails</h1>
    {connected || error ? (
      <div className="text-sm text-zinc-600 dark:text-zinc-300">
        {error
          ? `Connection error (${connected ?? "provider"}): ${error}`
          : `Connected: ${connected}`}
      </div>
    ) : null}
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Connected accounts: {connectedAccounts.length ? connectedAccounts.map((a) => a.provider).join(", ") : "none"}
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          {googleConnected ? (
            <div className="absolute right-4 top-4 rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Connected
            </div>
          ) : null}
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Gmail</p>
		  <form action="/api/connect/gmail" method="get" className="mt-3 pt-3">
		  <button
			  type="submit"
			  className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
		  >
			  Connect
		  </button>
		  </form>
        </div>
        
        <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          {microsoftConnected ? (
            <div className="absolute right-4 top-4 rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Connected
            </div>
          ) : null}
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Outlook</p>
		  <form action="/api/connect/microsoft" method="get" className="mt-3 pt-3">
          <button
            type="submit"
            className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          </form>
        </div>
        
        <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          {yahooConnected ? (
            <div className="absolute right-4 top-4 rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Connected
            </div>
          ) : null}
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Yahoo</p>
		  <form action="/api/connect/yahoo" method="get" className="mt-3 pt-3">
          <button
            type="submit"
            className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          </form>
        </div>
      </div>
    </div>
	);

	// auto phishing link checker
	// seperate known and unknown, show certain email org messages first
	// outlook cleanup feature
	// draft a report every day, based on what the user wants to see
	// identifying important stuff, unknown sender, unsubscribe user from garbage when accepted
	// make suggestions based on which folder it should go into, based on common folders, on opened, etc
	// easy way to make rules, flow chart 
	// easy way to do something to one email and only one email
	// auto reply if timeframe given by person is exceded without them replying

}

