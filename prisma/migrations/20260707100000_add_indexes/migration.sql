-- Postgres не индексирует внешние ключи автоматически.
-- Эти индексы ускоряют фильтры админ-списков, страницы вузов/регионов
-- и каскадные удаления по мере роста данных.

-- CreateIndex
CREATE INDEX "users_universityId_idx" ON "users"("universityId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "universities_regionId_idx" ON "universities"("regionId");

-- CreateIndex
CREATE INDEX "projects_universityId_idx" ON "projects"("universityId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_category_idx" ON "projects"("category");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE INDEX "project_files_projectId_idx" ON "project_files"("projectId");

-- CreateIndex
CREATE INDEX "hearings_projectId_idx" ON "hearings"("projectId");
