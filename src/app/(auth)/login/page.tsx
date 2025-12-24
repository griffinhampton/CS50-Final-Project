"use client";
import { useRouter } from "next/navigation";
import EntryBox from "@/components/layouts/entrybox";
import { loginSchema, type LoginInput } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  
  const fields = [
    { name: "identifier", label: "Username or Email", autoComplete: "username" },
    { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
  ];

  async function onSubmit(values: LoginInput) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    
    if (res.ok) {
      console.log("successful login");
      router.push("/dashboard");
    } else {
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        // ignore
      }

      // Invalid username/email OR password
      if (res.status === 401) {
        return { ok: false, fieldErrors: { password: "Invalid credentials" } };
      }

      // Zod validation errors from API (400)
      const fieldErrors = errorBody?.errors?.fieldErrors;
      if (res.status === 400 && fieldErrors && typeof fieldErrors === "object") {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(fieldErrors)) {
          if (Array.isArray(value) && value.length) mapped[key] = String(value[0]);
        }
        if (Object.keys(mapped).length) return { ok: false, fieldErrors: mapped };
      }

      return { ok: false, fieldErrors: { password: errorBody?.message ?? "Login failed" } };
    }
  }

  return <EntryBox schema={loginSchema} fields={fields} onSubmit={onSubmit} />;
}