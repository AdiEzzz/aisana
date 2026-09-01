-- Модерация проектов.
-- Все существующие проекты уже показаны на портале, поэтому получают статус
-- PUBLISHED (значение по умолчанию) — публичная часть не меняется.
-- Новые проекты от представителей вузов создаются как DRAFT (логика в API).

CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED');

ALTER TABLE "projects"
  ADD COLUMN "publication" "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "moderationNote" TEXT;

-- Проставляем дату публикации существующим проектам,
-- чтобы в админке было видно, что они уже на сайте.
UPDATE "projects" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

CREATE INDEX "projects_publication_idx" ON "projects"("publication");
