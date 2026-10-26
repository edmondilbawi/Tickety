import * as ticketTypeService from '../services/ticketType.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;

  if (Array.isArray(error.errors)) {
    return response.status(status).json({ errors: error.errors });
  }

  response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const toRequiredNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return Number.NaN;
  }

  return Number(value);
};

const toTicketType = (body = {}) => ({
  eventId: toRequiredNumber(body.eventId),
  name: typeof body.name === 'string' ? body.name.trim() : body.name,
  price: toRequiredNumber(body.price),
  quantity: toRequiredNumber(body.quantity),
});

const getTicketTypes = async (request, response) => {
  try {
    const ticketTypes = await ticketTypeService.getTicketTypes(request.user);
    response.status(200).json(ticketTypes);
  } catch (error) {
    sendError(response, error);
  }
};

const getTicketTypeById = async (request, response) => {
  try {
    const ticketType = await ticketTypeService.getTicketTypeById(
      request.params.id,
      request.user,
    );
    response.status(200).json(ticketType);
  } catch (error) {
    sendError(response, error);
  }
};

const getTicketTypesByEventId = async (request, response) => {
  try {
    const ticketTypes = await ticketTypeService.getTicketTypesByEventId(
      request.params.id,
      request.user,
    );
    response.status(200).json(ticketTypes);
  } catch (error) {
    sendError(response, error);
  }
};

const createTicketType = async (request, response) => {
  try {
    const ticketType = await ticketTypeService.createTicketType(
      toTicketType(request.body),
      request.user.id,
    );
    response.status(201).json(ticketType);
  } catch (error) {
    sendError(response, error);
  }
};

const updateTicketType = async (request, response) => {
  try {
    const ticketType = await ticketTypeService.updateTicketType(
      request.params.id,
      toTicketType(request.body),
      request.user.id,
    );
    response.status(200).json(ticketType);
  } catch (error) {
    sendError(response, error);
  }
};

const deleteTicketType = async (request, response) => {
  try {
    await ticketTypeService.deleteTicketType(
      request.params.id,
      request.user.id,
    );
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
  }
};

export {
  createTicketType,
  deleteTicketType,
  getTicketTypeById,
  getTicketTypes,
  getTicketTypesByEventId,
  updateTicketType,
};
