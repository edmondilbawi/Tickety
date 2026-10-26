const MAX_INTEGER = 2147483647;

const isPositiveInteger = (value) => (
  Number.isInteger(value) && value > 0 && value <= MAX_INTEGER
);

const validateBooking = (booking = {}) => {
  const errors = [];

  if (booking.items === undefined || booking.items === null) {
    errors.push('Items are required');
    return errors;
  }

  if (!Array.isArray(booking.items)) {
    errors.push('Items must be an array');
    return errors;
  }

  if (booking.items.length === 0) {
    errors.push('At least one booking item is required');
    return errors;
  }

  const ticketTypeIds = new Set();

  booking.items.forEach((item, index) => {
    const itemNumber = index + 1;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${itemNumber} must be an object`);
      return;
    }

    if (!isPositiveInteger(item.ticketTypeId)) {
      errors.push(`Item ${itemNumber} ticket type ID must be a positive integer`);
    } else if (ticketTypeIds.has(item.ticketTypeId)) {
      errors.push(`Ticket type ID ${item.ticketTypeId} is duplicated`);
    } else {
      ticketTypeIds.add(item.ticketTypeId);
    }

    if (!isPositiveInteger(item.quantity)) {
      errors.push(`Item ${itemNumber} quantity must be a positive integer`);
    }
  });

  return errors;
};

export default validateBooking;
