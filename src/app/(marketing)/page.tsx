import Link from "next/link";
import SillyShadersClient from "@/components/SillyShadersClient";

export default function MarketingPage() {
	return (
		<main className="min-h-screen bg-black text-zinc-100">
			<header className="border-b border-zinc-800">
				<div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
					<div className="text-lg font-semibold">Griffin Hampton</div>
					<nav className="space-x-4 text-sm text-zinc-400">
						<Link href="/">Home</Link>
						<Link href="/about">About</Link>
						<Link href="/shader">Shader</Link>
						<Link href="/contact">Contact</Link>
					</nav>
				</div>
			</header>

			<section className="py-20">
				<div className="mx-auto max-w-6xl px-6">
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-center">
						<div>
							<h1 className="text-4xl font-bold leading-tight">Hi CS-50, I'm Griffin Hampton.</h1>
							<p className="mt-4 text-zinc-300 max-w-xl">
								This is an interactive email dashboard that I decided to build using primarily Next.js and Tailwind.<br></br><br></br> Don't worry, it's also a B2B SaaS GPT wrapper.
							</p>
							<div className="mt-6 flex gap-4">
								<Link href="/workflows" className="rounded bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
									View Workflows
								</Link>
								<a href="https://www.linkedin.com/in/griffin-hampton-56035235a/" target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
									LinkedIn
								</a>
							</div>
							<p className="mt-8 text-xs text-zinc-500">								Feel free to connect with me on LinkedIn, or use this website.</p>
						</div>

						<div>
							<div className="shader-card rounded-lg overflow-hidden border border-zinc-800 bg-gradient-to-br from-[#071018] to-[#0d1a24] h-[min(60vh,640px)]">
									<div className="w-full h-full">
										<SillyShadersClient />
									</div>
								</div>
						</div>
					</div>
				</div>
			</section>

			<footer>
				{/* Footer component elsewhere will show privacy/terms */}
			</footer>
		</main>
	);
}

