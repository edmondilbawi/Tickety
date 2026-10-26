import express from 'express';
import * as eventController from '../controllers/event.controller.js';
import * as ticketTypeController from '../controllers/ticketType.controller.js';
import authenticate, {
  optionalAuthenticate,
} from '../middleware/auth.middleware.js';
import { requireOrganizer } from '../middleware/authorization.middleware.js';

const router = express.Router();

router.get('/', eventController.getEvents);
router.get(
  '/mine',
  authenticate,
  requireOrganizer,
  eventController.getMyEvents,
);
router.get(
  '/:id/ticket-types',
  optionalAuthenticate,
  ticketTypeController.getTicketTypesByEventId,
);
router.get('/:id', optionalAuthenticate, eventController.getEventById);
router.post(
  '/',
  authenticate,
  requireOrganizer,
  eventController.createEvent,
);
router.put(
  '/:id',
  authenticate,
  requireOrganizer,
  eventController.updateEvent,
);
router.delete(
  '/:id',
  authenticate,
  requireOrganizer,
  eventController.deleteEvent,
);

export default router;
