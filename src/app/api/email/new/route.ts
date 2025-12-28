import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gmailListMessageIds } from "@/services/email/google";

//more authorization, mainly authorizes the reading of the emails, if authorized, initializes the reading
//of ones emails (only does it if the user has new emails)

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const u = await prisma.user.findUnique({
		where: { id: user.id },
		select: { id: true, lastLogin: true },
	});
	if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });
	if (!u.lastLogin) return NextResponse.json({ hasNewEmail: false });

	try {
		const after = Math.floor(u.lastLogin.getTime() / 1000);
		const ids = await gmailListMessageIds({ userId: u.id, query: `after:${after}`, maxResults: 1 });
		return NextResponse.json({ hasNewEmail: ids.length > 0 });
	} catch {
		return NextResponse.json({ hasNewEmail: false });
	}
}
