-- ============================================================================
-- CronoBiblia — Supabase schema (Track D backend)
-- Working title: CronoBiblia · bundle com.cronobiblia.app
--
-- Apply with: supabase db push, or paste into the Supabase SQL editor.
-- RLS is enabled on EVERY table in this file.
--
-- Editorial rule (spec §5/§10): only rows with status = 'approved' are ever
-- readable by the consumer app. Drafts and in-review rows stay invisible.
--   - anon:  SELECT on approved content where is_free = true
--   - auth:  SELECT on approved content where (is_free OR own entitlement active)
--   - users: read/write ONLY their own rows in user tables
--   - NO client role (anon/authenticated) may insert/update/delete editorial rows.
--     Editorial writes happen through the service role only (trusted server code).
--
-- Storage (configure in the Supabase dashboard; noted here as comments per plan):
--   bucket cronobiblia-media      (public)  — approved media assets only.
--       policy: SELECT for anon where the asset's content item is approved.
--               (enforced by joining media_assets inside a storage RLS policy)
--   bucket cronobiblia-editorial  (private) — drafts, unreviewed uploads.
--       policy: no anon/authenticated access; service role only.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- Bump updated_at on row changes.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- EDITORIAL TABLES
-- ============================================================================

-- Top-level periods (reference data; public read).
CREATE TABLE public.eras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title_es    text NOT NULL,
  summary_es  text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Canonical content cards: timeline events, evidence cards, family lessons, etc.
CREATE TABLE public.content_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  type           text NOT NULL CHECK (type IN (
                     'timeline_event', 'story', 'map', 'evidence',
                     'family_lesson', 'place_card')),
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'review', 'approved')),
  is_free        boolean NOT NULL DEFAULT false,
  era_id         uuid REFERENCES public.eras(id) ON DELETE SET NULL,
  place_id       uuid, -- set after places table is created (FK below)
  title_es       text NOT NULL,
  summary_es     text,
  body           jsonb NOT NULL DEFAULT '[]'::jsonb, -- structured blocks (§10)
  confidence     text NOT NULL DEFAULT 'media'
                   CHECK (confidence IN ('alta', 'media', 'baja', 'disputada')),
  biblical_refs  text[] NOT NULL DEFAULT '{}',
  reviewer       text,
  reviewed_at    timestamptz,
  last_reviewed_at timestamptz,
  version        integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_items_status_free_idx
  ON public.content_items(status, is_free);
CREATE INDEX content_items_era_idx ON public.content_items(era_id);
CREATE TRIGGER content_items_touch
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Date ranges for a content item (§10: "year min/max", "Date ranges").
-- Negative years = BCE. Ranges before false precision (§2).
CREATE TABLE public.chronology (
  content_item_id uuid PRIMARY KEY REFERENCES public.content_items(id) ON DELETE CASCADE,
  year_min        integer, -- earliest proposed year (negative = a. C.)
  year_max        integer, -- latest proposed year
  display_label   text NOT NULL, -- e.g. "c. 1446–1406 a. C. (fecha debatida)"
  note_es         text
);

-- Ancient places (reference data; public read).
CREATE TABLE public.places (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name_es       text NOT NULL,
  ancient_name  text,
  modern_name   text,
  latitude      double precision,
  longitude     double precision,
  description_es text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_place_fk
  FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE SET NULL;

-- Journey lines with certainty labels (§3 map rule).
CREATE TABLE public.routes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title_es        text NOT NULL,
  summary_es      text,
  geojson         jsonb NOT NULL DEFAULT '{}'::jsonb, -- reviewed GeoJSON only
  certainty       text NOT NULL DEFAULT 'reconstructed'
                    CHECK (certainty IN ('documented', 'reconstructed', 'debated')),
  text_alternative_es text, -- accessible text alternative (§11)
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'review', 'approved')),
  is_free         boolean NOT NULL DEFAULT false,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Map narration steps.
CREATE TABLE public.route_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  place_id      uuid REFERENCES public.places(id) ON DELETE SET NULL,
  step_order    integer NOT NULL,
  narration_es  text NOT NULL,
  UNIQUE (route_id, step_order)
);

-- Bibliography / source records.
CREATE TABLE public.sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  authors     text,
  publisher   text,
  year        integer,
  url         text,
  rights      text, -- license / reuse rights note
  source_type text CHECK (source_type IN (
                 'museum', 'excavation', 'university', 'peer_reviewed',
                 'academic_press', 'public_domain_text', 'other')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Claim → source links (visible citations in the product, §2).
CREATE TABLE public.citations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  source_id       uuid NOT NULL REFERENCES public.sources(id) ON DELETE RESTRICT,
  claim_ref       text, -- e.g. "datación del estrato"
  note_es         text
);
CREATE INDEX citations_item_idx ON public.citations(content_item_id);

