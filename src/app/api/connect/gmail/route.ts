import { NextResponse, type NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
	return NextResponse.json(
		{ message: "Gmail connect is not implemented yet" },
		{ status: 501 }
	);
}

