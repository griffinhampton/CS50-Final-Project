"use client";
import EntryBox from "@/components/layouts/entrybox";
import { loginSchema, type LoginInput } from "@/lib/utils";

export default function LoginPage() {
  const fields = [
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
  ];

  async function onSubmit(values: LoginInput) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    console.log("successful login");
  }

  return <EntryBox schema={loginSchema} fields={fields} onSubmit={onSubmit} />;
}