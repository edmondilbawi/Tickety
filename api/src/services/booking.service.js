import * as defaultBookingRepository from '../repositories/booking.repository.js';
import validateBooking from '../validators/booking.validator.js';
import {
  sendBookingCancellation as defaultSendBookingCancellation,
  sendBookingConfirmation as defaultSendBookingConfirmation,
} from './email.service.js';

const MAX_INTEGER = 2147483647;

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validationError = (errors) => {
  const error = createError('Booking validation failed', 400);
  error.errors = errors;
  return error;
};

const isValidId = (id) => {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 && number <= MAX_INTEGER;
};

const toBookings = (rows) => {
  const bookingsById = new Map();

  rows.forEach((row) => {
    if (!bookingsById.has(row.bookingId)) {
      bookingsById.set(row.bookingId, {
        id: row.bookingId,
        userId: row.userId,
        bookingDate: row.bookingDate,
        status: row.status,
        canCancel: (
          row.status === 'confirmed'
          && new Date(row.eventDate).getTime() > Date.now()
        ),
        customer: {
          firstName: row.customerFirstName,
          lastName: row.customerLastName,
          email: row.customerEmail,
        },
        event: {
          id: row.eventId,
          title: row.eventTitle,
          location: row.eventLocation,
          eventDate: row.eventDate,
          status: row.eventStatus,
        },
        items: [],
        total: 0,
      });
    }

    const booking = bookingsById.get(row.bookingId);
    booking.items.push({
      id: row.itemId,
      ticketTypeId: row.ticketTypeId,
      name: row.ticketTypeName,
      quantity: row.quantity,
      price: row.price,
    });
    booking.total += row.quantity * row.price;
  });

  return Array.from(bookingsById.values());
};

const getBookingFromRows = (rows) => toBookings(rows)[0];

const createBookingWithDependencies = async (
  bookingData,
  customerId,
  bookingRepository,
  sendBookingConfirmation,
) => {
  const errors = validateBooking(bookingData);

  if (errors.length > 0) {
    throw validationError(errors);
  }

  // A consistent lock order reduces deadlock risk for multi-item Bookings.
  const requestedItems = [...bookingData.items].sort(
    (first, second) => first.ticketTypeId - second.ticketTypeId,
  );
  const ticketTypeIds = requestedItems.map((item) => item.ticketTypeId);
  const client = await bookingRepository.acquireClient();
  let transactionOpen = false;
  let completedBooking;

  try {
    await bookingRepository.beginTransaction(client);
    transactionOpen = true;

    const ticketTypes = await bookingRepository.getTicketTypesForBooking(
      client,
      ticketTypeIds,
    );

    if (ticketTypes.length !== requestedItems.length) {
      throw createError('One or more ticket types were not found', 404);
    }

    const eventId = ticketTypes[0].eventId;

    if (ticketTypes.some((ticketType) => ticketType.eventId !== eventId)) {
      throw createError(
        'All ticket types in a booking must belong to the same event',
        400,
      );
    }

    if (new Date(ticketTypes[0].eventDate).getTime() <= Date.now()) {
      throw createError('Past events cannot be booked', 409);
    }

    if (
      ticketTypes[0].eventStatus !== 'active'
      || ticketTypes[0].approvalStatus !== 'approved'
    ) {
      throw createError('Event is not available for booking', 409);
    }

    const ticketTypesById = new Map(
      ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
    );

    requestedItems.forEach((item) => {
      const ticketType = ticketTypesById.get(item.ticketTypeId);

      if (item.quantity > ticketType.quantity) {
        throw createError(
          `Not enough tickets available for ${ticketType.name}`,
          409,
        );
      }
    });

    const booking = await bookingRepository.createBooking(client, customerId);

    for (const item of requestedItems) {
      const ticketType = ticketTypesById.get(item.ticketTypeId);

      // The price snapshot comes from the locked database row, not the browser.
      await bookingRepository.createBookingItem(client, booking.id, {
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        price: ticketType.price,
      });

      const updatedTicketType = await bookingRepository.decreaseTicketQuantity(
        client,
        item.ticketTypeId,
        item.quantity,
      );

      if (!updatedTicketType) {
        throw createError(
          `Not enough tickets available for ${ticketType.name}`,
          409,
        );
      }
    }

    const rows = await bookingRepository.getBookingRowsById(
      booking.id,
      client,
    );

    await bookingRepository.commitTransaction(client);
    transactionOpen = false;
    completedBooking = getBookingFromRows(rows);
  } catch (error) {
    if (transactionOpen) {
      await bookingRepository.rollbackTransaction(client);
    }

    throw error;
  } finally {
    client.release();
  }

  await sendBookingConfirmation(completedBooking);
  return completedBooking;
};

