import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { isAuthenticated } from '@lib/auth'

export function middleware(request: NextRequest) {
    if (!isAuthenticated(request)){
        return Response.json(
            { success: false, message: 'authentication failed '},
            { status: 401}
        )
    }
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.rewrite(new URL('/dashboard/user', request.url))
    }

    return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
    matcher: ['/analytics/:path*',
         '/dashboard/:path*',
         '/profile/:path*',
         '/analytics/:path*',
         '/integrations/:path*',
         '/profile/:path*',
         '/workflows/:path*',
         '/emails/:path*']
}