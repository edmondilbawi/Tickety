-- Additive migration for the Owner role, Event approval, and Customer interests.
-- Existing Events intentionally become pending and require Owner review.

BEGIN;

-- Replace the earlier customer/organizer check without changing any User rows.
ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'organizer', 'owner'));

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approved_by INTEGER,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.events
SET approval_status = 'pending',
    approved_by = NULL,
    approved_at = NULL,
    rejection_reason = NULL
WHERE approval_status IS NULL;

ALTER TABLE public.events
    ALTER COLUMN approval_status SET DEFAULT 'pending',
    ALTER COLUMN approval_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'events_approval_status_check'
          AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events
            ADD CONSTRAINT events_approval_status_check
            CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'events_approved_by_fkey'
          AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events
            ADD CONSTRAINT events_approved_by_fkey
            FOREIGN KEY (approved_by)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_interests_user_event_unique UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_approval_status
    ON public.events (approval_status);

CREATE INDEX IF NOT EXISTS idx_events_public_lookup
    ON public.events (status, approval_status, event_date);

CREATE INDEX IF NOT EXISTS idx_event_interests_user_id
    ON public.event_interests (user_id);

CREATE INDEX IF NOT EXISTS idx_event_interests_event_id
    ON public.event_interests (event_id);

COMMIT;