const getMyBookingsWithDependencies = async (customerId, bookingRepository) => {
  const rows = await bookingRepository.getBookingRowsByUserId(customerId);
  return toBookings(rows);
};

const getOrganizerBookingsWithDependencies = async (
  organizerId,
  bookingRepository,
) => {
  const rows = await bookingRepository.getBookingRowsByOrganizerId(organizerId);
  return toBookings(rows);
};

const getBookingByIdWithDependencies = async (id, user, bookingRepository) => {
  if (!isValidId(id)) {
    throw createError('Booking not found', 404);
  }

  const rows = await bookingRepository.getBookingRowsById(id);
  const booking = getBookingFromRows(rows);

  if (!booking) {
    throw createError('Booking not found', 404);
  }

  const customerOwnsBooking = (
    user.role === 'customer' && booking.userId === user.id
  );
  const organizerOwnsEvent = (
    user.role === 'organizer' && rows[0].organizerId === user.id
  );

  if (!customerOwnsBooking && !organizerOwnsEvent) {
    throw createError('You do not have permission to view this booking', 403);
  }

  return booking;
};

const cancelBookingWithDependencies = async (
  id,
  customerId,
  bookingRepository,
  sendBookingCancellation,
) => {
  if (!isValidId(id)) {
    throw createError('Booking not found', 404);
  }

  const bookingId = Number(id);
  const client = await bookingRepository.acquireClient();
  let transactionOpen = false;
  let completedBooking;

  try {
    await bookingRepository.beginTransaction(client);
    transactionOpen = true;

    const booking = await bookingRepository.getBookingForUpdate(
      client,
      bookingId,
    );

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.userId !== customerId) {
      throw createError('You do not own this booking', 403);
    }

    if (booking.status !== 'confirmed') {
      throw createError('Booking is already cancelled', 409);
    }

    const bookingRows = await bookingRepository.getBookingRowsById(
      bookingId,
      client,
    );

    if (
      bookingRows.length === 0
      || new Date(bookingRows[0].eventDate).getTime() <= Date.now()
    ) {
      throw createError('Past event bookings cannot be cancelled', 409);
    }

    const items = await bookingRepository.getBookingItemsForCancellation(
      client,
      bookingId,
    );

    for (const item of items) {
      await bookingRepository.restoreTicketQuantity(
        client,
        item.ticketTypeId,
        item.quantity,
      );
    }

    const cancelledBooking = await bookingRepository.markBookingCancelled(
      client,
      bookingId,
    );

    if (!cancelledBooking) {
      throw createError('Booking is already cancelled', 409);
    }

    const rows = await bookingRepository.getBookingRowsById(bookingId, client);

    await bookingRepository.commitTransaction(client);
    transactionOpen = false;
    completedBooking = getBookingFromRows(rows);
  } catch (error) {
    if (transactionOpen) {
      await bookingRepository.rollbackTransaction(client);
    }

    throw error;
  } finally {
    client.release();
  }

  await sendBookingCancellation(completedBooking);
  return completedBooking;
};

const createBookingService = ({
  bookingRepository = defaultBookingRepository,
  sendBookingCancellation = defaultSendBookingCancellation,
  sendBookingConfirmation = defaultSendBookingConfirmation,
} = {}) => ({
  createBooking: (bookingData, customerId) => createBookingWithDependencies(
    bookingData,
    customerId,
    bookingRepository,
    sendBookingConfirmation,
  ),
  getMyBookings: (customerId) => getMyBookingsWithDependencies(
    customerId,
    bookingRepository,
  ),
  getOrganizerBookings: (organizerId) => getOrganizerBookingsWithDependencies(
    organizerId,
    bookingRepository,
  ),
  getBookingById: (id, user) => getBookingByIdWithDependencies(
    id,
    user,
    bookingRepository,
  ),
  cancelBooking: (id, customerId) => cancelBookingWithDependencies(
    id,
    customerId,
    bookingRepository,
    sendBookingCancellation,
  ),
});

const {
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  getOrganizerBookings,
} = createBookingService();

export {
  cancelBooking,
  createBooking,
  createBookingService,
  getBookingById,
  getMyBookings,
  getOrganizerBookings,
};
