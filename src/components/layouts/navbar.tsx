"use client"
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from "next/image";

export default function Navbar() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  //ensures redirects go where i want them using middleware
  //once again usual templating with next.js and tailwind
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const checkSession = async () => {
      try {
        const res = await fetch('/api/session', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setIsLoggedIn(false);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoggedIn(true);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsLoggedIn(false);
        }
      }
    };

    checkSession();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
      setIsLoggedIn(false);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const {theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const getLinkClass = (path: string) => {
    const baseStyle = "transition-colors duration-200";
    const activeStyle = "text-black dark:text-white font-bold";
    const inactiveStyle = "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200";

    return pathname === path 
      ? `${baseStyle} ${activeStyle}` 
      : `${baseStyle} ${inactiveStyle}`;
  };

  const current = mounted ? (resolvedTheme ?? theme) : "system";
  const isDark = current === "dark"

  return (
  
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-4 bg-white text-black dark:bg-black dark:text-white border-b border-zinc-200 dark:border-zinc-800 shadow-lg backdrop-blur-sm">
      <div className="text-xl font-bold text-black dark:text-white">
        <Link href="/">Home</Link>
      </div>
      <div className="flex gap-6 items-center">
        {isLoggedIn && (
          <>
            <Link href="/dashboard" className={getLinkClass('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/workflows/" className={getLinkClass('/workflows')}>
              Workflows
            </Link>
          </>
        )}
        {isLoggedIn && isAdmin && (
          <>
            <Link href="/admin" className={getLinkClass('/admin')}>
              Admin
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
            <Link href="/" className={getLinkClass('/')}>
            Home
            </Link>
            <Link href="/login" className={getLinkClass('/login')}>
              Log in
            </Link>
            <Link href="/register" className={getLinkClass('/register')}>
              Register
            </Link>
          </>
        ) : (
          <>
            {user && (
              <Link href="/profile" className={getLinkClass('/profile')}>
              {user.username}
            </Link>
            )}
            <button
              onClick={handleLogout}
              className="transition-colors duration-200 cursor-pointer text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}