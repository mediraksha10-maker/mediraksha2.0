import express from 'express';
const router = express.Router();

// ── CONTROLLER IMPORTS ──
import { 
  getDoctorDetail, 
  updateDoctorDetail, 
  deleteDoctorAccount 
} from '../controllers/doctorController.js';

import { 
  getAllMeetings, 
  getMeetingById, 
  deleteMeeting 
} from '../controllers/doctorMeetingController.js';

import { 
  getAllPatients, 
  getPatientById, 
  removePatient 
} from '../controllers/doctorUserController.js';


// ── DOCTOR PROFILE CHANNELS ──
// Resolves to: /doctor/info/detail, /doctor/info/update, etc.
router.get('/info/detail', getDoctorDetail);
router.patch('/info/update', updateDoctorDetail);
router.delete('/info/delete', deleteDoctorAccount);


// ── APPOINTMENTS / MEETINGS MANAGEMENT ──
// Resolves to: /doctor/meetings/all, /doctor/meetings/:id
// Note: Hardcoded collection endpoints stay grouped safely above parameter routes
router.get('/meetings/all', getAllMeetings);
router.get('/meetings/:id', getMeetingById);
router.delete('/meetings/:id', deleteMeeting);


// ── REGISTERED PATIENTS DIRECTORY ──
// Resolves to: /doctor/user/my, /doctor/user/:id
// Matches your frontend: api.get('/doctor/user/my') & api.delete('/doctor/user/:id')
router.get('/user/my', getAllPatients);
router.get('/user/:id', getPatientById);
router.delete('/user/:id', removePatient);


export default router;