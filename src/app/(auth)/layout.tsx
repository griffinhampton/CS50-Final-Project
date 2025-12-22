import type { Metadata } from "next";
import "../globals.css";



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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"> {children} </div>
  );
}