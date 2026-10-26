const EVENT_STATUSES = ['draft', 'active', 'cancelled'];
const EVENT_CATEGORIES = [
  'concert',
  'festival',
  'theater',
  'sports',
  'conference',
  'workshop',
  'other',
];
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const validateEvent = (event = {}) => {
  const errors = [];
  const title = typeof event.title === 'string' ? event.title.trim() : '';
  const location =
    typeof event.location === 'string' ? event.location.trim() : '';
  const category =
    typeof event.category === 'string' ? event.category.trim().toLowerCase() : '';
  const status = typeof event.status === 'string' ? event.status.trim() : '';
  const eventDate = new Date(event.eventDate);

  if (!title) {
    errors.push('Title is required');
  }

  if (
    event.description !== null
    && event.description !== undefined
    && typeof event.description !== 'string'
  ) {
    errors.push('Description must be text');
  }

  if (!location) {
    errors.push('Location is required');
  }

  if (!category) {
    errors.push('Category is required');
  } else if (!EVENT_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${EVENT_CATEGORIES.join(', ')}`);
  }

  if (!event.eventDate || Number.isNaN(eventDate.getTime())) {
    errors.push('Event date must be a valid date');
  }

  if (!status) {
    errors.push('Status is required');
  } else if (!EVENT_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${EVENT_STATUSES.join(', ')}`);
  }

  return errors;
};

const validateEventFilters = (filters = {}) => {
  const errors = [];

  ['search', 'location', 'category', 'status', 'from', 'to'].forEach((name) => {
    if (
      filters[name] !== undefined
      && filters[name] !== null
      && typeof filters[name] !== 'string'
    ) {
      errors.push(`${name} filter must be text`);
    }
  });

  const category = typeof filters.category === 'string'
    ? filters.category.trim().toLowerCase()
    : '';
  const status = typeof filters.status === 'string'
    ? filters.status.trim().toLowerCase()
    : '';
  const from = typeof filters.from === 'string' ? filters.from.trim() : '';
  const to = typeof filters.to === 'string' ? filters.to.trim() : '';

  if (category && !EVENT_CATEGORIES.includes(category)) {
    errors.push(`Category filter must be one of: ${EVENT_CATEGORIES.join(', ')}`);
  }

  if (status && !EVENT_STATUSES.includes(status)) {
    errors.push(`Status filter must be one of: ${EVENT_STATUSES.join(', ')}`);
  }

  if (from && !isValidDateOnly(from)) {
    errors.push('From date must use YYYY-MM-DD and be a valid date');
  }

  if (to && !isValidDateOnly(to)) {
    errors.push('To date must use YYYY-MM-DD and be a valid date');
  }

  if (from && to && isValidDateOnly(from) && isValidDateOnly(to) && from > to) {
    errors.push('From date must be before or equal to To date');
  }

  return errors;
};

export { EVENT_CATEGORIES, validateEventFilters };
export default validateEvent;
