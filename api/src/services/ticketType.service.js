import * as eventRepository from '../repositories/event.repository.js';
import * as ticketTypeRepository from '../repositories/ticketType.repository.js';
import validateTicketType from '../validators/ticketType.validator.js';

const MAX_INTEGER = 2147483647;
const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';

const createError = (message, status, errors) => {
  const error = new Error(message);
  error.status = status;
  error.errors = errors;
  return error;
};

const notFound = () => createError('Ticket type not found', 404);
const invalidEvent = () => createError('The selected event does not exist', 400);
const forbidden = () => createError('You do not own the related event', 403);
const duplicateTicketType = () => createError(
  'A ticket type with this name already exists for the selected event',
  409,
);
const deleteConflict = () => createError(
  'Ticket type cannot be deleted while it has related booking items',
  409,
);

const isValidId = (id) => {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 && number <= MAX_INTEGER;
};

const validateTicketTypeData = (ticketType) => {
  const errors = validateTicketType(ticketType);

  if (errors.length > 0) {
    throw createError('Ticket type validation failed', 400, errors);
  }
};

const ensureOwnedEvent = async (eventId, organizerId) => {
  const event = await eventRepository.getEventById(eventId);

  if (!event) {
    throw invalidEvent();
  }

  if (event.organizerId !== organizerId) {
    throw forbidden();
  }

  return event;
};

const translateWriteError = (error) => {
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return invalidEvent();
  }

  if (error.code === UNIQUE_VIOLATION) {
    return duplicateTicketType();
  }

  return error;
};

const canReadEvent = (event, user) => {
  const isPublic = (
    event.status === 'active'
    && event.approvalStatus === 'approved'
    && new Date(event.eventDate).getTime() > Date.now()
  );
  const organizerOwnsEvent = (
    user?.role === 'organizer' && event.organizerId === user.id
  );

  return isPublic || organizerOwnsEvent || user?.role === 'owner';
};

const getTicketTypes = async (user) => {
  if (user?.role === 'organizer') {
    return ticketTypeRepository.getTicketTypesByOrganizerId(user.id);
  }

  if (user?.role === 'owner') {
    return ticketTypeRepository.getAllTicketTypes();
  }

  return ticketTypeRepository.getPublicTicketTypes();
};

const getTicketTypeById = async (id, user) => {
  if (!isValidId(id)) {
    throw notFound();
  }

  const ticketType = await ticketTypeRepository.getTicketTypeWithEvent(id);

  if (!ticketType || !canReadEvent({
    organizerId: ticketType.organizerId,
    status: ticketType.eventStatus,
    approvalStatus: ticketType.approvalStatus,
    eventDate: ticketType.eventDate,
  }, user)) {
    throw notFound();
  }

  const {
    organizerId,
    eventStatus,
    approvalStatus,
    eventDate,
    ...safeTicketType
  } = ticketType;

  return safeTicketType;
};

const getTicketTypesByEventId = async (eventId, user) => {
  if (!isValidId(eventId)) {
    throw createError('Event not found', 404);
  }

  const event = await eventRepository.getEventById(eventId);

  if (!event || !canReadEvent(event, user)) {
    throw createError('Event not found', 404);
  }

  return ticketTypeRepository.getTicketTypesByEventId(eventId);
};

const runMutation = async (mutate, eventIds) => {
  const client = await ticketTypeRepository.acquireClient();
  let transactionOpen = false;

  try {
    await ticketTypeRepository.beginTransaction(client);
    transactionOpen = true;
    const result = await mutate(client);
    await eventRepository.resetApproval(eventIds, client);
    await ticketTypeRepository.commitTransaction(client);
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      await ticketTypeRepository.rollbackTransaction(client);
    }

    throw error;
  } finally {
    client.release();
  }
};

const createTicketType = async (ticketType, organizerId) => {
  validateTicketTypeData(ticketType);
  await ensureOwnedEvent(ticketType.eventId, organizerId);

  try {
    return await runMutation(
      (client) => ticketTypeRepository.createTicketType(ticketType, client),
      [ticketType.eventId],
    );
  } catch (error) {
    throw translateWriteError(error);
  }
};

const updateTicketType = async (id, ticketType, organizerId) => {
  validateTicketTypeData(ticketType);

  if (!isValidId(id)) {
    throw notFound();
  }

  const existingTicketType = await ticketTypeRepository.getTicketTypeById(id);

  if (!existingTicketType) {
    throw notFound();
  }

  await ensureOwnedEvent(existingTicketType.eventId, organizerId);

  if (ticketType.eventId !== existingTicketType.eventId) {
    await ensureOwnedEvent(ticketType.eventId, organizerId);
  }

  try {
    const updatedTicketType = await runMutation(
      (client) => ticketTypeRepository.updateTicketType(id, ticketType, client),
      [existingTicketType.eventId, ticketType.eventId],
    );

    if (!updatedTicketType) {
      throw notFound();
    }

    return updatedTicketType;
  } catch (error) {
    throw translateWriteError(error);
  }
};

const deleteTicketType = async (id, organizerId) => {
  if (!isValidId(id)) {
    throw notFound();
  }

  const existingTicketType = await ticketTypeRepository.getTicketTypeById(id);

  if (!existingTicketType) {
    throw notFound();
  }

  await ensureOwnedEvent(existingTicketType.eventId, organizerId);

  try {
    const deletedTicketType = await runMutation(
      (client) => ticketTypeRepository.deleteTicketType(id, client),
      [existingTicketType.eventId],
    );

    if (!deletedTicketType) {
      throw notFound();
    }

    return deletedTicketType;
  } catch (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw deleteConflict();
    }

    throw error;
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
