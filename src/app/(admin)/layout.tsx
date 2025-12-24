"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [isSidebarVisible, setIsSidebarVisible] = useState(true);
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		workflows: true,
		settings:false,
	});

	const toggleSection = (section: string) => {
		setOpenSections((prev)=> ({...prev, [section]: !prev[section]}));
	};

	const navItems = [
		{href:"/admin", label:"Admin", type:"link"},
		{ 
			label: "Monitoring",
			type: "dropdown",
			key: "Monitoring",
			items: [
				{ href: "/monitoring", label: "Monitoring" },
				{ href: "/monitoring/analytics", label: "Analytics"},
				{ href:"/monitoring/audit-logs", label:"Audit Logs"},
				{ href: "/monitoring/users", label: "Users" },
				{ href: "/monitoring/database", label: "Database"},
			],
		},
		{href:"/admin/settings", label:"Admin Settings", type:"link"},
	];
	
	const getLinkClass = (href: string) => {
		const isActive = pathname === href;
		return `block px-4 py-2 rounded transition-colors ${
	  isActive
		? "bg-black text-white dark:bg-white dark:text-black font-medium"
		: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white"
		}`;
	};
	return (
	<div className="pt-16 min-h-screen bg-zinc-50 dark:bg-black">
		<button
			type="button"
			onClick={() => setIsSidebarVisible(true)}
			className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-r px-2 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white cursor-pointer transition-all duration-200 ease-in-out ${
				isSidebarVisible
					? "opacity-0 -translate-x-2 pointer-events-none"
					: "opacity-100 translate-x-0 pointer-events-auto"
			}`}
			aria-label="Show navigation"
			title="Show navigation"
		>
			<ChevronRight className="w-5 h-5" />
		</button>

	  <div className="flex">
		<div
			className={`relative overflow-hidden transition-[width] duration-200 ease-in-out ${
				isSidebarVisible ? "w-64" : "w-0"
			}`}
		>
			<aside
				className={`w-64 min-h-[calc(100vh-64px)] bg-white dark:bg-black p-4 transition-all duration-200 ease-in-out ${
					isSidebarVisible
						? "border-r border-zinc-200 dark:border-zinc-800 translate-x-0 opacity-100"
						: "-translate-x-full opacity-0"
				}`}
				aria-hidden={!isSidebarVisible}
			>
				<div className="mb-3 flex items-center justify-between px-1">
					<div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
						Navigation
					</div>
					<button
						type="button"
						onClick={() => setIsSidebarVisible(false)}
						className="flex items-center justify-center px-2 py-2 rounded transition-colors text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white cursor-pointer"
						aria-label="Hide navigation"
						title="Hide navigation"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
				</div>

			  <nav className="space-y-1">
			{navItems.map((item, idx) => {
			  if (item.type === "link") {
				return (
				  <Link
					key={item.href}
					href={item.href!}
					className={getLinkClass(item.href!)}
				  >
					{item.label}
				  </Link>
				);
			  }

			  if (item.type === "dropdown") {
				const isOpen = openSections[item.key!];
				const hasActiveChild = item.items?.some(
				  (child) => pathname === child.href
				);

				return (
				  <div key={item.key}>
					<button
					  onClick={() => toggleSection(item.key!)}
					  className={`w-full flex items-center justify-between px-4 py-2 rounded transition-colors ${
						hasActiveChild
						  ? "text-black dark:text-white font-medium"
						  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white"
					  }`}
					>
					  <span>{item.label}</span>
					  {isOpen ? (
						<ChevronDown className="w-4 h-4" />
					  ) : (
						<ChevronRight className="w-4 h-4" />
					  )}
					</button>

					{isOpen && (
					  <div className="ml-4 mt-1 space-y-1">
						{item.items?.map((subItem) => (
						  <Link
							key={subItem.href}
							href={subItem.href}
							className={getLinkClass(subItem.href)}
						  >
							{subItem.label}
						  </Link>
						))}
					  </div>
					)}
				  </div>
				);
			  }

			  return null;
			})}
		  </nav>
			</aside>
		</div>

		<main className="flex-1 p-6">{children}</main>
	  </div>
	</div>
  );
}


