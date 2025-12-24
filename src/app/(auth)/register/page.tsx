"use client";
import { useRouter } from "next/navigation";
import EntryBox from "@/components/layouts/entrybox";
import { registerSchema, type RegisterInput } from "@/lib/utils";
//import { register } from "@/actions/auth";
/*
const Example1 = () => {
    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            password: "",
            email:  "",
        }
    })
}

const userDataFromAPI: RegisterInput = {
    username: "griffin",
    password: "123456",
    email: "griffin@gmail.com"
};

async function onSubmit(values: RegisterInput){
    const res = await fetch('ill put something here', {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(values),
    });
}

export function processRegisterInput(registerInput: RegisterInput): string{
    const parsed = registerSchema.safeParse(registerInput);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => i.message).join(", ");
  }
  return JSON.stringify(parsed.data);
}

*/


export default function RegisterPage() {
  const router = useRouter();
  
  const fields = [
    { name: "username", label: "Username" },
    { name: "email", label: "Email (optional)", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  ];

  async function onSubmit(values: RegisterInput) {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    
    if (res.ok) {
      console.log('successful addition to the DB');
      router.push("/dashboard");
    } else {
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        // ignore
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

      // Username or email already exists (409)
      if (res.status === 409) {
        const message = "Account already exists";
        // API doesn't specify which one; show it on both so the user sees it.
        return { ok: false, fieldErrors: { username: message, email: message } };
      }

      return { ok: false, fieldErrors: { username: errorBody?.message ?? "Registration failed" } };
    }
  }

  return <EntryBox schema={registerSchema} fields={fields} onSubmit={onSubmit} />;
}