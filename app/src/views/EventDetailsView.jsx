import { useEffect, useState } from 'react';
import formatDateTime from '../utils/formatDateTime.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BookingForm from '../components/BookingForm.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventArtwork from '../components/EventArtwork.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useAuth from '../context/useAuth.js';
import { createBooking } from '../services/bookingService.js';
import { getEventById } from '../services/eventService.js';
import {
  addInterest,
  getMyInterests,
  removeInterest,
} from '../services/interestService.js';
import { getTicketTypesByEventId } from '../services/ticketTypeService.js';

function EventDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      try {
        const [eventData, ticketTypeData, interests] = await Promise.all([
          getEventById(id),
          getTicketTypesByEventId(id),
          user?.role === 'customer' ? getMyInterests() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setEvent(eventData);
          setTicketTypes(Array.isArray(ticketTypeData) ? ticketTypeData : []);
          setInterested(
            Array.isArray(interests)
            && interests.some((interestEvent) => interestEvent.id === Number(id)),
          );
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

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [id, user?.role]);

  const handleToggleInterest = async () => {
    try {
      setError('');
      if (interested) {
        await removeInterest(id);
      } else {
        await addInterest(id);
      }
      setInterested((current) => !current);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleBook = async (items) => {
    try {
      setSubmitting(true);
      setError('');
      const booking = await createBooking(items);
      navigate(`/bookings/${booking.id}/confirmation`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingMessage message="Loading Event details..." />;
  }

  if (error && !event) {
    return <ErrorMessage message={error} />;
  }

  return (
    <section>
      <Link className="back-link" to="/events">← Back to Explore Events</Link>

      <article className="event-details-hero">
        <EventArtwork eventId={event.id} eventDate={event.eventDate} large />
        <div className="event-details-content">
          <div className="card-heading">
            <div>
              <p className="eyebrow">{event.category || 'other'}</p>
              <h1>{event.title}</h1>
            </div>
            <StatusBadge status={event.status} />
          </div>
          <dl className="event-meta event-meta-wide">
            <div>
              <dt>Location</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt>Date & time</dt>
              <dd>{formatDateTime(event.eventDate)}</dd>
            </div>
          </dl>
          <p className="event-description">
            {event.description || 'No description provided.'}
          </p>
          {user?.role === 'customer' && (
            <button
              className={`button button-interest${interested ? ' is-interested' : ''}`}
              type="button"
              onClick={handleToggleInterest}
              aria-pressed={interested}
            >
              {interested ? 'Remove from My Interests' : 'Add to My Interests'}
            </button>
          )}
          {(user?.role === 'organizer' || user?.role === 'owner')
            && event.approvalStatus && (
              <div className="moderation-summary">
                <span>Approval</span>
                <StatusBadge status={event.approvalStatus} />
                {event.rejectionReason && <p>{event.rejectionReason}</p>}
              </div>
          )}
        </div>
      </article>

      <div className="section-heading ticket-section-heading">
        <div>
          <p className="eyebrow">Reserve your place</p>
          <h2>Choose Your Tickets</h2>
        </div>
      </div>

      {ticketTypes.length === 0 ? (
        <p className="notice notice-info">No Ticket Types are available.</p>
      ) : (
        <div className="ticket-grid">
          {ticketTypes.map((ticketType) => (
            <article
              className={`ticket-summary${ticketType.quantity === 0 ? ' ticket-summary-sold-out' : ''}`}
              key={ticketType.id}
            >
              <h3>{ticketType.name}</h3>
              <strong>${Number(ticketType.price).toFixed(2)}</strong>
              <span>
                {ticketType.quantity === 0
                  ? <span className="sold-out">Sold Out</span>
                  : `${ticketType.quantity} available`}
              </span>
            </article>
          ))}
        </div>
      )}

      <ErrorMessage message={error} />

      {!user && (
        <div className="login-cta card">
          <div>
            <strong>Ready to book?</strong>
            <p>Log in with a customer account to reserve your tickets.</p>
          </div>
          <Link className="button" to="/login">Log In to Book</Link>
        </div>
      )}

      {user?.role === 'organizer' && (
        <p className="notice notice-info">
          Booking controls are available to customer accounts.
        </p>
      )}

      {user?.role === 'owner' && (
        <p className="notice notice-info">
          Booking controls are available to customer accounts.
        </p>
      )}

      {user?.role === 'customer' && event.status !== 'active' && (
        <p className="notice notice-info">
          This Event is not currently accepting Bookings.
        </p>
      )}

      {user?.role === 'customer' && event.status === 'active' && (
        ticketTypes.length > 0 ? (
          <BookingForm
            ticketTypes={ticketTypes}
            onBook={handleBook}
            submitting={submitting}
          />
        ) : (
          <p>There are no tickets to book.</p>
        )
      )}
    </section>
  );
}

export default EventDetailsView;
