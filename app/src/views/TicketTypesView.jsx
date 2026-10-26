import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import { getMyEvents } from '../services/eventService.js';
import {
  deleteTicketType,
  getTicketTypes,
} from '../services/ticketTypeService.js';

function TicketTypesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ticketTypes, setTicketTypes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadTicketTypes = async () => {
      try {
        const [ticketTypeData, eventData] = await Promise.all([
          getTicketTypes(),
          getMyEvents(),
        ]);
        const safeEvents = Array.isArray(eventData) ? eventData : [];
        const ownedEventIds = new Set(safeEvents.map((event) => event.id));
        const ownedTicketTypes = Array.isArray(ticketTypeData)
          ? ticketTypeData.filter((ticketType) => (
            ownedEventIds.has(ticketType.eventId)
          ))
          : [];

        if (!cancelled) {
          setTicketTypes(ownedTicketTypes);
          setEvents(safeEvents);
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

    loadTicketTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEventId = searchParams.get('eventId') || '';
  const visibleTicketTypes = useMemo(() => {
    if (!selectedEventId) {
      return ticketTypes;
    }

    return ticketTypes.filter(
      (ticketType) => ticketType.eventId === Number(selectedEventId),
    );
  }, [selectedEventId, ticketTypes]);

  const handleEventFilter = (event) => {
    const eventId = event.target.value;
    setMessage('');

    if (eventId) {
      setSearchParams({ eventId });
    } else {
      setSearchParams({});
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Delete this Ticket Type? This cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setMessage('');
      await deleteTicketType(id);
      setTicketTypes((currentTicketTypes) => (
        currentTicketTypes.filter((ticketType) => ticketType.id !== id)
      ));
      setMessage('Ticket Type deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const getEventTitle = (eventId) => {
    const event = events.find((item) => item.id === eventId);
    return event?.title || 'Unknown Event';
  };

  return (
    <section>
      <div className="page-heading page-heading-actions colorful-heading management-heading">
        <div>
          <p className="eyebrow">Organizer tools</p>
          <h1>Ticket Types</h1>
          <p>Manage prices and remaining availability for your Events.</p>
        </div>
        <Link className="button" to="/ticket-types/new">
          + Create Ticket Type
        </Link>
      </div>

      <ErrorMessage message={error} />
      {message && <p className="notice notice-success">{message}</p>}
      {loading && <LoadingMessage message="Loading Ticket Types..." />}

      {!loading && events.length > 0 && (
        <div className="compact-filter">
          <label htmlFor="eventFilter">Filter by Event</label>
          <select
            id="eventFilter"
            value={selectedEventId}
            onChange={handleEventFilter}
          >
            <option value="">All my Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState title="Create an Event first">
          Ticket Types must belong to one of your Events.
        </EmptyState>
      )}

      {!loading && !error && events.length > 0 && visibleTicketTypes.length === 0 && (
        <EmptyState title="No Ticket Types found">
          Create a Ticket Type or choose a different Event.
        </EmptyState>
      )}

      {!loading && visibleTicketTypes.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Ticket Type</th>
                <th>Price</th>
                <th>Remaining</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTicketTypes.map((ticketType) => (
                <tr key={ticketType.id}>
                  <td>{getEventTitle(ticketType.eventId)}</td>
                  <td>{ticketType.name}</td>
                  <td>${Number(ticketType.price).toFixed(2)}</td>
                  <td>
                    {ticketType.quantity === 0
                      ? <span className="sold-out">Sold out</span>
                      : ticketType.quantity}
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="button button-small button-secondary"
                        to={`/ticket-types/${ticketType.id}/edit`}
                      >
                        Edit
                      </Link>
                      <button
                        className="button button-small button-danger"
                        type="button"
                        onClick={() => handleDelete(ticketType.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TicketTypesView;
