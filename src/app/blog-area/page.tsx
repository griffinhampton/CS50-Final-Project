import { prisma } from "@/lib/prisma";



export default async function Blog() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-start p-10 bg-zinc-50 font-sans dark:bg-black">
        <div>
            <h1 className="text-4xl font-bold text-white mb-4">Hello, blog</h1>
            <p className="text-white ml-12">Hello, world</p>
            <input className="border border-white-200 rounded-lg padding" placeholder="Hello"></input>
        </div>
        
    </div>
  );
}
