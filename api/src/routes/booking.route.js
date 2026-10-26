import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import {
  requireCustomer,
  requireOrganizer,
} from '../middleware/authorization.middleware.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  requireCustomer,
  bookingController.createBooking,
);
router.get(
  '/my',
  authenticate,
  requireCustomer,
  bookingController.getMyBookings,
);
router.get(
  '/organizer',
  authenticate,
  requireOrganizer,
  bookingController.getOrganizerBookings,
);
router.post(
  '/:id/cancel',
  authenticate,
  requireCustomer,
  bookingController.cancelBooking,
);
router.get('/:id', authenticate, bookingController.getBookingById);

export default router;
