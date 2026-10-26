import * as authService from './auth.service.js';
import * as ownerRepository from '../repositories/owner.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import {
  sendEventApproved,
  sendEventRejected,
  sendOrganizerWelcome,
} from './email.service.js';
import {
  validateApprovalStatus,
  validateRejectionReason,
} from '../validators/owner.validator.js';

const MAX_INTEGER = 2147483647;

const createError = (message, status, errors) => {
  const error = new Error(message);
  error.status = status;
  error.errors = errors;
  return error;
};

const isValidId = (id) => {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 && number <= MAX_INTEGER;
};

const createOrganizer = async (registrationData) => {
  const organizer = await authService.createAccount(registrationData, 'organizer');

  await sendOrganizerWelcome(organizer);
  return organizer;
};

const getOrganizers = async () => userRepository.getOrganizers();

const getEvents = async (filters = {}) => {
  const approvalStatus = typeof filters.approvalStatus === 'string'
    ? filters.approvalStatus.trim().toLowerCase()
    : 'pending';
  const errors = validateApprovalStatus(approvalStatus);

  if (errors.length > 0) {
    throw createError('Owner Event filter validation failed', 400, errors);
  }

  return ownerRepository.getEventsByApprovalStatus(approvalStatus);
};

const approveEvent = async (id, ownerId) => {
  if (!isValidId(id)) {
    throw createError('Event not found', 404);
  }

  const event = await ownerRepository.approveEvent(Number(id), ownerId);

  if (!event) {
    throw createError('Event not found', 404);
  }

  await sendEventApproved(event);

  const { organizerFirstName, organizerEmail, ...publicEvent } = event;
  return publicEvent;
};

const rejectEvent = async (id, rawReason) => {
  if (!isValidId(id)) {
    throw createError('Event not found', 404);
  }

  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
  const errors = validateRejectionReason(reason);

  if (errors.length > 0) {
    throw createError('Event rejection validation failed', 400, errors);
  }

  const event = await ownerRepository.rejectEvent(Number(id), reason);

  if (!event) {
    throw createError('Event not found', 404);
  }

  await sendEventRejected(event);

  const { organizerFirstName, organizerEmail, ...publicEvent } = event;
  return publicEvent;
};

export {
  approveEvent,
  createOrganizer,
  getEvents,
  getOrganizers,
  rejectEvent,
};
