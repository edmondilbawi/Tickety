import { useEffect, useState } from 'react';
import formatDateTime from '../utils/formatDateTime.js';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getBookingById } from '../services/bookingService.js';

function BookingConfirmationView() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadBooking = async () => {
      try {
        const data = await getBookingById(id);

        if (!cancelled) {
          setBooking(data);
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

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <LoadingMessage message="Preparing your Booking confirmation..." />;
  }

  if (error || !booking) {
    return <ErrorMessage message={error || 'Booking could not be loaded'} />;
  }

  return (
    <section className="confirmation-page">
      <div className="confirmation-icon" aria-hidden="true">✓</div>
      <p className="eyebrow">You're all set</p>
      <h1>Booking Confirmed!</h1>
      <p className="confirmation-lead">
        Your place at <strong>{booking.event.title}</strong> is reserved.
      </p>

      <article className="confirmation-ticket">
        <div className="confirmation-ticket-heading">
          <div>
            <span>Booking reference</span>
            <strong>#{booking.id}</strong>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="confirmation-event">
          <div>
            <span>Event</span>
            <strong>{booking.event.title}</strong>
          </div>
          <div>
            <span>Date & time</span>
            <strong>{formatDateTime(booking.event.eventDate)}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>{booking.event.location}</strong>
          </div>
        </div>

        <div className="confirmation-items">
          {booking.items.map((item) => (
            <div key={item.id}>
              <span>{item.name} × {item.quantity}</span>
              <span>
                ${Number(item.price).toFixed(2)} each ·{' '}
                <strong>${(item.quantity * Number(item.price)).toFixed(2)}</strong>
              </span>
            </div>
          ))}
        </div>

        <p className="confirmation-total">
          <span>Total</span>
          <strong>${Number(booking.total).toFixed(2)}</strong>
        </p>
      </article>

      <div className="confirmation-actions">
        <Link className="button" to="/my-bookings">View My Bookings</Link>
        <Link className="button button-secondary" to="/events">
          Explore More Events
        </Link>
      </div>
    </section>
  );
}

export default BookingConfirmationView;
