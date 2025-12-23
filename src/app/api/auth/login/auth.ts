import { NextResponse  } from "next/server";
import { loginSchema } from "@/lib/utils";

export async function POST(req: Request){
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if(!parsed.success) {
        return NextResponse.json({errors: parsed.error.flatten() }, {status: 400})
    }
    // find user by email unhash and check password, find user in DB, give them a session
}