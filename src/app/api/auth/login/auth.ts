import { NextResponse  } from "next/server";
import { loginSchema } from "@/lib/utils";

//verifying safe parses thru login schema (zod/prisma stuff)

export async function POST(req: Request){
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if(!parsed.success) {
        return NextResponse.json({errors: parsed.error.flatten() }, {status: 400})
    }
    
}