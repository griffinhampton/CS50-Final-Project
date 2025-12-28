"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from "lucide-react";

//using zod, (client side restriction for forms) to create/get values from entry boxes 
//everything else done here is just basic tailwind/next.js templating


type Field = {
    name: string;
    label: string;
    type?: string;
    autoComplete?: string;
};

type SubmitResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export default function EntryBox({ 
    items = [],
    schema,
    fields,
    onSubmit,
}: { items?: React.ReactNode[];
    schema?: any;
    fields?: Field[];
  onSubmit?: (values: any) => Promise<void | SubmitResult> | void | SubmitResult;
}){
    const pathname = usePathname();

    const [showPassword, setShowPassword] = React.useState<Record<string, boolean>>({});

    const form = schema ? useForm<any>({resolver: zodResolver(schema )}):null;
     return (
    <div className="pt-16 min-h-[calc(100dvh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg p-6 bg-white text-black dark:bg-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800">
        {schema && fields && form ? (
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                const result = await onSubmit?.(v);

                if (result && typeof result === "object" && "ok" in result && result.ok === false) {
                  const fieldErrors = result.fieldErrors;
                  if (fieldErrors) {
                    for (const [fieldName, message] of Object.entries(fieldErrors)) {
                      form.setError(fieldName as any, {
                        type: "server",
                        message,
                      });
                    }
                  }
                }
              } catch {
                // If a caller throws, avoid crashing the UI.
                // (Caller can still return fieldErrors for inline display.)
              }
            })}
            className="space-y-4"
          >
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium" htmlFor={f.name}>{f.label}</label>
                {f.type === "password" ? (
                  <div className="relative mt-1">
                    <input
                      id={f.name}
                      type={showPassword[f.name] ? "text" : "password"}
                      autoComplete={f.autoComplete}
                      {...form.register(f.name)}
                      className="w-full rounded border px-3 py-2 pr-10 bg-white text-black dark:bg-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, [f.name]: !prev[f.name] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200"
                      aria-label={showPassword[f.name] ? "Hide password" : "Show password"}
                      title={showPassword[f.name] ? "Hide password" : "Show password"}
                    >
                      {showPassword[f.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <input
                    id={f.name}
                    type={f.type ?? "text"}
                    autoComplete={f.autoComplete}
                    {...form.register(f.name)}
                    className="mt-1 w-full rounded border px-3 py-2 bg-white text-black dark:bg-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700"
                  />
                )}
                {form.formState.errors?.[f.name]?.message && (
                  <p className="text-sm text-red-500 mt-1">
                    {String(form.formState.errors[f.name]?.message)}
                  </p>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </form>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        ) : (
          <p>hello, {pathname}</p>
        )}
      </div>
    </div>
  );
}