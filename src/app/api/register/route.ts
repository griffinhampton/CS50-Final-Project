import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/utils";
import {
  generateSessionToken,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hashSessionToken,
} from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { username, email, password } = parsed.data;

  const orConditions = [{ username }, ...(email ? [{ email }] : [])];
  const existing = await prisma.user.findFirst({
    where: {
      OR: orConditions,
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Username or email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email: email ?? null,
      password: passwordHash,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // Create a real session (random token stored hashed in DB)
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
    maxAge,
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
