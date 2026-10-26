import { pathToFileURL } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { validateRuntimeConfig } from './config/environment.js';
import { getMailConfigurationWarning } from './config/mail.js';
import authRouter from './routes/auth.route.js';
import bookingRouter from './routes/booking.route.js';
import eventRouter from './routes/event.route.js';
import interestRouter from './routes/interest.route.js';
import ownerRouter from './routes/owner.route.js';
import ticketTypeRouter from './routes/ticketType.route.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/events', eventRouter);
app.use('/api/ticket-types', ticketTypeRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/interests', interestRouter);

app.use((request, response) => {
  response.status(404).json({ message: 'Not found' });
});

app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      message: 'Request body must contain valid JSON',
    });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      message: 'Request body is too large',
    });
  }

  return response.status(500).json({ message: 'Internal server error' });
});

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  validateRuntimeConfig();
  const mailConfigurationWarning = getMailConfigurationWarning();

  if (mailConfigurationWarning) {
    console.warn(mailConfigurationWarning);
  }

  app.listen(port, () => {
    console.log(`Tickety API listening on port ${port}`);
  });
}

export default app;
