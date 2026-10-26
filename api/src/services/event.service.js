import * as eventRepository from '../repositories/event.repository.js';
import validateEvent, {
  validateEventFilters,
} from '../validators/event.validator.js';

const MAX_INTEGER = 2147483647;
const FOREIGN_KEY_VIOLATION = '23503';

const notFound = () => {
  const error = new Error('Event not found');
  error.status = 404;
  return error;
};

const validationError = (errors) => {
  const error = new Error('Event validation failed');
  error.status = 400;
  error.errors = errors;
  return error;
};

const forbidden = () => {
  const error = new Error('You do not own this event');
  error.status = 403;
  return error;
};

const deleteConflict = () => {
  const error = new Error('Event cannot be deleted while it has related records');
  error.status = 409;
  return error;
};

const isValidId = (id) => {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 && number <= MAX_INTEGER;
};

const validateEventData = (event) => {
  const errors = validateEvent(event);

  if (errors.length > 0) {
    throw validationError(errors);
  }
};

const toUtcStart = (date) => `${date}T00:00:00.000Z`;

const toUtcExclusiveEnd = (date) => {
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
};

const normalizeEventFilters = (filters = {}) => ({
  search: typeof filters.search === 'string' ? filters.search.trim() : '',
  location:
    typeof filters.location === 'string' ? filters.location.trim() : '',
  category:
    typeof filters.category === 'string'
      ? filters.category.trim().toLowerCase()
      : '',
  status:
    typeof filters.status === 'string'
      ? filters.status.trim().toLowerCase()
      : '',
  from:
    typeof filters.from === 'string' && filters.from.trim()
      ? toUtcStart(filters.from.trim())
      : '',
  toExclusive:
    typeof filters.to === 'string' && filters.to.trim()
      ? toUtcExclusiveEnd(filters.to.trim())
      : '',
});

const getEvents = async (filters = {}) => {
  const errors = validateEventFilters(filters);

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return eventRepository.getPublicEvents(normalizeEventFilters(filters));
};

const getMyEvents = async (organizerId) => {
  return eventRepository.getEventsByOrganizerId(organizerId);
};

const getEventById = async (id, user) => {
  if (!isValidId(id)) {
    throw notFound();
  }

  const event = await eventRepository.getEventById(id);

  if (!event) {
    throw notFound();
  }

  const isPublic = (
    event.status === 'active'
    && event.approvalStatus === 'approved'
    && new Date(event.eventDate).getTime() > Date.now()
  );
  const organizerOwnsEvent = (
    user?.role === 'organizer' && event.organizerId === user.id
  );
  const ownerMayReview = user?.role === 'owner';

  if (!isPublic && !organizerOwnsEvent && !ownerMayReview) {
    throw notFound();
  }

  return event;
};

const createEvent = async (event, organizerId) => {
  validateEventData(event);

  return eventRepository.createEvent({
    ...event,
    organizerId,
  });
};

const updateEvent = async (id, event, organizerId) => {
  validateEventData(event);

  if (!isValidId(id)) {
    throw notFound();
  }

  const existingEvent = await eventRepository.getEventById(id);

  if (!existingEvent) {
    throw notFound();
  }

  if (existingEvent.organizerId !== organizerId) {
    throw forbidden();
  }

  const updatedEvent = await eventRepository.updateEvent(id, event);

  if (!updatedEvent) {
    throw notFound();
  }

  return updatedEvent;
};

const deleteEvent = async (id, organizerId) => {
  if (!isValidId(id)) {
    throw notFound();
  }

  const existingEvent = await eventRepository.getEventById(id);

  if (!existingEvent) {
    throw notFound();
  }

  if (existingEvent.organizerId !== organizerId) {
    throw forbidden();
  }

  try {
    const deletedEvent = await eventRepository.deleteEvent(id);

    if (!deletedEvent) {
      throw notFound();
    }

    return deletedEvent;
  } catch (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw deleteConflict();
    }

    throw error;
  }
};

export {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  getMyEvents,
  updateEvent,
};
