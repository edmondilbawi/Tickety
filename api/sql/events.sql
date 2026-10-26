CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL
);
