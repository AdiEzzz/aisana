-- Обращения к команде проекта («Связаться с командой»).
-- Только добавление: новое значение перечисления и две необязательные колонки.
-- Существующие обращения не меняются, у них обе колонки остаются NULL.
ALTER TYPE "FeedbackTopic" ADD VALUE IF NOT EXISTS 'PROJECT_CONTACT';

ALTER TABLE "feedback" ADD COLUMN "projectId" TEXT;
ALTER TABLE "feedback" ADD COLUMN "userId" TEXT;

CREATE INDEX "feedback_projectId_idx" ON "feedback"("projectId");

-- При удалении проекта обращение остаётся, ссылка на проект обнуляется.
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
