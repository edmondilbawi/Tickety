const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attemptsByIp = new Map();

const cleanupExpiredEntries = (now) => {
  attemptsByIp.forEach((entry, ip) => {
    if (entry.resetAt <= now) {
      attemptsByIp.delete(ip);
    }
  });
};

const loginRateLimit = (request, response, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const now = Date.now();
  cleanupExpiredEntries(now);

  const ip = request.ip || request.socket?.remoteAddress || 'unknown';
  const current = attemptsByIp.get(ip);

  if (!current || current.resetAt <= now) {
    attemptsByIp.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return next();
  }

  if (current.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    response.set('Retry-After', String(retryAfterSeconds));
    return response.status(429).json({
      message: 'Too many login attempts. Please try again later.',
    });
  }

  current.count += 1;
  return next();
};

export default loginRateLimit;
