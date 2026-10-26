const MAX_INTEGER = 2147483647;
const MAX_PRICE = 99999999.99;

const validateTicketType = (ticketType = {}) => {
  const errors = [];
  const name =
    typeof ticketType.name === 'string' ? ticketType.name.trim() : '';

  if (
    !Number.isInteger(ticketType.eventId) ||
    ticketType.eventId <= 0 ||
    ticketType.eventId > MAX_INTEGER
  ) {
    errors.push('Event ID must be a positive integer');
  }

  if (!name) {
    errors.push('Name is required');
  }

  if (
    !Number.isFinite(ticketType.price)
    || ticketType.price < 0
    || ticketType.price > MAX_PRICE
  ) {
    errors.push(`Price must be a number between 0 and ${MAX_PRICE}`);
  }

  if (
    !Number.isInteger(ticketType.quantity) ||
    ticketType.quantity < 0 ||
    ticketType.quantity > MAX_INTEGER
  ) {
    errors.push('Quantity must be a whole number greater than or equal to 0');
  }

  return errors;
};

export default validateTicketType;
