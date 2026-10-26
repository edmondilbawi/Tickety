import express from 'express';
import * as interestController from '../controllers/interest.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requireCustomer } from '../middleware/authorization.middleware.js';

const router = express.Router();

router.use(authenticate, requireCustomer);

router.get('/my', interestController.getMyInterests);
router.post('/:eventId', interestController.addInterest);
router.delete('/:eventId', interestController.deleteInterest);

export default router;
