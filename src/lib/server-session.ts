import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, hashSessionToken } from "@/lib/session";

export type ServerSessionUser = {
	id: number;
	username: string;
	email: string | null;
	role: "USER" | "ADMIN";
};

export async function getServerSessionUser(): Promise<ServerSessionUser | null> {
	const cookieStore = await cookies();
	const sessionToken = cookieStore.get(getSessionCookieName())?.value;
	if (!sessionToken) return null;

	const now = new Date();
	const tokenHash = hashSessionToken(sessionToken);
	const session = await prisma.session.findUnique({
		where: { tokenHash },
		select: {
			expiresAt: true,
			user: { select: { id: true, username: true, email: true, role: true } },
		},
	});

	if (!session || session.expiresAt <= now) return null;
	return session.user;
}