-- Media with rights metadata (§5 image policy).
CREATE TABLE public.media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  storage_path    text NOT NULL, -- path inside cronobiblia-media bucket
  media_type      text NOT NULL DEFAULT 'image'
                    CHECK (media_type IN ('image', 'map_tile', 'illustration', 'audio')),
  license         text NOT NULL,
  attribution     text NOT NULL, -- preserved attribution (§5)
  alt_es          text NOT NULL, -- text alternative (§11)
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_assets_item_idx ON public.media_assets(content_item_id);

-- Guided stories / family lessons (ordered sequences).
CREATE TABLE public.collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  kind        text NOT NULL CHECK (kind IN ('story', 'family_lesson')),
  title_es    text NOT NULL,
  summary_es  text,
  era_id      uuid REFERENCES public.eras(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'approved')),
  is_free     boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  UNIQUE (collection_id, position)
);

-- Assessments.
CREATE TABLE public.quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  era_id        uuid REFERENCES public.eras(id) ON DELETE SET NULL,
  title_es      text NOT NULL,
  level         text NOT NULL DEFAULT 'basico'
                  CHECK (level IN ('basico', 'intermedio', 'avanzado')),
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'review', 'approved')),
  is_free       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  qtype          text NOT NULL CHECK (qtype IN (
                    'multiple_choice', 'ordering', 'place_identify')),
  prompt_es      text NOT NULL,
  explanation_es text NOT NULL, -- immediate explanation, not only right/wrong (§3)
  position       integer NOT NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'review', 'approved')),
  UNIQUE (quiz_id, position)
);

CREATE TABLE public.answer_options (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text_es  text NOT NULL,
  is_correct      boolean NOT NULL DEFAULT false,
  position        integer NOT NULL
);

-- Offline download packs manifest source (§9 content-sync).
CREATE TABLE public.content_packs (
  pack_id        text PRIMARY KEY, -- e.g. "era:exodo", "starter"
  title_es       text NOT NULL,
  content_version text NOT NULL,
  checksum       text NOT NULL, -- sha256 of the pack payload
  min_app_version text NOT NULL,
  is_free        boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'review', 'published')),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER content_packs_touch
  BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- USER TABLES
-- ============================================================================

CREATE TABLE public.profiles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  locale      text NOT NULL DEFAULT 'es',
  family_mode boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  state           text NOT NULL DEFAULT 'started'
                    CHECK (state IN ('started', 'completed')),
  progress_pct    integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  last_position   integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_item_id)
);
CREATE TRIGGER progress_touch
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bookmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_item_id)
);

CREATE TABLE public.quiz_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id    uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score      integer NOT NULL,
  total      integer NOT NULL,
  answers    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_idx ON public.quiz_attempts(user_id);

CREATE TABLE public.downloads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id         text NOT NULL REFERENCES public.content_packs(pack_id) ON DELETE CASCADE,
  content_version text NOT NULL,
  status          text NOT NULL DEFAULT 'downloaded'
                    CHECK (status IN ('downloaded', 'verified', 'stale')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pack_id)
);

-- AI rate-limit ledger: one row per question.
CREATE TABLE public.ai_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'historian' CHECK (kind = 'historian'),
  window_start timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_created_idx ON public.ai_usage(user_id, created_at);

-- Private user reports (authenticated or guest with device id).
CREATE TABLE public.feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id       text,
  kind            text NOT NULL DEFAULT 'correction'
                    CHECK (kind IN ('correction', 'bug', 'suggestion', 'other')),
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  message         text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX feedback_user_idx ON public.feedback(user_id);

-- Server-side entitlement cache (written by the revenuecat-webhook only).
CREATE TABLE public.entitlements (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('active', 'expired')),
  product_id text NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER entitlements_touch
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- True when the given user holds an active premium entitlement.
-- NOTE: must be defined AFTER public.entitlements exists — LANGUAGE sql
-- functions are validated at CREATE time (was 42P01 when defined up top).
CREATE OR REPLACE FUNCTION public.is_premium(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = uid
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.eras             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronology       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_packs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements     ENABLE ROW LEVEL SECURITY;

-- ---- content_items: gated flagship content ----
CREATE POLICY content_items_anon
  ON public.content_items FOR SELECT TO anon
  USING (status = 'approved' AND is_free = true);

CREATE POLICY content_items_auth
  ON public.content_items FOR SELECT TO authenticated
  USING (status = 'approved' AND (is_free = true OR public.is_premium(auth.uid())));

-- ---- chronology follows its content item ----
CREATE POLICY chronology_anon
  ON public.chronology FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = chronology.content_item_id
      AND ci.status = 'approved' AND ci.is_free = true));

CREATE POLICY chronology_auth
  ON public.chronology FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = chronology.content_item_id
      AND ci.status = 'approved'
      AND (ci.is_free = true OR public.is_premium(auth.uid()))));

-- ---- reference tables: public read (place names, eras, bibliography) ----
CREATE POLICY eras_read ON public.eras
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY places_read ON public.places
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sources_read ON public.sources
  FOR SELECT TO anon, authenticated USING (true);

