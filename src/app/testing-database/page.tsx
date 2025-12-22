import { prisma } from "@/lib/prisma";



export default async function testingDatabase() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <p style={{color:'white'}}>Hello, world</p>
    </div>
  );
}
