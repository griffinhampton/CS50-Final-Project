// Utility functions
// TODO: Add common helpers here
import { z } from 'zod';



export const loginSchema = z.object({
    identifier: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required")
})

export const registerSchema = z.object({
    username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(25, "Name is too long"),

    password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),

    email: z.string().email("Invalid email address").optional(),
});

/*
arrays(not enums) in zod:
email-to-automate: z.array(z.string().email())
.min(1,"at least one automated email required")
.max(5,"too many emails").optional()
*/
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;