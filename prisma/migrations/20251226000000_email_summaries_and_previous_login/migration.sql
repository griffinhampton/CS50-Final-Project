-- AlterTable
ALTER TABLE "User" ADD COLUMN "previousLogin" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailSummary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" "EmailProvider",
    "source" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "condition" JSONB,
    "emailCount" INTEGER NOT NULL,
    "summaryText" TEXT NOT NULL,
    "latestEmailAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSummary_userId_windowEnd_source_idx" ON "EmailSummary"("userId", "windowEnd", "source");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSummary_userId_windowStart_windowEnd_source_key" ON "EmailSummary"("userId", "windowStart", "windowEnd", "source");

-- AddForeignKey
ALTER TABLE "EmailSummary" ADD CONSTRAINT "EmailSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
