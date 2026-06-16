import express from 'express';
import authVerify from '../middlewares/authVerify.js';
import { emergencyCreateRateLimit } from '../middlewares/emergencyRateLimit.js';
import {
  triggerEmergency,
  getEmergencyDetails,
  getEmergencyTimeline,
  cancelEmergencyHandler,
  validateEmergencyToken,
  addEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
  deleteEmergencyContact,
  getDispatchStatusHandler,
} from '../controllers/emergencyController.js';
import { identifyPatientHandler }            from '../controllers/patientController.js';
import { matchHospitalForEmergencyHandler }  from '../controllers/hospitalIntelligenceController.js';
import { matchAmbulanceForEmergencyHandler } from '../controllers/ambulanceController.js';

const router = express.Router();

// ── Public ─────────────────────────────────────────────────
// Token validation is intentionally public — hospital staff / responders use it without accounts
router.get('/token/:token', validateEmergencyToken);

// ── Emergency Contacts (all protected) ─────────────────────
router.get   ('/contacts',     authVerify, getEmergencyContacts);
router.post  ('/contacts',     authVerify, addEmergencyContact);
router.put   ('/contacts/:id', authVerify, updateEmergencyContact);
router.delete('/contacts/:id', authVerify, deleteEmergencyContact);

// ── Emergency Cases (protected) ────────────────────────────
// NOTE: specific paths before :emergency_id to avoid route shadowing
router.post('/create', authVerify, emergencyCreateRateLimit, triggerEmergency);

router.get ('/:emergency_id',                    authVerify, getEmergencyDetails);
router.get ('/:emergency_id/timeline',           authVerify, getEmergencyTimeline);
router.get ('/:emergency_id/dispatch',           authVerify, getDispatchStatusHandler);
router.post('/:emergency_id/cancel',             authVerify, cancelEmergencyHandler);
router.post('/:emergency_id/identify',           authVerify, identifyPatientHandler);
router.post('/:emergency_id/match-hospital',     authVerify, matchHospitalForEmergencyHandler);
router.post('/:emergency_id/match-ambulance',    authVerify, matchAmbulanceForEmergencyHandler);

export default router;
