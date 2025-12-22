

import { prisma } from "@/lib/prisma";

async function getUsers() 
{
  const users = await prisma.user.findMany();
  return users;
}
export default async function adminAnalytics()
{
    const users = await getUsers();
    return(
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Active users:
          </h1>
           <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <table style={{border: '1px solid black', width: '80%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2', color:'#2f2f2f'}}>
                <th style={{ border: '1px solid black', padding: '8px' }}>User ID</th>
                <th style={{ border: '1px solid black', padding: '8px' }}>Username</th>
                <th style={{ border: '1px solid black', padding: '8px' }}>Password</th>
                <th style={{ border: '1px solid black', padding: '8px' }}>Access Time</th>
                <th style={{ border: '1px solid black', padding: '8px' }}>Update Time</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
              <tr key={user.id} style={{ backgroundColor: 'black'}}>
                <td style={{ border: '1px solid white', padding: '8px', color:'#f2f2f2'}}>{user.id}</td>
                <td style={{ border: '1px solid white', padding: '8px', color:'#f2f2f2'}}>{user.username}</td>
                <td style={{ border: '1px solid white', padding: '8px', color:'#f2f2f2'}}>{user.password}</td>
                <td style={{ border: '1px solid white', padding: '8px', color:'#f2f2f2'}}>{user.createdAt.toLocaleString()}</td>
                <td style={{ border: '1px solid white', padding: '8px', color:'#f2f2f2'}}>{user.updatedAt.toLocaleString()}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        </div>
      </main>
    </div>
    );
}