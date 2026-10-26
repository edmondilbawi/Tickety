import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventCard from '../components/EventCard.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import EVENT_CATEGORIES from '../constants/eventCategories.js';
import useAuth from '../context/useAuth.js';
import { deleteEvent, getEvents } from '../services/eventService.js';
import {
  addInterest,
  getMyInterests,
  removeInterest,
} from '../services/interestService.js';

const emptyFilters = {
  search: '',
  location: '',
  category: '',
  from: '',
  to: '',
};

const getFiltersFromSearchParams = (searchParams) => ({
  search: searchParams.get('search') || '',
  location: searchParams.get('location') || '',
  category: searchParams.get('category') || '',
  from: searchParams.get('from') || '',
  to: searchParams.get('to') || '',
});

function EventsView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const [events, setEvents] = useState([]);
  const [interestedEventIds, setInterestedEventIds] = useState(new Set());
  const [filters, setFilters] = useState(() => (
    getFiltersFromSearchParams(searchParams)
  ));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const currentFilters = getFiltersFromSearchParams(
          new URLSearchParams(searchKey),
        );
        const [data, interests] = await Promise.all([
          getEvents({
            ...currentFilters,
            status: 'active',
          }),
          user?.role === 'customer' ? getMyInterests() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setInterestedEventIds(new Set(
            Array.isArray(interests) ? interests.map((event) => event.id) : [],
          ));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setEvents([]);
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
  }, [searchKey, user?.role]);

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

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setMessage('');
    setSearchParams(Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value),
    ));
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setSearchParams({});
    setMessage('');
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Delete this event? This cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setMessage('');
      await deleteEvent(id);
      setEvents((currentEvents) => (
        currentEvents.filter((event) => event.id !== id)
      ));
      setMessage('Event deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const canManageEvent = (event) => (
    user?.role === 'organizer' && user.id === event.organizerId
  );

  return (
    <section>
      <div className="page-heading colorful-heading">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Explore Events</h1>
          <p>Search upcoming events that are currently available for booking.</p>
        </div>
      </div>

      <form className="filter-panel" onSubmit={handleFilterSubmit}>
        <div className="filter-grid">
          <div>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Title, description, or location"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="For example, Beirut"
              value={filters.location}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All categories</option>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="from">From</label>
            <input
              id="from"
              name="from"
              type="date"
              value={filters.from}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label htmlFor="to">To</label>
            <input
              id="to"
              name="to"
              type="date"
              value={filters.to}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={loading}>
            Search Events
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleClearFilters}
            disabled={loading}
          >
            Clear Filters
          </button>
        </div>
      </form>

      <ErrorMessage message={error} />
      {message && <p className="notice notice-success">{message}</p>}
      {loading && <LoadingMessage message="Loading events..." />}

      {!loading && !error && events.length === 0 && (
        <EmptyState title="No upcoming events found">
          Try changing or clearing the search filters.
        </EmptyState>
      )}

      {!loading && !error && events.length > 0 && (
        <>
          <div className="results-bar">
            <p className="results-count">
              <strong>{events.length}</strong>{' '}
              {events.length === 1 ? 'Event' : 'Events'} found
            </p>
            <span>Choose an event to view tickets and details.</span>
          </div>
          <div className="card-grid">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                canManage={canManageEvent(event)}
                onDelete={handleDelete}
                interested={interestedEventIds.has(event.id)}
                onToggleInterest={user?.role === 'customer'
                  ? handleToggleInterest
                  : undefined}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default EventsView;
