import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../components/EventForm.jsx';
import useAuth from '../context/useAuth.js';
import {
  createEvent,
  getEventById,
  updateEvent,
} from '../services/eventService.js';

function EventFormView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    let cancelled = false;

    const loadEvent = async () => {
      try {
        const data = await getEventById(id);

        if (data.organizerId !== user.id) {
          throw new Error('You do not have permission to edit this event');
        }

        if (!cancelled) {
          setEvent(data);
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

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, user.id]);

  const handleSave = async (eventData) => {
    try {
      setSaving(true);
      setError('');

      if (isEdit) {
        await updateEvent(id, eventData);
      } else {
        await createEvent(eventData);
      }

      navigate('/organizer');
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
        <h1>{isEdit ? 'Edit Event' : 'Create Event'}</h1>
        <p>
          {isEdit
            ? 'Update the details your attendees will see.'
            : 'Add the essential details for your next experience.'}
        </p>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && <p className="notice notice-loading">Loading Event...</p>}

      {!loading && (!isEdit || event) && (
        <EventForm
          key={event?.id ?? 'new'}
          selectedEvent={event}
          onSave={handleSave}
          onCancel={() => navigate('/organizer')}
          saving={saving}
        />
      )}
    </section>
  );
}

export default EventFormView;
