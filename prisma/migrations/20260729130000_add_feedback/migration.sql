-- Обратная связь с портала: заявки на доступ, предложенные проекты,
-- сообщения об ошибках и общие вопросы. Читаются в админ-панели.

CREATE TYPE "FeedbackTopic" AS ENUM ('ACCESS_REQUEST', 'ADD_PROJECT', 'BUG', 'QUESTION');
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');

CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "topic" "FeedbackTopic" NOT NULL DEFAULT 'QUESTION',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_status_idx" ON "feedback"("status");
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");
