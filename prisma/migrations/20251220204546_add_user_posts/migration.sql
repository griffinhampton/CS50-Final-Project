-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPosts" (
    "id" SERIAL NOT NULL,
    "userPostId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "authorUsername" TEXT NOT NULL,

    CONSTRAINT "UserPosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserPosts_authorUsername_userPostId_key" ON "UserPosts"("authorUsername", "userPostId");

-- AddForeignKey
ALTER TABLE "UserPosts" ADD CONSTRAINT "UserPosts_authorUsername_fkey" FOREIGN KEY ("authorUsername") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
