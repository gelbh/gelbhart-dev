SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0; -- PostgreSQL 17+ only, commented for compatibility
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS extensions;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_cache_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.analytics_cache_records (
    id bigint NOT NULL,
    key character varying NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    fetched_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: analytics_cache_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_cache_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_cache_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_cache_records_id_seq OWNED BY public.analytics_cache_records.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: pacman_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pacman_scores (
    id bigint NOT NULL,
    player_name character varying,
    score integer,
    is_win boolean,
    played_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: pacman_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pacman_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pacman_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pacman_scores_id_seq OWNED BY public.pacman_scores.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.projects (
    id bigint NOT NULL,
    title character varying NOT NULL,
    subtitle character varying NOT NULL,
    description text NOT NULL,
    icon character varying,
    color character varying,
    link_text character varying,
    link_url character varying,
    link_icon character varying DEFAULT 'bx-right-arrow-alt'::character varying,
    link_target character varying,
    link_rel character varying,
    github_url character varying,
    badges jsonb DEFAULT '[]'::jsonb,
    "position" integer,
    published boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT true NOT NULL,
    route_name character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: analytics_cache_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_cache_records ALTER COLUMN id SET DEFAULT nextval('public.analytics_cache_records_id_seq'::regclass);


--
-- Name: pacman_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacman_scores ALTER COLUMN id SET DEFAULT nextval('public.pacman_scores_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: analytics_cache_records analytics_cache_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_cache_records
    ADD CONSTRAINT analytics_cache_records_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: pacman_scores pacman_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacman_scores
    ADD CONSTRAINT pacman_scores_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: index_analytics_cache_records_on_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_analytics_cache_records_on_key ON public.analytics_cache_records USING btree (key);


--
-- Name: index_pacman_scores_on_player_score_played; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_pacman_scores_on_player_score_played ON public.pacman_scores USING btree (player_name, score DESC, played_at DESC);


--
-- Name: index_pacman_scores_on_score_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_pacman_scores_on_score_desc ON public.pacman_scores USING btree (score DESC);


--
-- Name: index_projects_on_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_projects_on_featured ON public.projects USING btree (featured);


--
-- Name: index_projects_on_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_projects_on_position ON public.projects USING btree ("position");


--
-- Name: index_projects_on_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_projects_on_published ON public.projects USING btree (published);


--
-- Name: ar_internal_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ar_internal_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: ar_internal_metadata deny_public_ar_internal_metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_public_ar_internal_metadata ON public.ar_internal_metadata USING (false) WITH CHECK (false);


--
-- Name: pacman_scores deny_public_pacman_scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_public_pacman_scores ON public.pacman_scores USING (false) WITH CHECK (false);


--
-- Name: projects deny_public_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_public_projects ON public.projects USING (false) WITH CHECK (false);


--
-- Name: schema_migrations deny_public_schema_migrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_public_schema_migrations ON public.schema_migrations USING (false) WITH CHECK (false);


--
-- Name: pacman_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pacman_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20251230161752'),
('20251208214526'),
('20251203140407'),
('20251120183019'),
('20251118133746'),
('20251118133745'),
('20251118133744'),
('20251026174642'),
('20251026174201'),
('20251026164854'),
('20251007183416');

