import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.redirect(new URL("/login", req.url));

	const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
	const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? process.env.GMAIL_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		return NextResponse.json({ message: "Missing Google OAuth env vars" }, { status: 500 });
	}
	if (process.env.NODE_ENV === "production" && redirectUri.includes("localhost")) {
		return NextResponse.json(
			{
				message:
					"Google OAuth misconfigured: redirect URI points to localhost. Set GOOGLE_REDIRECT_URI (or GMAIL_REDIRECT_URI) to your deployed https://.../api/email/callback/gmail URL.",
			},
			{ status: 500 },
		);
	}

	const state = crypto.randomBytes(32).toString("base64url");

	const jar = await cookies();
	jar.set("google_oauth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 10 * 60,
	});

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: [
			"openid",
			"email",
			"profile",
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/gmail.send",
			"https://www.googleapis.com/auth/gmail.labels",
		].join(" "),
		access_type: "offline",
		include_granted_scopes: "true",
		prompt: "consent",
		state,
	});

	const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
	return NextResponse.redirect(authorizeUrl);
}

