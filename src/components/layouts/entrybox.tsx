"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type Field = {
    name: string;
    label: string;
    type?: string;
    autoComplete?: string;
};

export default function EntryBox({ 
    items = [],
    schema,
    fields,
    onSubmit,
}: { items?: React.ReactNode[];
    schema?: any;
    fields?: Field[];
    onSubmit?: (values:any) => Promise<void> | void;
}){
    const pathname = usePathname();

    const form = schema ? useForm<any>({resolver: zodResolver(schema )}):null;
     return (
    <div className="pt-16 min-h-[calc(100dvh-64px)] flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-zinc-50 text-black dark:bg-black dark:text-zinc-50 p-6 shadow-lg">
        {schema && fields && form ? (
          <form onSubmit={form.handleSubmit(async (v) => onSubmit?.(v))} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium" htmlFor={f.name}>{f.label}</label>
                <input
                  id={f.name}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete}
                  {...form.register(f.name)}
                  className="mt-1 w-full rounded border px-3 py-2 bg-white dark:bg-zinc-900"
                />
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded"
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