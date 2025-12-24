

export default function EmailsPage() {
	return (
	<div className="space-y-6 p-6">
      	<h1 className="text-3xl font-bold">Connect Emails</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Gmail</p>
		  <div className="mt-3 pt-3">
		  <button
            type="submit"
            className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
		  </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Outlook</p>
          <form action="/api/email/connect/microsoft" method="get" className="mt-3 pt-3">
          <button
            type="submit"
            className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          </form>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-45">
          <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Connect to use</h3>
          <p className="text-3xl font-bold mt-2">Yahoo</p>
          <form action="/api/email/connect/yahoo" method="get" className="mt-3 pt-3">
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

