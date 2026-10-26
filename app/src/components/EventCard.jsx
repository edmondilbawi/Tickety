import { Link } from 'react-router-dom';
import formatDateTime from '../utils/formatDateTime.js';
import EventArtwork from './EventArtwork.jsx';
import StatusBadge from './StatusBadge.jsx';

function EventCard({
  event,
  canManage = false,
  onDelete,
  interested = false,
  onToggleInterest,
}) {
  return (
    <article className="card event-card">
      <EventArtwork eventId={event.id} eventDate={event.eventDate} />
      <div className="event-card-body">
        <div className="card-heading">
          <div>
            <p className="event-category">{event.category || 'other'}</p>
            <h2>{event.title}</h2>
          </div>
          <StatusBadge status={event.status} />
        </div>

        <p className="event-description">
          {event.description || 'No description provided.'}
        </p>

        <dl className="event-meta">
          <div>
            <dt>Location</dt>
            <dd>{event.location}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDateTime(event.eventDate)}</dd>
          </div>
        </dl>

        <div className="card-actions">
          <Link className="button" to={`/events/${event.id}`}>
            View Event
          </Link>
          {onToggleInterest && (
            <button
              className={`button button-interest${interested ? ' is-interested' : ''}`}
              type="button"
              onClick={() => onToggleInterest(event.id, interested)}
              aria-pressed={interested}
            >
              <span aria-hidden="true">{interested ? '♥' : '♡'}</span>
              Interested
            </button>
          )}
          {canManage && (
            <>
              <Link
                className="button button-secondary"
                to={`/events/${event.id}/edit`}
              >
                Edit
              </Link>
              <Link
                className="button button-secondary"
                to={`/ticket-types?eventId=${event.id}`}
              >
                Manage Tickets
              </Link>
              {onDelete && (
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => onDelete(event.id)}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default EventCard;
