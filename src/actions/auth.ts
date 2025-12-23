'use server'

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { registerSchema,loginSchema } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

type ActionResult = { ok: boolean; errors?: any; message?: string};

async function cookieSetter(action:string): Promise<ActionResult> {
    if(action==="login")
    {
        //TODO: issue real session/JWT token
        (await cookies()).set('session', 'mock-token', {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24,
            sameSite: 'lax',
            secure: process.env.NODE_ENV ==='production',
        })
        return {ok: true}
    }
    if(action==="admin")
    {
        (await cookies()).set('session', 'admin-token', {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24,
            sameSite: 'lax',
            secure: process.env.NODE_ENV ==='production',
        })
        return {ok: true}
    }
    if(action==="register")
    {
        //TODO: issue real session/JWT token
        (await cookies()).set('session', 'mock-token', {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24,
            sameSite: 'lax',
            secure: process.env.NODE_ENV ==='production',
        })
        return {ok: true}
    }
    if(action==="logout")
    {
        (await cookies()).delete('session');
        return{ok:true}
    }
    
    return {ok:false, errors:400,message:"Invalid session request"}
}

export async function register(formData: FormData): Promise<ActionResult> {
    const data = Object.fromEntries(formData);
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) return { ok: false, errors:parsed.error.flatten() }

    const { username, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);

    //const existing = await prisma.user.findUnique({where: { email }});
    //TODO: persist user in DB with Prisma
    //await prisma.user.create({data: {username, email, passwordHash }})

    cookieSetter("register");
    return {ok:true}
}

export async function login(formData: FormData): Promise<ActionResult> {
    const data = Object.fromEntries(formData);
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) return {ok: false, errors:parsed.error.flatten()}

    const { identifier, password} = parsed.data;
    const passwordHash = await bcrypt.hash(password,12)

    /*

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: false, message: 'Invalid credentials' };

    const valid = await bcrypt.compare(passwordHash, user.password);
    if (!valid) return { ok: false, message: 'Invalid credentials' };

    */
    cookieSetter("login");

    return {ok:true}
}

export async function logout(): Promise<ActionResult> {
    cookieSetter("logout");
    return {ok: true}
}
// Server Actions for Authentication

// TODO: Implement login, register, logout actions
