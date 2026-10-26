import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TicketTypeForm from '../components/TicketTypeForm.jsx';
import useAuth from '../context/useAuth.js';
import { getMyEvents } from '../services/eventService.js';
import {
  createTicketType,
  getTicketTypeById,
  updateTicketType,
} from '../services/ticketTypeService.js';

function TicketTypeFormView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [ticketType, setTicketType] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadFormData = async () => {
      try {
        const [eventData, ticketTypeData] = await Promise.all([
          getMyEvents(),
          isEdit ? getTicketTypeById(id) : Promise.resolve(null),
        ]);
        const ownedEvents = Array.isArray(eventData) ? eventData : [];

        if (
          ticketTypeData &&
          !ownedEvents.some((event) => event.id === ticketTypeData.eventId)
        ) {
          throw new Error(
            'You do not have permission to edit this ticket type',
          );
        }

        if (!cancelled) {
          setEvents(ownedEvents);
          setTicketType(ticketTypeData);
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

    loadFormData();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, user.id]);

  const handleSave = async (ticketTypeData) => {
    try {
      setSaving(true);
      setError('');

      if (isEdit) {
        await updateTicketType(id, ticketTypeData);
      } else {
        await createTicketType(ticketTypeData);
      }

      navigate('/ticket-types');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-page">
      <div className="form-page-heading">
        <p className="eyebrow">Organizer tools</p>
        <h1>{isEdit ? 'Edit Ticket Type' : 'Create Ticket Type'}</h1>
        <p>Set the Ticket Type name, price, and available quantity.</p>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && (
        <p className="notice notice-loading">Loading Ticket Type form...</p>
      )}
      {!loading && events.length === 0 && (
        <p className="notice notice-info">
          Create an Event before creating a Ticket Type.
        </p>
      )}

      {!loading && (!isEdit || ticketType) && (
        <TicketTypeForm
          key={ticketType?.id ?? 'new'}
          selectedTicketType={ticketType}
          events={events}
          onSave={handleSave}
          onCancel={() => navigate('/ticket-types')}
          saving={saving}
        />
      )}
    </section>
  );
}

export default TicketTypeFormView;
