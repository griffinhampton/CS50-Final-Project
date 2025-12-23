import { NextResponse  } from "next/server";
import { registerSchema } from "@/lib/utils";

export async function POST(req: Request){
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if(!parsed.success) {
        return NextResponse.json({errors: parsed.error.flatten() }, {status: 400})
    }
    // hash password, create or find user in DB,
}