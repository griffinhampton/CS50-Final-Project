import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

//went ahead and kinda added functionality here, just have to actually get the oauth perms from yahoo
//made it for the gmail one and pasted it here

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.redirect(new URL("/login", req.url));

	const clientId = process.env.YAHOO_CLIENT_ID;
	const redirectUri = process.env.YAHOO_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		return NextResponse.json({ message: "Missing Yahoo OAuth env vars" }, { status: 500 });
	}

	const state = crypto.randomBytes(32).toString("base64url");

	const jar = await cookies();
	jar.set("yahoo_oauth_state", state, {
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
		scope: "openid profile email",
		state,
	});

	const authorizeUrl = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
	return NextResponse.redirect(authorizeUrl);
}

