//for those unfamiliar with typescript and next.js as a whole this is essentially
//what flask is for python, for JS. it's an industry standard templater, and as such
//everything must be put in templates, and with typescript you have to follow very particular
//rules within that scope, where JS throws no errors TS throws ALL errors and refuses to run
//(industry standard) (lol)

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