import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventCard from '../components/EventCard.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getOrganizerBookings } from '../services/bookingService.js';
import { deleteEvent, getMyEvents } from '../services/eventService.js';

function OrganizerDashboardView() {
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [eventData, bookingData] = await Promise.all([
          getMyEvents(),
          getOrganizerBookings(),
        ]);

        if (!cancelled) {
          setEvents(Array.isArray(eventData) ? eventData : []);
          setBookings(Array.isArray(bookingData) ? bookingData : []);
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

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const bookingSummary = useMemo(() => ({
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
  }), [bookings]);

  const remainingTickets = useMemo(() => events.reduce(
    (total, event) => total + Number(event.remainingTickets || 0),
    0,
  ), [events]);

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm(
      'Delete this Event? Events with Booking history cannot be deleted.',
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setMessage('');
      await deleteEvent(eventId);
      setEvents((currentEvents) => (
        currentEvents.filter((event) => event.id !== eventId)
      ));
      setMessage('Event deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section>
      <div className="page-heading page-heading-actions dashboard-heading">
        <div>
          <p className="eyebrow">Organizer workspace</p>
          <h1>Organizer Dashboard</h1>
          <p>Manage your events, tickets and reservations.</p>
        </div>
        <Link className="button button-large" to="/events/new">
          + Create Event
        </Link>
      </div>

      <ErrorMessage message={error} />
      {message && <p className="notice notice-success">{message}</p>}
      {loading && <LoadingMessage message="Loading dashboard..." />}

      {!loading && (
        <>
          <section className="dashboard-section" aria-labelledby="booking-summary">
            <h2 id="booking-summary">At a glance</h2>
            <div className="summary-grid">
              <article className="summary-card summary-pink">
                <span>My Events</span>
                <strong>{events.length}</strong>
              </article>
              <article className="summary-card summary-green">
                <span>Confirmed Bookings</span>
                <strong>{bookingSummary.confirmed}</strong>
              </article>
              <article className="summary-card summary-coral">
                <span>Cancelled Bookings</span>
                <strong>{bookingSummary.cancelled}</strong>
              </article>
              <article className="summary-card summary-purple">
                <span>Remaining Tickets</span>
                <strong>{remainingTickets}</strong>
              </article>
            </div>
          </section>

          <section className="dashboard-section quick-actions-panel" aria-labelledby="quick-actions">
            <div>
              <p className="eyebrow">Shortcuts</p>
              <h2 id="quick-actions">Quick Actions</h2>
            </div>
            <div className="quick-actions">
              <Link className="button" to="/events/new">Create Event</Link>
              <Link className="button button-secondary" to="/ticket-types">
                Manage Ticket Types
              </Link>
              <Link className="button button-secondary" to="/organizer/bookings">
                View Bookings
              </Link>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="my-events">
            <div className="section-heading">
              <h2 id="my-events">My Events</h2>
              <span>{events.length} total</span>
            </div>

            {events.length === 0 ? (
              <EmptyState title="No Events created">
                Use Create Event to add your first Event.
              </EmptyState>
            ) : (
              <div className="card-grid">
                {events.map((event) => (
                  <div key={event.id}>
                    <EventCard
                      event={event}
                      canManage
                      onDelete={handleDelete}
                    />
                    <div className="inventory-summary">
                      <span>{event.ticketTypeCount} Ticket Types</span>
                      <span>{event.remainingTickets} tickets remaining</span>
                    </div>
                    <div className="organizer-approval-summary">
                      <span>Publication review</span>
                      <StatusBadge status={event.approvalStatus} />
                      {event.approvalStatus === 'pending' && (
                        <p>Changes require Owner approval before this Event becomes public.</p>
                      )}
                      {event.rejectionReason && (
                        <p>Rejection reason: {event.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default OrganizerDashboardView;
