import { useState } from 'react';

const getFormFromTicketType = (ticketType) => ({
  eventId: ticketType?.eventId ?? '',
  name: ticketType?.name ?? '',
  price: ticketType?.price ?? '',
  quantity: ticketType?.quantity ?? '',
});

function TicketTypeForm({
  selectedTicketType,
  events,
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] = useState(() => (
    getFormFromTicketType(selectedTicketType)
  ));

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSave({
      ...form,
      eventId: Number(form.eventId),
      price: Number(form.price),
      quantity: Number(form.quantity),
    });
  };

  return (
    <form className="form-card management-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="eventId">Event</label>
        <br />
        <select
          id="eventId"
          name="eventId"
          value={form.eventId}
          onChange={handleChange}
          required
        >
          <option value="">Select an event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name">Name</label>
        <br />
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="price">Price</label>
        <br />
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="quantity">Quantity</label>
        <br />
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0"
          step="1"
          value={form.quantity}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-actions">
        <button
          className="button"
          type="submit"
          disabled={saving || events.length === 0}
        >
          {saving
            ? 'Saving...'
            : selectedTicketType
              ? 'Update Ticket Type'
              : 'Create Ticket Type'}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default TicketTypeForm;
