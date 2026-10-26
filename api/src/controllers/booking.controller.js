import * as bookingService from '../services/booking.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;

  if (Array.isArray(error.errors)) {
    return response.status(status).json({ errors: error.errors });
  }

  return response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const toRequiredNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return Number.NaN;
  }

  return Number(value);
};

const toBooking = (body = {}) => ({
  items: Array.isArray(body.items)
    ? body.items.map((item) => ({
      ticketTypeId: toRequiredNumber(item?.ticketTypeId),
      quantity: toRequiredNumber(item?.quantity),
    }))
    : body.items,
});

const createBooking = async (request, response) => {
  try {
    const booking = await bookingService.createBooking(
      toBooking(request.body),
      request.user.id,
    );
    response.status(201).json(booking);
  } catch (error) {
    sendError(response, error);
  }
};

const getMyBookings = async (request, response) => {
  try {
    const bookings = await bookingService.getMyBookings(request.user.id);
    response.status(200).json(bookings);
  } catch (error) {
    sendError(response, error);
  }
};

const getOrganizerBookings = async (request, response) => {
  try {
    const bookings = await bookingService.getOrganizerBookings(request.user.id);
    response.status(200).json(bookings);
  } catch (error) {
    sendError(response, error);
  }
};

const getBookingById = async (request, response) => {
  try {
    const booking = await bookingService.getBookingById(
      request.params.id,
      request.user,
    );
    response.status(200).json(booking);
  } catch (error) {
    sendError(response, error);
  }
};

const cancelBooking = async (request, response) => {
  try {
    const booking = await bookingService.cancelBooking(
      request.params.id,
      request.user.id,
    );
    response.status(200).json(booking);
  } catch (error) {
    sendError(response, error);
  }
};

export {
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  getOrganizerBookings,
};
