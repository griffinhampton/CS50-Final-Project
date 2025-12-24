'use server'

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { registerSchema,loginSchema } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
//import { redirect } from 'next/dist/server/api-utils';
import { z } from 'zod';
//import { resumePluginState } from 'next/dist/build/build-context';
//import { parse } from 'path';
import { treeifyError } from 'zod';

type ActionResult = { ok: boolean; errors?: any; message?: string};

async function cookieSetter(action:string, value?:string): Promise<ActionResult> {
    const jar = await cookies()
    if(action==="set")
    {
        //TODO: issue real session/JWT token
        jar.set('session', value || 'mock-token', {
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
        jar.delete('session');
        return{ok:true}
    }
    
    return {ok:false, errors:400,message:"Invalid session request"}
}

export async function register(formData: FormData): Promise<ActionResult> {
    const data = Object.fromEntries(formData);
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) return { ok: false, errors:treeifyError(parsed.error) }

    const { username, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);

    const orConditions = [{ username }, ...(email ? [{ email }] : [])];
    const existing = await prisma.user.findFirst({
        where: {
            OR: orConditions
        }
    });
    
    if (existing) {
        return { ok: false, message: 'Username or email already in use' }
    }

    await prisma.user.create({
        data: {
            username,
            email: email ?? null,
            password: passwordHash,
        },
    });

    await cookieSetter("set", "register");
    return {ok:true}
}

export async function login(formData: FormData): Promise<ActionResult> {
    const data = Object.fromEntries(formData);
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) return {ok: false, errors:treeifyError(parsed.error)}

    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                {email: identifier},
                {username: identifier}
            ]
        }
    });
    
    if (!user) {
        return { ok: false, message: 'Invalid credentials' }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return { ok: false, message: 'Invalid credentials' }
    }

    await cookieSetter("set", "login");
    return {ok:true}
}

export async function logout(): Promise<ActionResult> {
    await cookieSetter("logout");
    return {ok: true}
}
// Server Actions for Authentication

// TODO: Implement login, register, logout actions
