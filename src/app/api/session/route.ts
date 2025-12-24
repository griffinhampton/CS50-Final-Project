import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hashSessionToken,
} from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const now = new Date();
    const tokenHash = hashSessionToken(sessionToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= now) {
      // Best-effort cleanup
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      cookieStore.delete(getSessionCookieName());
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Sliding expiration: refresh cookie + expiry on each session load
    const maxAge = getSessionMaxAgeSeconds();
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastUsedAt: now,
        expiresAt: new Date(Date.now() + maxAge * 1000),
      },
    });

    cookieStore.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return NextResponse.json({ user: session.user }, { status: 200 });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
