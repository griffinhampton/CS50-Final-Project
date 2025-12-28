import Link from "next/link";
//basic footer
export default function Footer() {
	return (
		<footer className="mt-12 border-t border-zinc-200 bg-white px-6 py-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="text-xs">
					This is a student project. Contact: ghampton2005@gmail.com
				</div>
				<nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
					<Link href="/privacy" className="hover:underline">
						Privacy Policy
					</Link>
					<Link href="/terms" className="hover:underline">
						Terms of Service
					</Link>
				</nav>
			</div>
		</footer>
	);
}

