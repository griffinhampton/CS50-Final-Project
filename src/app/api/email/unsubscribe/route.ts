import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { gmailSendTextEmail } from "@/services/email/google";

//sends an email saying "please remove me from your mailing list"
//to junk emails (on request)

type Body = {
	toEmail?: string | null;
};

export async function POST(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	let body: Body;
	try {
		body = (await req.json()) as Body;
	} catch {
		return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
	}

	const to = typeof body.toEmail === "string" ? body.toEmail.trim() : "";
	if (!to) return NextResponse.json({ message: "Missing toEmail" }, { status: 400 });

	await gmailSendTextEmail({
		userId: user.id,
		to,
		subject: "Unsubscribe",
		bodyText: "Please remove me from your mailing list",
	});

	return NextResponse.json({ ok: true });
}