-- ---- routes: gated like content ----
CREATE POLICY routes_anon
  ON public.routes FOR SELECT TO anon
  USING (status = 'approved' AND is_free = true);

CREATE POLICY routes_auth
  ON public.routes FOR SELECT TO authenticated
  USING (status = 'approved' AND (is_free = true OR public.is_premium(auth.uid())));

-- ---- route_steps follow their route ----
CREATE POLICY route_steps_anon
  ON public.route_steps FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = route_steps.route_id
      AND r.status = 'approved' AND r.is_free = true));

CREATE POLICY route_steps_auth
  ON public.route_steps FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = route_steps.route_id
      AND r.status = 'approved'
      AND (r.is_free = true OR public.is_premium(auth.uid()))));

-- ---- citations / media_assets follow their content item ----
CREATE POLICY citations_anon
  ON public.citations FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = citations.content_item_id
      AND ci.status = 'approved' AND ci.is_free = true));

CREATE POLICY citations_auth
  ON public.citations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = citations.content_item_id
      AND ci.status = 'approved'
      AND (ci.is_free = true OR public.is_premium(auth.uid()))));

CREATE POLICY media_assets_anon
  ON public.media_assets FOR SELECT TO anon
  USING (content_item_id IS NULL OR EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = media_assets.content_item_id
      AND ci.status = 'approved' AND ci.is_free = true));

CREATE POLICY media_assets_auth
  ON public.media_assets FOR SELECT TO authenticated
  USING (content_item_id IS NULL OR EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.id = media_assets.content_item_id
      AND ci.status = 'approved'
      AND (ci.is_free = true OR public.is_premium(auth.uid()))));

-- ---- collections / collection_items ----
CREATE POLICY collections_anon
  ON public.collections FOR SELECT TO anon
  USING (status = 'approved' AND is_free = true);

CREATE POLICY collections_auth
  ON public.collections FOR SELECT TO authenticated
  USING (status = 'approved' AND (is_free = true OR public.is_premium(auth.uid())));

CREATE POLICY collection_items_anon
  ON public.collection_items FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id
      AND c.status = 'approved' AND c.is_free = true));

CREATE POLICY collection_items_auth
  ON public.collection_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id
      AND c.status = 'approved'
      AND (c.is_free = true OR public.is_premium(auth.uid()))));

-- ---- quizzes / questions / answer_options ----
CREATE POLICY quizzes_anon
  ON public.quizzes FOR SELECT TO anon
  USING (status = 'approved' AND is_free = true);

CREATE POLICY quizzes_auth
  ON public.quizzes FOR SELECT TO authenticated
  USING (status = 'approved' AND (is_free = true OR public.is_premium(auth.uid())));

CREATE POLICY questions_anon
  ON public.questions FOR SELECT TO anon
  USING (status = 'approved' AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = questions.quiz_id
      AND q.status = 'approved' AND q.is_free = true));

CREATE POLICY questions_auth
  ON public.questions FOR SELECT TO authenticated
  USING (status = 'approved' AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = questions.quiz_id
      AND q.status = 'approved'
      AND (q.is_free = true OR public.is_premium(auth.uid()))));

CREATE POLICY answer_options_anon
  ON public.answer_options FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.questions qu
    JOIN public.quizzes q ON q.id = qu.quiz_id
    WHERE qu.id = answer_options.question_id
      AND qu.status = 'approved' AND q.status = 'approved' AND q.is_free = true));

CREATE POLICY answer_options_auth
  ON public.answer_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.questions qu
    JOIN public.quizzes q ON q.id = qu.quiz_id
    WHERE qu.id = answer_options.question_id
      AND qu.status = 'approved' AND q.status = 'approved'
      AND (q.is_free = true OR public.is_premium(auth.uid()))));

-- ---- content_packs: free packs visible to all; premium packs to entitled ----
CREATE POLICY content_packs_anon
  ON public.content_packs FOR SELECT TO anon
  USING (status = 'published' AND is_free = true);

CREATE POLICY content_packs_auth
  ON public.content_packs FOR SELECT TO authenticated
  USING (status = 'published'
    AND (is_free = true OR public.is_premium(auth.uid())));

-- ---- user tables: users read/write ONLY their own rows ----
CREATE POLICY profiles_self
  ON public.profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY progress_self
  ON public.progress FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_self
  ON public.bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quiz_attempts_self
  ON public.quiz_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY downloads_self
  ON public.downloads FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ai_usage: readable/writable by the owner; server functions use service role.
CREATE POLICY ai_usage_self
  ON public.ai_usage FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- feedback: owner reads own; insert as owner OR as guest with device_id.
CREATE POLICY feedback_read_self
  ON public.feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY feedback_insert
  ON public.feedback FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND device_id IS NOT NULL)
  );

-- entitlements: users read their own row only; writes are service-role only
-- (revenuecat-webhook edge function).
CREATE POLICY entitlements_read_self
  ON public.entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid());
