const requireOrganizer = (request, response, next) => {
  if (request.user.role !== 'organizer') {
    return response.status(403).json({
      message: 'Organizer access is required',
    });
  }

  return next();
};

const requireCustomer = (request, response, next) => {
  if (request.user.role !== 'customer') {
    return response.status(403).json({
      message: 'Customer access is required',
    });
  }

  return next();
};

const requireOwner = (request, response, next) => {
  if (request.user.role !== 'owner') {
    return response.status(403).json({
      message: 'Owner access is required',
    });
  }

  return next();
};

export { requireCustomer, requireOrganizer, requireOwner };
