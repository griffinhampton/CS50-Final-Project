import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// The setup is now handled in src/lib/prisma.ts!
// Run this file with: npx tsx scripts/export-data.ts

async function main() {
  console.log("--- Prisma Playground Started ---");

  for(let i=0;i < 100; i ++){
  const newUser = await prisma.user.create({
    data: {
      username: `test_user${i}`,
      password: "secret_password",
    },
  });
  console.log("Created User:", newUser);
}
/*

  const allUsers = await prisma.user.findMany();
  console.log("All Users:", allUsers);


  const user = await prisma.user.findUnique({
    where: { username: "playground_user" },
  });
  console.log("Found User:", user);


  const updatedUser = await prisma.user.update({
    where: { username: "playground_user" },
    data: { password: "new_updated_password" },
  });
  console.log("Updated User:", updatedUser);
  


  const deletedUser = await prisma.user.delete({
    where: { username: "playground_user" },
  });
  console.log("Deleted User:", deletedUser);
  */
  
  console.log("--- Prisma Playground Finished ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
