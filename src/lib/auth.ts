import type { NextRequest } from "next/server";

export type SessionUser = {
    id: number;
    username: string;
    email: string | null;
    role: "USER" | "ADMIN";
};

// Edge-safe session fetch for middleware.
// Calls our API route so middleware doesn't need Prisma (not Edge-compatible by default).
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
    try {
        const url = new URL("/api/session", request.url);
        const res = await fetch(url, {
            headers: {
                cookie: request.headers.get("cookie") ?? "",
            },
            cache: "no-store",
        });

        if (!res.ok) return null;
        const data = (await res.json()) as { user?: SessionUser | null };
        return data.user ?? null;
    } catch {
        return null;
    }
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
    return (await getSessionUser(request)) !== null;
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
    const user = await getSessionUser(request);
    return user?.role === "ADMIN";
}