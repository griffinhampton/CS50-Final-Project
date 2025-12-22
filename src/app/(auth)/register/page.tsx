"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/utils";
import z from "zod";
//import { register } from "@/actions/auth";

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


export function processRegisterInput(registerInput: RegisterInput): string{
    const parsed = registerSchema.safeParse(registerInput);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => i.message).join(", ");
  }
  return JSON.stringify(parsed.data);
}
export default function registerPage() {
const result = processRegisterInput(userDataFromAPI as RegisterInput);
console.log(result);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <p style={{color:'white'}}>Hello, {result}</p>
    </div>
  );
}
