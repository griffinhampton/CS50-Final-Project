import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getSessionUser } from '@lib/auth'

export async function middleware(request: NextRequest) {
    const user = await getSessionUser(request);
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/monitoring');
    if (isAdminRoute && user.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // User is authenticated, allow the request to proceed
    return NextResponse.next()
}

export const config = {
    matcher: ['/analytics/:path*',
         '/dashboard/:path*',
         '/profile/:path*',
         '/integrations/:path*',
         '/workflows/:path*',
         '/emails/:path*',
         '/admin/:path*',
         '/monitoring/:path*',
         '/settings/:path*']
}