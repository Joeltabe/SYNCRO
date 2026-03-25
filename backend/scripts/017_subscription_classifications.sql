-- Migration: subscription_classifications cache table
-- Stores LLM classification results to avoid repeated API calls.

CREATE TABLE IF NOT EXISTS public.subscription_classifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT         NOT NULL,
  category     TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_classifications_service_name_unique UNIQUE (service_name)
);

CREATE INDEX IF NOT EXISTS subscription_classifications_service_name_idx
  ON public.subscription_classifications (service_name);

COMMENT ON TABLE  public.subscription_classifications
  IS 'Cache of LLM-derived subscription category classifications';
COMMENT ON COLUMN public.subscription_classifications.service_name
  IS 'Normalised service name (lowercase, trimmed)';
COMMENT ON COLUMN public.subscription_classifications.category
  IS 'One of: entertainment, productivity, ai_tools, infrastructure, education, health, finance, other';