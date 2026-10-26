const getArtworkVariant = (eventId) => {
  const numericId = Number(eventId);
  return Number.isFinite(numericId) ? Math.abs(numericId) % 6 : 0;
};

function EventArtwork({ eventId, eventDate, large = false }) {
  const date = new Date(eventDate);
  const hasDate = !Number.isNaN(date.getTime());

  return (
    <div
      className={`event-artwork artwork-${getArtworkVariant(eventId)}${large ? ' event-artwork-large' : ''}`}
      aria-hidden="true"
    >
      {hasDate && (
        <span className="event-date-badge">
          <strong>{date.toLocaleDateString(undefined, { day: '2-digit' })}</strong>
          <small>{date.toLocaleDateString(undefined, { month: 'short' })}</small>
        </span>
      )}
    </div>
  );
}

export default EventArtwork;
