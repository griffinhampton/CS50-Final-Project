"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function DashboardLayout({
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

	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const currentTheme = mounted ? (resolvedTheme ?? theme) : undefined;
	const isDark = currentTheme === "dark";

	const toggleTheme = () => {
		if (!mounted) return;
		const next = (resolvedTheme ?? theme) === "dark" ? "light" : "dark";
		setTheme(next);
	};

	const toggleSection = (section: string) => {
		setOpenSections((prev)=> ({...prev, [section]: !prev[section]}));
	};

	const navItems = [
		{href:"/dashboard", label:"Dashboard", type:"link"},
		{ 
			label: "Workflows",
			type: "dropdown",
			key: "workflows",
			items: [
				{ href: "/workflows", label: "Workflow Dashboard" },
				{ href: "/workflows/new", label: "New Workflow"},
				{href:"/workflows/info ", label: "What is a Workflow?"}
			],
		},
		{href:"/analytics", label:"Analytics", type:"link"},
		{
			label:"Emails",
			type:"dropdown",
			key:"emails",
			items: [
				{href:"/emails", label:"Email Dashboard"},
				{href:"/emails/compose",label:"Compose New Email"},
				{href:"emails/templates",label:"Reuse Email Template"},
			],
		},
		{
			label:"Settings",
			type:"dropdown",
			key:"settings",
			items: [
				{href:"/settings", label:"Settings Dashboard"},
				{href:"/settings/api-keys", label:"API Keys"},
				{href:"/settings/billings", label:"Billing"},
				{href:"/settings/profile", label:"Profile Settings"},
				{href:"/settings/workflows", label:"Workflow Settings"},
			],
		},
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
    <div className="pt-16 h-screen bg-zinc-50 dark:bg-black overflow-hidden">
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

      <div className="flex h-full">
			<div
				className={`relative h-full overflow-hidden transition-[width] duration-200 ease-in-out ${
					isSidebarVisible ? "w-64" : "w-0"
				}`}
			>
				<aside
					className={`w-64 h-full overflow-y-auto bg-white dark:bg-black p-4 transition-all duration-200 ease-in-out ${
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
                      className={`cursor-pointer w-full flex items-center justify-between px-4 py-2 rounded transition-colors ${
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

		  <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
			<button
			  type="button"
			  disabled={!mounted}
			  onClick={toggleTheme}
			  className="w-full flex items-center justify-between px-4 py-2 rounded transition-colors text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
			  aria-label="Toggle theme"
			  title="Toggle theme"
			>
			  <span className="flex items-center gap-2">
				{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
				<span>Theme</span>
			  </span>
			  <span className="text-xs">{mounted ? (isDark ? "Dark" : "Light") : "…"}</span>
			</button>
		  </div>
				</aside>
			</div>

		<main className="flex-1 h-full overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}


