import express from 'express';
import multer from 'multer';

// Controllers
import { 
  uploadReport, 
  getAllReports, 
  getReportById, 
  deleteReport 
} from '../controllers/uploadController.js';

import {
  getUserDetails,
  updateUserProfile,
  deleteUserAccount
} from '../controllers/userController.js';

import { 
  getAllMeetings, 
  getMeetingById, 
  deleteMeeting, 
  bookMeeting, 
  getAvailableSlots 
} from '../controllers/appointmentController.js';

import { 
  getMyDoctor, 
  getDoctorByName, 
  getDoctorById, 
  removeRegisteredDoctor 
} from '../controllers/userDoctorController.js';

const router = express.Router();

// Multer configuration for handling file uploads safely via RAM memory buffers
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional safety fix: Limit file size upload to 5MB
});

// All routes here are automatically prefixed with /api/user and protected by authVerify

/* ==========================================
   FILES UPLOAD AND MANAGE ROUTES
   ========================================== */
// The upload.single('file') expects the FormData key on the frontend to be named 'file'
router.post('/report/upload', upload.single('file'), uploadReport);
router.get('/report/all', getAllReports);
router.get('/report/:id', getReportById);
router.delete('/report/:id', deleteReport);

/* ==========================================
   USER PROFILE OPERATION ROUTES
   ========================================== */
router.get('/info/detail', getUserDetails);
router.patch('/info/update', updateUserProfile);
router.delete('/info/delete', deleteUserAccount);

/* ==========================================
    APPOINTMENT/MEETING MANAGEMENT ROUTES
   ========================================== */
router.get('/meetings/all', getAllMeetings);
router.get('/meetings/:id', getMeetingById);
router.delete('/meetings/:id', deleteMeeting);
router.post('/meetings/book', bookMeeting);
router.get('/meetings/slot/:doctorId', getAvailableSlots);

/* ==========================================
    DOCTOR-USER ASSOCIATION ROUTES
   ========================================== */
router.get('/doctor/my', getMyDoctor);
router.get('/doctor/search/:name', getDoctorByName); 
router.get('/doctor/:doctorId', getDoctorById);
router.delete('/doctor/:doctorId', removeRegisteredDoctor);

export default router;