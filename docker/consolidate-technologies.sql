-- ── Одноразовая консолидация технологий ──────────────────────
-- Объединяет раздробленные технологии (AI, ИИ, GPT, Claude, ...)
-- в обобщённые группы с переносом привязок проектов.
-- Список групп можно править в блоке VALUES ниже.
-- Перед запуском сделай бэкап: docker compose exec backup /backup.sh once

BEGIN;

DO $$
DECLARE
  grp RECORD;
  target_id TEXT;
BEGIN
  FOR grp IN
    SELECT * FROM (VALUES
      ('Генеративный ИИ (LLM)', 'gen-ai',
        ARRAY['AI','ИИ','LLM','GPT','ChatGPT','Claude','Gemini','Groq','Llama','Mistral','OpenAI','EdenAI']),
      ('Машинное обучение',     'machine-learning',
        ARRAY['Machine Learning','ML']),
      ('Компьютерное зрение',   'computer-vision',
        ARRAY['Computer Vision','CV','OCR']),
      ('NLP',                   'nlp',
        ARRAY['NLP']),
      ('RAG и векторный поиск', 'rag',
        ARRAY['RAG','FAISS','Embeddings']),
      ('Чат-боты',              'chatbots',
        ARRAY['Telegram','Чат-бот','Chatbot']),
      ('Другое',                'other',
        ARRAY['Node','Node.js','SQLite','Streamlit'])
    ) AS t(target_name, target_slug, sources)
  LOOP
    -- Целевая технология: существующая по slug/имени или новая
    SELECT id INTO target_id FROM technologies
      WHERE slug = grp.target_slug OR name = grp.target_name
      LIMIT 1;

    IF target_id IS NULL THEN
      INSERT INTO technologies (id, name, slug)
      VALUES (gen_random_uuid()::text, grp.target_name, grp.target_slug)
      RETURNING id INTO target_id;
    ELSE
      UPDATE technologies SET name = grp.target_name, slug = grp.target_slug
      WHERE id = target_id;
    END IF;

    -- Переносим связи проектов на целевую (без дублей)
    INSERT INTO "_ProjectTechnologies" ("A", "B")
    SELECT DISTINCT pt."A", target_id
    FROM "_ProjectTechnologies" pt
    JOIN technologies s ON s.id = pt."B"
    WHERE s.id <> target_id
      AND lower(s.name) IN (SELECT lower(u) FROM unnest(grp.sources) u)
    ON CONFLICT DO NOTHING;

    -- Удаляем старые связи и сами технологии-источники
    DELETE FROM "_ProjectTechnologies" pt
    USING technologies s
    WHERE s.id = pt."B" AND s.id <> target_id
      AND lower(s.name) IN (SELECT lower(u) FROM unnest(grp.sources) u);

    DELETE FROM technologies s
    WHERE s.id <> target_id
      AND lower(s.name) IN (SELECT lower(u) FROM unnest(grp.sources) u);

    RAISE NOTICE 'Группа "%": готово', grp.target_name;
  END LOOP;
END $$;

COMMIT;

-- Контрольный вывод: что осталось и сколько проектов у каждой
SELECT t.name, t.slug, count(pt."A") AS projects
FROM technologies t
LEFT JOIN "_ProjectTechnologies" pt ON pt."B" = t.id
GROUP BY t.id ORDER BY projects DESC, t.name;
