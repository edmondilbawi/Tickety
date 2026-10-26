import * as eventService from '../services/event.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;

  if (Array.isArray(error.errors)) {
    return response.status(status).json({ errors: error.errors });
  }

  response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const toEvent = (body = {}) => ({
  title: typeof body.title === 'string' ? body.title.trim() : body.title,
  description:
    typeof body.description === 'string'
      ? body.description.trim() || null
      : body.description ?? null,
  location:
    typeof body.location === 'string' ? body.location.trim() : body.location,
  category:
    typeof body.category === 'string'
      ? body.category.trim().toLowerCase()
      : body.category,
  eventDate: body.eventDate,
  status:
    typeof body.status === 'string'
      ? body.status.trim().toLowerCase()
      : body.status,
});

const getEvents = async (request, response) => {
  try {
    const events = await eventService.getEvents(request.query);
    response.status(200).json(events);
  } catch (error) {
    sendError(response, error);
  }
};

const getMyEvents = async (request, response) => {
  try {
    const events = await eventService.getMyEvents(request.user.id);
    response.status(200).json(events);
  } catch (error) {
    sendError(response, error);
  }
};

const getEventById = async (request, response) => {
  try {
    const event = await eventService.getEventById(
      request.params.id,
      request.user,
    );
    response.status(200).json(event);
  } catch (error) {
    sendError(response, error);
  }
};

const createEvent = async (request, response) => {
  try {
    const event = await eventService.createEvent(
      toEvent(request.body),
      request.user.id,
    );
    response.status(201).json(event);
  } catch (error) {
    sendError(response, error);
  }
};

const updateEvent = async (request, response) => {
  try {
    const event = await eventService.updateEvent(
      request.params.id,
      toEvent(request.body),
      request.user.id,
    );
    response.status(200).json(event);
  } catch (error) {
    sendError(response, error);
  }
};

const deleteEvent = async (request, response) => {
  try {
    await eventService.deleteEvent(request.params.id, request.user.id);
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
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
