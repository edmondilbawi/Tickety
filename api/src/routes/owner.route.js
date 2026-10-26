import express from 'express';
import * as ownerController from '../controllers/owner.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requireOwner } from '../middleware/authorization.middleware.js';

const router = express.Router();

router.use(authenticate, requireOwner);

router.get('/organizers', ownerController.getOrganizers);
router.post('/organizers', ownerController.createOrganizer);
router.get('/events', ownerController.getEvents);
router.post('/events/:id/approve', ownerController.approveEvent);
router.post('/events/:id/reject', ownerController.rejectEvent);

export default router;
