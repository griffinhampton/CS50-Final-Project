import Link from 'next/link';

export default function Navbar() {
  const isLoggedIn = false;
  const isAdmin = false;
  return (
    <nav className="flex items-center justify-between p-4 bg-black text-white border-b border-zinc-800 sticky top-0">
      <div className="text-xl font-bold">
        <Link href="/">Home</Link>
      </div>
      <div className="flex gap-6">
        <Link href="/blog-area" className="hover:text-gray-300 transition-colors">
          Blog
        </Link>
        <Link href="/streaming" className="hover:text-gray-300 transition-colors">
          Streaming
        </Link>
        {isLoggedIn && isAdmin && (
          <Link href="/testing-database" className="hover:text-gray-300 transition-colors">
            Test Database
          </Link>
          )}
        {isLoggedIn && isAdmin && (
          <Link href="/admin-analytics" className="hover:text-gray-300 transition-colors">
            Analytics
          </Link>
        )}
        {!isLoggedIn && (
        <Link href="/login" className="hover:text-gray-300 transition-colors">
          Log in
        </Link>
        )}
        {!isLoggedIn && (
        <Link href="/login" className="hover:text-gray-300 transition-colors">
          Register
        </Link>
        )}
      </div>
    </nav>
  );
}