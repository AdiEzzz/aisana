-- Кабинет партнёра: роль BUSINESS, задачи партнёров, диалоги с командами вузов и журнал поиска.
-- Только добавление: новое значение роли, одна необязательная колонка и четыре новые таблицы.
-- Существующие строки не меняются.

-- CreateEnum
CREATE TYPE "BusinessRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'HIDDEN');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'BUSINESS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organization" TEXT;

-- CreateTable
CREATE TABLE "business_requests" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industry" "ProjectIndustry",
    "expectation" TEXT,
    "status" "BusinessRequestStatus" NOT NULL DEFAULT 'OPEN',
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "projectId" TEXT,
    "requestId" TEXT,
    "businessReadAt" TIMESTAMP(3),
    "universityReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "fromBusiness" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organization" TEXT,
    "query" TEXT NOT NULL,
    "topic" TEXT,
    "withAi" BOOLEAN NOT NULL DEFAULT false,
    "results" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_requests_authorId_idx" ON "business_requests"("authorId");

-- CreateIndex
CREATE INDEX "business_requests_status_idx" ON "business_requests"("status");

-- CreateIndex
CREATE INDEX "business_requests_createdAt_idx" ON "business_requests"("createdAt");

-- CreateIndex
CREATE INDEX "conversations_businessUserId_lastMessageAt_idx" ON "conversations"("businessUserId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_universityId_lastMessageAt_idx" ON "conversations"("universityId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_projectId_idx" ON "conversations"("projectId");

-- CreateIndex
CREATE INDEX "conversations_requestId_idx" ON "conversations"("requestId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "partner_searches_createdAt_idx" ON "partner_searches"("createdAt");

-- AddForeignKey
ALTER TABLE "business_requests" ADD CONSTRAINT "business_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "business_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

