import { useState } from 'react';
import EVENT_CATEGORIES from '../constants/eventCategories.js';

const toDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getFormFromEvent = (event) => ({
  title: event?.title ?? '',
  description: event?.description ?? '',
  location: event?.location ?? '',
  category: event?.category ?? 'other',
  eventDate: toDateTimeLocal(event?.eventDate),
  status: event?.status ?? 'draft',
});

function EventForm({ selectedEvent, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => getFormFromEvent(selectedEvent));

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parsedEventDate = new Date(form.eventDate);
    const eventDate =
      form.eventDate && !Number.isNaN(parsedEventDate.getTime())
        ? parsedEventDate.toISOString()
        : form.eventDate;

    await onSave({
      ...form,
      eventDate,
    });
  };

  return (
    <form className="form-card management-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <br />
        <input
          id="title"
          name="title"
          type="text"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <br />
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Tell attendees what makes this event worth attending"
        />
      </div>

      <div>
        <label htmlFor="location">Location</label>
        <br />
        <input
          id="location"
          name="location"
          type="text"
          value={form.location}
          onChange={handleChange}
          placeholder="Venue or city"
          required
        />
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <br />
        <select
          id="category"
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          {EVENT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="eventDate">Event date</label>
        <br />
        <input
          id="eventDate"
          name="eventDate"
          type="datetime-local"
          value={form.eventDate}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="status">Status</label>
        <br />
        <select
          id="status"
          name="status"
          value={form.status}
          onChange={handleChange}
          required
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="form-actions">
        <button className="button" type="submit" disabled={saving}>
          {saving
            ? 'Saving...'
            : selectedEvent
              ? 'Update Event'
              : 'Create Event'}
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

export default EventForm;
