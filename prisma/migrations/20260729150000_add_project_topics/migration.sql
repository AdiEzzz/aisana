-- Тематическая классификация проектов.
-- Проект относится сразу к нескольким направлениям; для каждого хранится
-- коэффициент релевантности 0–100, объяснение и сработавшие признаки.
-- Заполняется классификатором (src/lib/search) при сохранении проекта
-- и командой полной переиндексации.

CREATE TABLE "project_topics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "signals" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_topics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_topics_projectId_topic_key" ON "project_topics"("projectId", "topic");
CREATE INDEX "project_topics_topic_idx" ON "project_topics"("topic");
CREATE INDEX "project_topics_score_idx" ON "project_topics"("score");

ALTER TABLE "project_topics"
  ADD CONSTRAINT "project_topics_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
