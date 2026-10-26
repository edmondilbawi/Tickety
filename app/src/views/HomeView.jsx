import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventCard from '../components/EventCard.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import EVENT_CATEGORIES from '../constants/eventCategories.js';
import useAuth from '../context/useAuth.js';
import { getEvents } from '../services/eventService.js';
import {
  addInterest,
  getMyInterests,
  removeInterest,
} from '../services/interestService.js';

function HomeView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [interestedEventIds, setInterestedEventIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        const [data, interests] = await Promise.all([
          getEvents({ status: 'active' }),
          user?.role === 'customer' ? getMyInterests() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setEvents(Array.isArray(data) ? data.slice(0, 4) : []);
          setInterestedEventIds(new Set(
            Array.isArray(interests) ? interests.map((event) => event.id) : [],
          ));
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const handleToggleInterest = async (eventId, interested) => {
    try {
      setError('');
      if (interested) {
        await removeInterest(eventId);
      } else {
        await addInterest(eventId);
      }

      setInterestedEventIds((currentIds) => {
        const nextIds = new Set(currentIds);
        if (interested) {
          nextIds.delete(eventId);
        } else {
          nextIds.add(eventId);
        }
        return nextIds;
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/events?search=${encodeURIComponent(query)}` : '/events');
  };

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Find something worth attending</p>
          <h1>Discover Events with Tickety</h1>
          <p className="hero-description">
            Browse upcoming concerts, festivals, conferences, workshops and more,
            then reserve your tickets in a few simple steps.
          </p>

          <div className="hero-actions">
            <Link className="button button-large" to="/events">
              Explore Events
            </Link>

            {user?.role === 'customer' && (
              <Link className="button button-secondary button-large" to="/my-bookings">
                My Bookings
              </Link>
            )}

            {user?.role === 'organizer' && (
              <Link className="button button-secondary button-large" to="/organizer">
                Organizer Dashboard
              </Link>
            )}

            {user?.role === 'owner' && (
              <Link className="button button-secondary button-large" to="/owner/approvals">
                Review Events
              </Link>
            )}
          </div>

          <form className="hero-search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="home-search">Search Events</label>
            <input
              id="home-search"
              type="search"
              placeholder="Search events or locations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="button" type="submit">Search</button>
          </form>

          <div className="discovery-chips" aria-label="Event categories">
            {EVENT_CATEGORIES.filter((category) => category.value !== 'other').map((category) => (
              <Link
                key={category.value}
                to={`/events?category=${encodeURIComponent(category.value)}`}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-events" aria-labelledby="featured-events">
        <div className="section-heading section-heading-featured">
          <div>
            <p className="eyebrow">Upcoming events</p>
            <h2 id="featured-events">Featured Events</h2>
          </div>
          <Link className="text-link" to="/events">View all events →</Link>
        </div>

        {loading && <LoadingMessage message="Finding events for you..." />}
        <ErrorMessage message={error} />
        {!loading && !error && events.length === 0 && (
          <p className="notice notice-info">Upcoming events will appear here.</p>
        )}
        {!loading && events.length > 0 && (
          <div className="card-grid">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                interested={interestedEventIds.has(event.id)}
                onToggleInterest={user?.role === 'customer'
                  ? handleToggleInterest
                  : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default HomeView;
