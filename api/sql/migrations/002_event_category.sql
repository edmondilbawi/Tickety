-- Add a real Event category used by the form and public repository filter.
BEGIN;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE public.events
SET category = 'other'
WHERE category IS NULL OR BTRIM(category) = '';

ALTER TABLE public.events
    ALTER COLUMN category SET DEFAULT 'other',
    ALTER COLUMN category SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_category
    ON public.events (category);

COMMIT;
