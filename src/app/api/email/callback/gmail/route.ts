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
	const error = url.searchParams.get("error");

	if (error) {
		return NextResponse.redirect(new URL(`/emails?connected=gmail&error=${encodeURIComponent(error)}`, req.url));
	}

	const jar = await cookies();
	const expectedState = jar.get("google_oauth_state")?.value;
	jar.delete("google_oauth_state");

	if (!code || !state || !expectedState || state !== expectedState) {
		// Common causes:
		// - user refreshes the callback URL (we delete the cookie after first attempt)
		// - multiple OAuth attempts in parallel
		// - domain/redirect mismatch so the state cookie isn't present
		return NextResponse.redirect(
			new URL(
				`/emails?connected=gmail&error=${encodeURIComponent(
					!code || !state ? "missing_oauth_params" : "oauth_state_mismatch",
				)}`,
				req.url,
			),
		);
	}

	const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.GMAIL_CLIENT_SECRET;
	const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? process.env.GMAIL_REDIRECT_URI;
	if (!clientId || !clientSecret || !redirectUri) {
		return NextResponse.redirect(new URL("/emails?connected=gmail&error=missing_oauth_env", req.url));
	}

	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
		cache: "no-store",
	});

	if (!tokenRes.ok) {
		return NextResponse.redirect(new URL("/emails?connected=gmail&error=token_exchange_failed", req.url));
	}

	const tokenJson: {
		access_token: string;
		refresh_token?: string;
		expires_in?: number;
		id_token?: string;
		token_type?: string;
		scope?: string;
	} = await tokenRes.json();

	const expiresAt =
		typeof tokenJson.expires_in === "number"
			? new Date(Date.now() + tokenJson.expires_in * 1000)
			: null;

	let providerAccountId = `user:${user.id}`;
	let email: string | null = null;

	try {
		const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
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

	try {
		await prisma.connectedEmailAccount.upsert({
			where: {
				provider_providerAccountId: {
					provider: EmailProvider.GOOGLE,
					providerAccountId,
				},
			},
			create: {
				userId: user.id,
				provider: EmailProvider.GOOGLE,
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
	} catch {
		return NextResponse.redirect(new URL("/emails?connected=gmail&error=save_failed", req.url));
	}

	return NextResponse.redirect(new URL("/emails?connected=gmail", req.url));
}

