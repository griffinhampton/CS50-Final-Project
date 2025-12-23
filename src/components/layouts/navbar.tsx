"use client"
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from "next/image";

export default function Navbar() {
  const isLoggedIn = false;
  const isAdmin = false;

  const pathname = usePathname();

  const {theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const getLinkClass = (path: string) => {
    const baseStyle = "transition-colors duration-200";
    const activeStyle = "text-white font-bold"; 
    const inactiveStyle = "text-gray-400 hover:text-gray-200"; 

    return pathname === path 
      ? `${baseStyle} ${activeStyle}` 
      : `${baseStyle} ${inactiveStyle}`;
  };

  const current = mounted ? (resolvedTheme ?? theme) : "system";
  const isDark = current === "dark"

  return (
  
    <nav className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-black text-white border-b border-zinc-800">
      <div className="text-xl font-bold">
        <Link href="/">Home</Link>
      </div>
      <div className="flex gap-6">
        <Link href="/" className={getLinkClass('/')}>
          Home
        </Link>
        {isLoggedIn && isAdmin && (
          <>
            <Link href="/admin" className={getLinkClass('/admin')}>
              Admin Dashboard
            </Link>
            <Link href="/admin/analytics" className={getLinkClass('/admin/analytics')}>
              Analytics
            </Link>
          </>
        )}
        {/* 
        <button 
        type="button"
        className="border-round border-zinc-700 px-3 py-1 text-sm dark:border-zinc-50 hover:cursor-pointer"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
        title="Toggle theme"
        disabled={!mounted}
        >
          {mounted && (
            <Image
              src = {isDark ? "/icons/sun-icon.ico" : "/icons/moon-icon.ico"}
              alt={isDark ? "Sun button" : "Moon button"}
              width={18}
              height={18}
              />
          )} 
        </button>

        come back to this
        */}
        {!isLoggedIn ? (
          <>
        <Link href="/login" className={getLinkClass('/login')}>
          Log in
        </Link>
        <Link href="/register" className={getLinkClass('/register')}>
          Register
        </Link>
        </>
        ) : (
          <Link href="/profile" className={getLinkClass('/profile')}>
          Register
        </Link>
        )}
      </div>
    </nav>
  );
}