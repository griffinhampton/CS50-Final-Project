import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieName, hashSessionToken } from '@/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (token) {
      const tokenHash = hashSessionToken(token);
      await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    }

    cookieStore.delete(getSessionCookieName());

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
