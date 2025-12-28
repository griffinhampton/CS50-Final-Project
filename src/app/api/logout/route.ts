import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieName, hashSessionToken } from '@/lib/session';

//deletes current cookies, logging user out, does this by setting current cookies time to 0

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (token) {
      const tokenHash = hashSessionToken(token);
      await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    }


    cookieStore.set(getSessionCookieName(), "", { path: "/", maxAge: 0 });
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
