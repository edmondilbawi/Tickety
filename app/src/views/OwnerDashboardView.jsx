import { useEffect, useState } from 'react';
import formatDateTime from '../utils/formatDateTime.js';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingMessage from '../components/LoadingMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  approveEvent,
  createOrganizer,
  getOrganizers,
  getOwnerEvents,
  rejectEvent,
} from '../services/ownerService.js';

const emptyOrganizerForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

function OwnerDashboardView({ section }) {
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [events, setEvents] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [organizerForm, setOrganizerForm] = useState(emptyOrganizerForm);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isApprovals = section === 'approvals';

  useEffect(() => {
    let cancelled = false;

    const loadSection = async () => {
      try {
        setLoading(true);
        setError('');
        const data = isApprovals
          ? await getOwnerEvents(approvalStatus)
          : await getOrganizers();

        if (!cancelled) {
          if (isApprovals) {
            setEvents(Array.isArray(data) ? data : []);
          } else {
            setOrganizers(Array.isArray(data) ? data : []);
          }
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

    loadSection();
    return () => {
      cancelled = true;
    };
  }, [approvalStatus, isApprovals]);

  const removeReviewedEvent = (eventId) => {
    setEvents((currentEvents) => (
      currentEvents.filter((event) => event.id !== eventId)
    ));
  };

  const handleApprove = async (eventId) => {
    try {
      setError('');
      setMessage('');
      await approveEvent(eventId);
      removeReviewedEvent(eventId);
      setMessage('Event approved. It is public when its lifecycle status is active.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleReject = async (eventId) => {
    try {
      setError('');
      setMessage('');
      await rejectEvent(eventId, rejectionReasons[eventId] || '');
      removeReviewedEvent(eventId);
      setMessage('Event rejected and remains hidden from public discovery.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleOrganizerChange = (event) => {
    const { name, value } = event.target;
    setOrganizerForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleCreateOrganizer = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const organizer = await createOrganizer(organizerForm);
      setOrganizers((currentOrganizers) => [
        { ...organizer, eventCount: 0 },
        ...currentOrganizers,
      ]);
      setOrganizerForm(emptyOrganizerForm);
      setMessage('Organizer account created successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="page-heading page-heading-actions dashboard-heading">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1>{isApprovals ? 'Event Approvals' : 'Organizer Accounts'}</h1>
          <p>
            {isApprovals
              ? 'Review Event details and ticket inventory before publication.'
              : 'Create and review the Organizer accounts managed by Tickety.'}
          </p>
        </div>
      </div>

      <nav className="owner-tabs" aria-label="Owner dashboard sections">
        <Link className={isApprovals ? 'active' : ''} to="/owner/approvals">
          Event Approvals
        </Link>
        <Link className={!isApprovals ? 'active' : ''} to="/owner/organizers">
          Organizers
        </Link>
      </nav>

      <ErrorMessage message={error} />
      {message && <p className="notice notice-success">{message}</p>}

      {isApprovals ? (
        <>
          <div className="approval-filter">
            <label htmlFor="approvalStatus">Approval status</label>
            <select
              id="approvalStatus"
              value={approvalStatus}
              onChange={(event) => {
                setMessage('');
                setApprovalStatus(event.target.value);
              }}
            >
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {loading && <LoadingMessage message="Loading Events for review..." />}
          {!loading && !error && events.length === 0 && (
            <EmptyState title={`No ${approvalStatus} Events`}>
              Select another approval status to review earlier decisions.
            </EmptyState>
          )}

          {!loading && events.length > 0 && (
            <div className="approval-list">
              {events.map((event) => (
                <article className="card approval-card" key={event.id}>
                  <div className="card-heading">
                    <div>
                      <p className="eyebrow">{event.organizerFirstName} {event.organizerLastName}</p>
                      <h2>{event.title}</h2>
                      <p>{event.organizerEmail}</p>
                    </div>
                    <StatusBadge status={event.approvalStatus} />
                  </div>

                  <dl className="event-meta event-meta-wide">
                    <div><dt>Location</dt><dd>{event.location}</dd></div>
                    <div><dt>Category</dt><dd>{event.category || 'other'}</dd></div>
                    <div><dt>Date</dt><dd>{formatDateTime(event.eventDate)}</dd></div>
                    <div><dt>Lifecycle</dt><dd><StatusBadge status={event.status} /></dd></div>
                  </dl>
                  <p className="event-description">
                    {event.description || 'No description provided.'}
                  </p>

                  <div className="approval-ticket-list">
                    <h3>Ticket Types</h3>
                    {!Array.isArray(event.ticketTypes) || event.ticketTypes.length === 0 ? (
                      <p>No Ticket Types have been added.</p>
                    ) : event.ticketTypes.map((ticketType) => (
                      <span key={ticketType.id}>
                        <strong>{ticketType.name}</strong>
                        ${Number(ticketType.price).toFixed(2)} / {ticketType.quantity} available
                      </span>
                    ))}
                  </div>

                  {event.rejectionReason && (
                    <p className="notice notice-error">Reason: {event.rejectionReason}</p>
                  )}

                  {event.approvalStatus === 'pending' && (
                    <div className="approval-actions">
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleApprove(event.id)}
                      >
                        Approve Event
                      </button>
                      <div>
                        <label htmlFor={`reason-${event.id}`}>Rejection reason</label>
                        <textarea
                          id={`reason-${event.id}`}
                          maxLength="500"
                          value={rejectionReasons[event.id] || ''}
                          onChange={(changeEvent) => setRejectionReasons((current) => ({
                            ...current,
                            [event.id]: changeEvent.target.value,
                          }))}
                        />
                        <button
                          className="button button-danger"
                          type="button"
                          onClick={() => handleReject(event.id)}
                        >
                          Reject Event
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="owner-organizer-layout">
          <form className="form-card management-form" onSubmit={handleCreateOrganizer}>
            <h2>Create Organizer</h2>
            <p className="muted">Only Owners can create Organizer accounts.</p>
            <div className="two-column-fields">
              <div>
                <label htmlFor="organizerFirstName">First name</label>
                <input id="organizerFirstName" name="firstName" value={organizerForm.firstName} onChange={handleOrganizerChange} required />
              </div>
              <div>
                <label htmlFor="organizerLastName">Last name</label>
                <input id="organizerLastName" name="lastName" value={organizerForm.lastName} onChange={handleOrganizerChange} required />
              </div>
            </div>
            <div>
              <label htmlFor="organizerEmail">Email</label>
              <input id="organizerEmail" name="email" type="email" value={organizerForm.email} onChange={handleOrganizerChange} required />
            </div>
            <div>
              <label htmlFor="organizerPassword">Temporary password</label>
              <input id="organizerPassword" name="password" type="password" minLength="12" value={organizerForm.password} onChange={handleOrganizerChange} required />
              <small className="field-hint">12+ characters with uppercase, lowercase, number and symbol.</small>
            </div>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'Creating Organizer...' : 'Create Organizer'}
            </button>
          </form>

          <section aria-labelledby="organizers-list">
            <div className="section-heading">
              <h2 id="organizers-list">Organizers</h2>
              <span>{organizers.length} total</span>
            </div>
            {loading && <LoadingMessage message="Loading Organizers..." />}
            {!loading && !error && organizers.length === 0 ? (
              <EmptyState title="No Organizers yet">
                Create the first Organizer account using this form.
              </EmptyState>
            ) : !loading && organizers.length > 0 ? (
              <div className="organizer-list">
                {organizers.map((organizer) => (
                  <article className="card" key={organizer.id}>
                    <h3>{organizer.firstName} {organizer.lastName}</h3>
                    <p>{organizer.email}</p>
                    <strong>{organizer.eventCount || 0} Events</strong>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}

export default OwnerDashboardView;
