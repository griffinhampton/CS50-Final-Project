import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getSessionUser } from '@lib/auth'


//this is the worst way to handle user authentication ever, i shouldve put the auth stuff in each file
//dealing with this middleware has been a NIGHTMARE. the default routing just doesnt work for pages like /emails
//so i had to micro manage it

//anyways, confirms a user is an admin, or logged in

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
    
    return NextResponse.next()
}

export const config = {
    matcher: ['/analytics/:path*',
         '/dashboard/:path*',
         '/profile/:path*',
         '/integrations/:path*',
         '/workflows/:path*',
         '/workflows',
         '/emails/:path*',
         '/emails',
         '/admin/:path*',
         '/monitoring/:path*',
         '/settings/:path*']
}