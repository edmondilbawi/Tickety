import { useEffect, useState } from 'react';
import formatDateTime from '../utils/formatDateTime.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getOrganizerBookings } from '../services/bookingService.js';

function OrganizerBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        const data = await getOrganizerBookings();

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

  return (
    <section>
      <div className="page-heading colorful-heading organizer-bookings-heading">
        <div>
          <p className="eyebrow">Organizer workspace</p>
          <h1>Event Bookings</h1>
          <p>Bookings are limited to Events owned by your organizer account.</p>
        </div>
      </div>

      {loading && <LoadingMessage message="Loading Event Bookings..." />}
      <ErrorMessage message={error} />
      {!loading && !error && bookings.length === 0 && (
        <EmptyState title="No Event Bookings">
          Customer Bookings for your Events will appear here.
        </EmptyState>
      )}

      {!loading && bookings.length > 0 && (
        <div className="table-wrapper organizer-bookings-table">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Event</th>
                <th>Customer</th>
                <th>Ticket Type</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Booked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.flatMap((booking) => (
                booking.items.map((item) => (
                  <tr key={`${booking.id}-${item.id}`}>
                    <td>#{booking.id}</td>
                    <td>{booking.event.title}</td>
                    <td>
                      {booking.customer.firstName} {booking.customer.lastName}
                      <br />
                      <span className="muted">{booking.customer.email}</span>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>${Number(item.price).toFixed(2)}</td>
                    <td>{formatDateTime(booking.bookingDate)}</td>
                    <td><StatusBadge status={booking.status} /></td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OrganizerBookingsView;
