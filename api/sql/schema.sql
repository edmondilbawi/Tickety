-- Tickety schema for a new PostgreSQL development database.
-- This script creates missing tables and indexes without deleting existing data.

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
        CONSTRAINT users_role_check
        CHECK (role IN ('customer', 'organizer', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending'
        CONSTRAINT events_approval_status_check
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER
        REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.ticket_types (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    CONSTRAINT ticket_types_event_name_unique UNIQUE (event_id, name)
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE RESTRICT,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.booking_items (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL
        REFERENCES public.bookings(id) ON DELETE CASCADE,
    ticket_type_id INTEGER NOT NULL
        REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    CONSTRAINT booking_items_booking_ticket_unique
        UNIQUE (booking_id, ticket_type_id)
);

CREATE TABLE IF NOT EXISTS public.event_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_interests_user_event_unique UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id
    ON public.events (organizer_id);

CREATE INDEX IF NOT EXISTS idx_events_event_date
    ON public.events (event_date);

CREATE INDEX IF NOT EXISTS idx_events_category
    ON public.events (category);

CREATE INDEX IF NOT EXISTS idx_events_approval_status
    ON public.events (approval_status);

CREATE INDEX IF NOT EXISTS idx_events_public_lookup
    ON public.events (status, approval_status, event_date);

CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id
    ON public.ticket_types (event_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
    ON public.bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id
    ON public.booking_items (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_ticket_type_id
    ON public.booking_items (ticket_type_id);

CREATE INDEX IF NOT EXISTS idx_event_interests_user_id
    ON public.event_interests (user_id);

CREATE INDEX IF NOT EXISTS idx_event_interests_event_id
    ON public.event_interests (event_id);
