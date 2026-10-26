import { Link } from 'react-router-dom';

function NotFoundView() {
  return (
    <section className="not-found-page">
      <div className="not-found-art" aria-hidden="true">
        <span>4</span><span className="not-found-ticket">0</span><span>4</span>
      </div>
      <p className="eyebrow">Page not found</p>
      <h1>Looks like this event left early.</h1>
      <p>That page is no longer on the guest list, but there is plenty more to explore.</p>
      <div className="not-found-actions">
        <Link className="button" to="/">Back Home</Link>
        <Link className="button button-secondary" to="/events">Explore Events</Link>
      </div>
    </section>
  );
}

export default NotFoundView;
