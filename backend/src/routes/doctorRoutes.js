import express from 'express';
const router = express.Router();

import { getDoctorDetail, updateDoctorDetail, deleteDoctorAccount } from '../controllers/doctorController.js';
import { getAllMeetings, getMeetingById, deleteMeeting } from '../controllers/doctorMeetingController.js';
import { getAllPatients, getPatientById, removePatient } from '../controllers/doctorUserController.js';

// info
router.get('/info/detail', getDoctorDetail);
router.patch('/info/update', updateDoctorDetail);
router.delete('/info/delete', deleteDoctorAccount);

// meetings  — /all must be before /:id to avoid param collision
router.get('/meetings/all', getAllMeetings);
router.get('/meetings/:id', getMeetingById);
router.delete('/meetings/:id', deleteMeeting);

// patients — /my must be before /:id
router.get('/user/my', getAllPatients);
router.get('/user/:id', getPatientById);
router.delete('/user/:id', removePatient);

export default router;