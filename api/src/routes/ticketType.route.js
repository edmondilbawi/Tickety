import express from 'express';
import * as ticketTypeController from '../controllers/ticketType.controller.js';
import authenticate, {
  optionalAuthenticate,
} from '../middleware/auth.middleware.js';
import { requireOrganizer } from '../middleware/authorization.middleware.js';

const router = express.Router();

router.get('/', optionalAuthenticate, ticketTypeController.getTicketTypes);
router.get('/:id', optionalAuthenticate, ticketTypeController.getTicketTypeById);
router.post(
  '/',
  authenticate,
  requireOrganizer,
  ticketTypeController.createTicketType,
);
router.put(
  '/:id',
  authenticate,
  requireOrganizer,
  ticketTypeController.updateTicketType,
);
router.delete(
  '/:id',
  authenticate,
  requireOrganizer,
  ticketTypeController.deleteTicketType,
);

export default router;
