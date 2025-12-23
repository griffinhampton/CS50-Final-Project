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
    <div className="flex min-w-screen rounded-lg shadow-lg: items-center justify-center">
          <div>      
            {children}
          </div>
       </div>
  );
}