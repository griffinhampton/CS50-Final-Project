import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/utils";
import {
  generateSessionToken,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hashSessionToken,
} from "@/lib/session";

//primarily authorization, and posting login request to login schema (to verify it's formatted correctly)
//and if authorized then creates real session cookies which expire in 7 days

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      role: true,
      lastLogin: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: { previousLogin: user.lastLogin ?? null, lastLogin: now },
  });

  // creating real session
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const maxAge = getSessionMaxAgeSeconds();

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + maxAge * 1000),
    },
  });

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200 }
  );
}
