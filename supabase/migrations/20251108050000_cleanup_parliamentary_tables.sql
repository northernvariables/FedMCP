-- Cleanup: Remove parliamentary data tables from Supabase
-- These tables are now stored in:
-- 1. Ingestion VM PostgreSQL (staging)
-- 2. Neo4j (production graph database)
--
-- Supabase should ONLY contain:
-- - User authentication (auth schema)
-- - User profiles (public.profiles)
-- - Forum system (public.forums*)

-- Drop hansards tables (now in Ingestion VM → Neo4j)
DROP TABLE IF EXISTS public.hansards_statement CASCADE;
DROP TABLE IF EXISTS public.hansards_document CASCADE;

-- Drop bills tables (now in Neo4j only)
DROP TABLE IF EXISTS public.bills_bill CASCADE;

-- Drop MPs tables (now in Neo4j only)
DROP TABLE IF EXISTS public.mps_mp CASCADE;
DROP TABLE IF EXISTS public.mps_party CASCADE;
DROP TABLE IF EXISTS public.mps_riding CASCADE;

-- Keep ONLY user-related tables:
-- ✅ auth.* (managed by Supabase)
-- ✅ public.profiles
-- ✅ public.forums
-- ✅ public.forum_topics
-- ✅ public.forum_posts
-- ✅ public.forum_votes

-- Add comment to document architecture
COMMENT ON SCHEMA public IS 'User-generated content only. Parliamentary data stored in Neo4j graph database.';
