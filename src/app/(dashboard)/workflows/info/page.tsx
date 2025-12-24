export default function WorkflowsInfoPage() {
	return (
        <div className="space-y-6">
            <h1>What is a Workflow?</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Summary</h3>
                    <p className="text-base text-zinc-900 dark:text-zinc-100">
                        Fundamentally, a workflow is something you automate to make your life easier
                        whether it's a email to automate, or a task to delegate, it exists to allow
                        you to do less.
                    </p>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">What is this?</h3>
                    <p className="text-base text-zinc-900 dark:text-zinc-100">
                        This website was made as a CS50 project for me to use to make my life easier.
                        I'm also starting a job where I have to make a full web app from scratch which
                        will have to be able to host 50k+ people, so this is a bit of a warmup I suppose.
                    </p>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">What can this do?</h3>
                    <p className="text-base text-zinc-900 dark:text-zinc-100">
                        This is a website built exclusively to automate your emails, anything else that's 
                        added is just for me. Hehe.. Sorry..
                    </p>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Hire me</h3>
                    <p className="text-base text-zinc-900 dark:text-zinc-100">
                        I am a freelance web developer, if you have a company or a task that needs automation HMU 
                        at <a href="mailto:ghampton2005@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">ghampton2005@gmail.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

