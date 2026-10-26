import * as eventRepository from '../repositories/event.repository.js';
import * as interestRepository from '../repositories/interest.repository.js';

const MAX_INTEGER = 2147483647;

const notFound = () => {
  const error = new Error('Event not found');
  error.status = 404;
  return error;
};

const toEventId = (value) => {
  const eventId = Number(value);

  if (
    !Number.isInteger(eventId)
    || eventId <= 0
    || eventId > MAX_INTEGER
  ) {
    throw notFound();
  }

  return eventId;
};

const getMyInterests = async (userId) => {
  return interestRepository.getVisibleInterestsByUserId(userId);
};

const addInterest = async (userId, rawEventId) => {
  const eventId = toEventId(rawEventId);
  const event = await eventRepository.getPublicEventById(eventId);

  if (!event) {
    throw notFound();
  }

  return interestRepository.addInterest(userId, eventId);
};

const deleteInterest = async (userId, rawEventId) => {
  const eventId = toEventId(rawEventId);
  await interestRepository.deleteInterest(userId, eventId);
};

export { addInterest, deleteInterest, getMyInterests };
