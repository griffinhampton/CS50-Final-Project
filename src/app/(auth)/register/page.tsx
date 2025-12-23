"use client";
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
  const fields = [
    { name: "username", label: "Username" },
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  ];

  async function onSubmit(values: RegisterInput) {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    console.log('successful addition to the DB')
  }

  return <EntryBox schema={registerSchema} fields={fields} onSubmit={onSubmit} />;
}