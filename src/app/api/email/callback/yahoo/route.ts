import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encryptString } from "@/actions/encrypt";
import { getSessionUser } from "@/lib/auth";
import { EmailProvider } from "@/generated/prisma";


//see gmail comment

export async function GET(req: NextRequest) {
	const user = await getSessionUser(req);
	if (!user) return NextResponse.redirect(new URL("/login", req.url));

	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");

	if (error) {
		return NextResponse.redirect(new URL(`/emails?connected=yahoo&error=${encodeURIComponent(error)}`, req.url));
	}

	const jar = await cookies();
	const expectedState = jar.get("yahoo_oauth_state")?.value;
	jar.delete("yahoo_oauth_state");

	if (!code || !state || !expectedState || state !== expectedState) {
		return NextResponse.json({ message: "Invalid OAuth state/code" }, { status: 400 });
	}

	const clientId = process.env.YAHOO_CLIENT_ID;
	const clientSecret = process.env.YAHOO_CLIENT_SECRET;
	const redirectUri = process.env.YAHOO_REDIRECT_URI;
	if (!clientId || !clientSecret || !redirectUri) {
		return NextResponse.json({ message: "Missing Yahoo OAuth env vars" }, { status: 500 });
	}

	// Yahoo expects client authentication; Basic auth is commonly supported.
	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
	const tokenRes = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${basic}`,
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
		}),
		cache: "no-store",
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text().catch(() => "");
		return NextResponse.json({ message: "Token exchange failed", detail: text }, { status: 502 });
	}

	const tokenJson: {
		access_token: string;
		refresh_token?: string;
		expires_in?: number;
		id_token?: string;
		token_type?: string;
	} = await tokenRes.json();

	const expiresAt =
		typeof tokenJson.expires_in === "number"
			? new Date(Date.now() + tokenJson.expires_in * 1000)
			: null;

	let providerAccountId = `user:${user.id}`;
	let email: string | null = null;

	try {
		const userinfoRes = await fetch("https://api.login.yahoo.com/openid/v1/userinfo", {
			headers: { Authorization: `Bearer ${tokenJson.access_token}` },
			cache: "no-store",
		});
		if (userinfoRes.ok) {
			const userinfo: { sub?: string; email?: string | null } = await userinfoRes.json();
			if (userinfo.sub) providerAccountId = userinfo.sub;
			email = userinfo.email ?? null;
		}
	} catch {
		// ignore
	}

	await prisma.connectedEmailAccount.upsert({
		where: {
			provider_providerAccountId: {
				provider: EmailProvider.YAHOO,
				providerAccountId,
			},
		},
		create: {
			userId: user.id,
			provider: EmailProvider.YAHOO,
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

	return NextResponse.redirect(new URL("/emails?connected=yahoo", req.url));
}

