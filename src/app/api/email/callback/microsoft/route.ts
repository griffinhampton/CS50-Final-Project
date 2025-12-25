import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encryptString } from "@/actions/encrypt";
import { getSessionUser } from "@/lib/auth";
import { EmailProvider } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get("ms_oauth_state")?.value;
  jar.delete("ms_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ message: "Invalid OAuth state/code" }, { status: 400 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ message: "Missing Microsoft OAuth env vars" }, { status: 500 });
  }

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    return NextResponse.json({ message: "Token exchange failed", detail: text }, { status: 502 });
  }

  const tokenJson: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  } = await tokenRes.json();

  const expiresAt =
    typeof tokenJson.expires_in === "number"
      ? new Date(Date.now() + tokenJson.expires_in * 1000)
      : null;

  let providerAccountId = `user:${user.id}`;
  let email: string | null = null;

  try {
    const meRes = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName",
      {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
        },
        cache: "no-store",
      }
    );

    if (meRes.ok) {
      const me: {
        id?: string;
        mail?: string | null;
        userPrincipalName?: string | null;
      } = await meRes.json();
      if (me.id) providerAccountId = me.id;
      email = me.mail ?? me.userPrincipalName ?? null;
    }
  } catch {
    // If Graph /me fails, fall back to a stable per-user id.
  }

  await prisma.connectedEmailAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: EmailProvider.MICROSOFT,
        providerAccountId,
      },
    },
    create: {
      userId: user.id,
      provider: EmailProvider.MICROSOFT,
      providerAccountId,
      email,
      accessTokenEnc: encryptString(tokenJson.access_token),
      refreshTokenEnc: tokenJson.refresh_token ? encryptString(tokenJson.refresh_token) : null,
      expiresAt,
    },
    update: {
      accessTokenEnc: encryptString(tokenJson.access_token),
      refreshTokenEnc: tokenJson.refresh_token ? encryptString(tokenJson.refresh_token) : undefined,
      expiresAt,
      email: email ?? undefined,
    },
  });

  return NextResponse.redirect(new URL("/dashboard/emails?connected=microsoft", req.url));
}