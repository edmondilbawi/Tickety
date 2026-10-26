import * as ownerService from '../services/owner.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;

  if (Array.isArray(error.errors)) {
    return response.status(status).json({ errors: error.errors });
  }

  return response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const createOrganizer = async (request, response) => {
  try {
    const organizer = await ownerService.createOrganizer(request.body);
    response.status(201).json(organizer);
  } catch (error) {
    sendError(response, error);
  }
};

const getOrganizers = async (request, response) => {
  try {
    const organizers = await ownerService.getOrganizers();
    response.status(200).json(organizers);
  } catch (error) {
    sendError(response, error);
  }
};

const getEvents = async (request, response) => {
  try {
    const events = await ownerService.getEvents(request.query);
    response.status(200).json(events);
  } catch (error) {
    sendError(response, error);
  }
};

const approveEvent = async (request, response) => {
  try {
    const event = await ownerService.approveEvent(
      request.params.id,
      request.user.id,
    );
    response.status(200).json(event);
  } catch (error) {
    sendError(response, error);
  }
};

const rejectEvent = async (request, response) => {
  try {
    const event = await ownerService.rejectEvent(
      request.params.id,
      request.body?.reason,
    );
    response.status(200).json(event);
  } catch (error) {
    sendError(response, error);
  }
};

export {
  approveEvent,
  createOrganizer,
  getEvents,
  getOrganizers,
  rejectEvent,
};
