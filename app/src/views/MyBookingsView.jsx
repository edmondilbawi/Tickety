import { useEffect, useState } from 'react';
import formatDateTime from '../utils/formatDateTime.js';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  cancelBooking,
  getMyBookings,
} from '../services/bookingService.js';

function MyBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        const data = await getMyBookings();

        if (!cancelled) {
          setBookings(Array.isArray(data) ? data : []);
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

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancel = async (bookingId) => {
    const confirmed = window.confirm(
      'Cancel this Booking? Its ticket quantities will be returned to availability.',
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(bookingId);
      setError('');
      setMessage('');
      const cancelledBooking = await cancelBooking(bookingId);
      setBookings((currentBookings) => currentBookings.map((booking) => (
        booking.id === bookingId ? cancelledBooking : booking
      )));
      setMessage(`Booking #${bookingId} was cancelled successfully.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Customer account</p>
          <h1>My Bookings</h1>
          <p>Review confirmed and cancelled Booking history.</p>
        </div>
      </div>

      {loading && <LoadingMessage message="Loading Bookings..." />}
      <ErrorMessage message={error} />
      {message && (
        <p className="notice notice-success" role="status">{message}</p>
      )}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState title="No bookings yet." icon="◇">
          <p>Explore Events to make your first Booking.</p>
          <Link className="button" to="/events">Explore Events</Link>
        </EmptyState>
      )}

      {!loading && bookings.length > 0 && (
        <div className="stacked-cards">
          {bookings.map((booking) => (
            <article
              className={`card booking-card${booking.status === 'cancelled' ? ' booking-card-cancelled' : ''}`}
              key={booking.id}
            >
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Booking reference #{booking.id}</p>
                  <h2>{booking.event.title}</h2>
                </div>
                <div className="booking-statuses">
                  <StatusBadge status={booking.status} />
                  {booking.event.status === 'cancelled' && (
                    <span className="status-badge status-cancelled">Event Cancelled</span>
                  )}
                </div>
              </div>
              <div className="booking-meta">
                <span>
                  <small>Event date</small>
                  <strong>{formatDateTime(booking.event.eventDate)}</strong>
                </span>
                <span>
                  <small>Location</small>
                  <strong>{booking.event.location}</strong>
                </span>
                <span>
                  <small>Booked</small>
                  <strong>{formatDateTime(booking.bookingDate)}</strong>
                </span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Ticket Type</th>
                      <th>Quantity</th>
                      <th>Price Each</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>${Number(item.price).toFixed(2)}</td>
                        <td>
                          ${(item.quantity * Number(item.price)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="booking-total">
                <strong>Total:</strong> ${Number(booking.total).toFixed(2)}
              </p>
              {booking.canCancel && (
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id
                    ? 'Cancelling...'
                    : 'Cancel Booking'}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyBookingsView;
