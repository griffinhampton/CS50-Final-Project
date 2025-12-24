import type { Metadata } from "next";
import "../globals.css";
import EntryBox from "@/components/layouts/entrybox";


export const metadata: Metadata = {
  title: "Authentication",
  description: "Log in or Register",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black">
      {children}
    </div>
  );
}