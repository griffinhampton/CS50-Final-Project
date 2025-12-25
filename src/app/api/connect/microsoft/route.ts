import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ message: "Missing Microsoft OAuth env vars" }, { status: 500 });
  }

  const state = crypto.randomBytes(32).toString("base64url");

  // Store state in an httpOnly cookie for CSRF protection
  const jar = await cookies();
  jar.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access https://graph.microsoft.com/Mail.Read",
    state,
  });

  const authorizeUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  return NextResponse.redirect(authorizeUrl);
}