import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventCard from '../components/EventCard.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import { getMyInterests, removeInterest } from '../services/interestService.js';

function MyInterestsView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadInterests = async () => {
      try {
        const data = await getMyInterests();
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) {
          setEvents([]);
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInterests();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemoveInterest = async (eventId) => {
    try {
      setError('');
      await removeInterest(eventId);
      setEvents((currentEvents) => (
        currentEvents.filter((event) => event.id !== eventId)
      ));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section>
      <div className="page-heading colorful-heading">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1>My Interests</h1>
          <p>Keep track of approved Events you may want to attend.</p>
        </div>
      </div>

      <ErrorMessage message={error} />
      {loading && <LoadingMessage message="Loading your interests..." />}

      {!loading && !error && events.length === 0 && (
        <EmptyState title="No saved Events yet">
          <p>Use the Interested button on an Event to save it here.</p>
          <Link className="button" to="/events">Explore Events</Link>
        </EmptyState>
      )}

      {!loading && events.length > 0 && (
        <div className="card-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              interested
              onToggleInterest={handleRemoveInterest}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyInterestsView;
