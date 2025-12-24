-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('MICROSOFT', 'YAHOO', 'GOOGLE');

-- CreateTable
CREATE TABLE "ConnectedEmailAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedEmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedEmailAccount_userId_provider_idx" ON "ConnectedEmailAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedEmailAccount_provider_providerAccountId_key" ON "ConnectedEmailAccount"("provider", "providerAccountId");

-- AddForeignKey
ALTER TABLE "ConnectedEmailAccount" ADD CONSTRAINT "ConnectedEmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
