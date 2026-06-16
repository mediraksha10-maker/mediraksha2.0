import express from 'express';
import authVerify from '../middlewares/authVerify.js';
import {
  getMrkIdHandler,
  getEmergencyProfileHandler,
  upsertEmergencyProfileHandler,
} from '../controllers/patientController.js';

const router = express.Router();

// All routes require auth
router.use(authVerify);

router.get('/mrk-id',            getMrkIdHandler);
router.get('/emergency-profile',  getEmergencyProfileHandler);
router.put('/emergency-profile',  upsertEmergencyProfileHandler);

export default router;
