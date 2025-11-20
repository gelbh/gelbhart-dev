-- SQL to create the projects table in Supabase
-- This is equivalent to migration: 20251120183019_create_projects.rb
-- Run this in Supabase SQL Editor to immediately fix the production database

-- Create the projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" bigserial primary key,
  "title" character varying NOT NULL,
  "subtitle" character varying NOT NULL,
  "description" text NOT NULL,
  "icon" character varying,
  "color" character varying,
  "link_text" character varying,
  "link_url" character varying,
  "link_icon" character varying DEFAULT 'bx-right-arrow-alt',
  "link_target" character varying,
  "link_rel" character varying,
  "github_url" character varying,
  "badges" jsonb DEFAULT '[]'::jsonb,
  "position" integer,
  "published" boolean DEFAULT true NOT NULL,
  "featured" boolean DEFAULT true NOT NULL,
  "route_name" character varying,
  "created_at" timestamp(6) NOT NULL,
  "updated_at" timestamp(6) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "index_projects_on_position" ON "projects" ("position");
CREATE INDEX IF NOT EXISTS "index_projects_on_published" ON "projects" ("published");
CREATE INDEX IF NOT EXISTS "index_projects_on_featured" ON "projects" ("featured");

-- Record this migration in schema_migrations so Rails knows it's been run
-- This prevents Rails from trying to run the migration again
INSERT INTO schema_migrations (version) 
VALUES ('20251120183019')
ON CONFLICT (version) DO NOTHING;

