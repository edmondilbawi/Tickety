import jwt from 'jsonwebtoken';
import * as userRepository from '../repositories/user.repository.js';

const unauthorized = (response, message = 'Authentication required') => {
  response.status(401).json({ message });
};

const authenticate = async (request, response, next) => {
  const authorization = request.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return unauthorized(response);
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return unauthorized(response);
  }

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({
      message: 'Authentication is not configured',
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return unauthorized(response, 'Invalid or expired authentication token');
  }

  try {
    const user = await userRepository.getUserById(payload.sub);

    if (!user) {
      return unauthorized(response, 'Invalid or expired authentication token');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch {
    return response.status(500).json({ message: 'Internal server error' });
  }
};

const optionalAuthenticate = (request, response, next) => {
  const authorization = request.get('Authorization');

  if (!authorization) {
    return next();
  }

  return authenticate(request, response, next);
};

export { optionalAuthenticate };
export default authenticate;
