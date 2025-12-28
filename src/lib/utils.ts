//mainly used for allowing username OR email on login, zod helpers
import { z } from 'zod';


const usernameRegex = /^[a-zA-Z0-9_]{3,25}$/;

export const loginSchema = z.object({
    identifier: z
        .string()
        .min(1, "Username or email is required")
        .trim()
        .refine(
            (v) => z.string().email().safeParse(v).success || usernameRegex.test(v),
            "Enter a valid email or username"
        ),
    password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(25, "Name is too long")
        .regex(usernameRegex, "Username can only use letters, numbers, and _"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(100, "Password too long"),


    email: z.preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z.string().trim().email("Invalid email address").optional()
    ),
});

/*
arrays(not enums) in zod:
email-to-automate: z.array(z.string().email())
.min(1,"at least one automated email required")
.max(5,"too many emails").optional()
*/
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;