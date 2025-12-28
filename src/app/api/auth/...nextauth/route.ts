import { NextResponse } from "next/server";

//basic error func

export function GET() {
	return NextResponse.json(
		{ message: "Auth provider not configured" },
		{ status: 501 }
	);
}

export const POST = GET;

