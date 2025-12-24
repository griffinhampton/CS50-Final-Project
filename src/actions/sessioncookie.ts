"server only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, hashSessionToken } from "@/lib/session";

export async function requireUserId(): Promise<number> {
    const jar = await cookies();
    const token = jar.get(getSessionCookieName())?.value;
    if (!token) throw new Error("UNAUTHENTICATED SESSION");

    const tokenHash = hashSessionToken(token);
    const session = await prisma.session.findUnique({
        where: {tokenHash},
        select: {userId:true, expiresAt:true},
    });

    if(!session || session.expiresAt.getTime() <= Date.now()) throw new Error("ANUTHENTICATED SESSION");
    return session.userId;
}