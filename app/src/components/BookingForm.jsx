import { useState } from 'react';

function BookingForm({ ticketTypes, onBook, submitting }) {
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');

  const handleQuantityChange = (ticketTypeId, value) => {
    const ticketType = ticketTypes.find((item) => item.id === ticketTypeId);
    const parsedQuantity = Number(value);
    const quantity = Number.isFinite(parsedQuantity)
      ? Math.min(
        Math.max(Math.trunc(parsedQuantity), 0),
        ticketType.quantity,
      )
      : 0;

    setQuantities((currentQuantities) => ({
      ...currentQuantities,
      [ticketTypeId]: quantity,
    }));
  };

  const selectedItems = ticketTypes
    .map((ticketType) => ({
      ticketTypeId: ticketType.id,
      quantity: quantities[ticketType.id] || 0,
    }))
    .filter((item) => item.quantity > 0);

  const estimatedTotal = selectedItems.reduce((total, item) => {
    const ticketType = ticketTypes.find(
      (currentTicketType) => currentTicketType.id === item.ticketTypeId,
    );
    return total + item.quantity * Number(ticketType.price);
  }, 0);
  const allSoldOut = ticketTypes.every((ticketType) => ticketType.quantity === 0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (selectedItems.length === 0) {
      setError('Select at least one ticket');
      return;
    }

    try {
      setError('');
      await onBook(selectedItems);
      setQuantities({});
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <form className="booking-form card" onSubmit={handleSubmit}>
      <div className="booking-form-heading">
        <div>
          <p className="eyebrow">Your selection</p>
          <h2>Select Quantities</h2>
        </div>
        <span>Availability is verified when you confirm.</span>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      {allSoldOut && (
        <p className="notice notice-info">
          All Ticket Types for this Event are currently sold out.
        </p>
      )}

      {ticketTypes.map((ticketType) => (
        <div className="booking-row" key={ticketType.id}>
          <div>
            <label htmlFor={`ticket-${ticketType.id}`}>
              {ticketType.name}
            </label>
            <span>${Number(ticketType.price).toFixed(2)} each</span>
            <span>
              {ticketType.quantity === 0
                ? <strong className="sold-out">Sold out</strong>
                : `${ticketType.quantity} available`}
            </span>
          </div>
          <input
            id={`ticket-${ticketType.id}`}
            aria-label={`Quantity for ${ticketType.name}`}
            type="number"
            min="0"
            max={ticketType.quantity}
            step="1"
            value={quantities[ticketType.id] || 0}
            onChange={(event) => (
              handleQuantityChange(ticketType.id, event.target.value)
            )}
            disabled={submitting || ticketType.quantity === 0}
          />
        </div>
      ))}

      <p className="booking-total">
        <strong>Estimated total:</strong> ${estimatedTotal.toFixed(2)}
      </p>
      <p className="muted">
        The server verifies current prices and availability when you book.
      </p>

      <button
        className="button"
        type="submit"
        disabled={submitting || ticketTypes.length === 0 || allSoldOut}
      >
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </form>
  );
}

export default BookingForm;
