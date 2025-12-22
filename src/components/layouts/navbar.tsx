"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const isLoggedIn = false;
  const isAdmin = false;
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const baseStyle = "transition-colors duration-200";
    const activeStyle = "text-white font-bold"; 
    const inactiveStyle = "text-gray-400 hover:text-gray-200"; 

    return pathname === path 
      ? `${baseStyle} ${activeStyle}` 
      : `${baseStyle} ${inactiveStyle}`;
  };
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