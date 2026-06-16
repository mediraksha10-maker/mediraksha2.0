import express from 'express';
import authVerify from '../middlewares/authVerify.js';
import { requireRole, ROLES } from '../middlewares/roleAuth.js';
import { getDriverByUserId }  from '../services/ambulance/ambulanceDataService.js';
import {
  createAmbulanceHandler,
  updateAmbulanceHandler,
  getAmbulanceHandler,
  changeAmbulanceStatusHandler,
  addDriverHandler,
  getDriversHandler,
  updateLocationHandler,
  getLocationHandler,
  getLocationHistoryHandler,
  getNearbyAmbulancesHandler,
  getAssignmentHandler,
  updateAssignmentStatusHandler,
} from '../controllers/ambulanceController.js';

const router = express.Router();

// ── Driver identity middleware ─────────────────────────────────────────────────
// Resolves the authenticated user to their driver record and attaches it to req.
// Used on driver-specific routes so controllers can verify ambulance ownership.

const resolveDriver = async (req, res, next) => {
  try {
    const driver = await getDriverByUserId(req.user.id);
    req.driverRecord = driver ?? null; // null for OPERATIONS_TEAM calling driver routes
    next();
  } catch (err) {
    console.error('resolveDriver error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Guard combos ──────────────────────────────────────────────────────────────

const adminGuard  = [authVerify, requireRole(ROLES.OPERATIONS_TEAM)];
// AMBULANCE_DRIVER rank (2) is below OPERATIONS_TEAM (4) so ops can also use driver routes
const driverGuard = [authVerify, requireRole(ROLES.AMBULANCE_DRIVER), resolveDriver];

// ── Public ────────────────────────────────────────────────────────────────────
// IMPORTANT: specific paths (/nearby, /assignments/:id) must come BEFORE /:id
// to prevent Express from matching them as the :id wildcard.

router.get('/nearby',              getNearbyAmbulancesHandler);
router.get('/:id',                 getAmbulanceHandler);
router.get('/:id/location',        getLocationHandler);

// ── Driver routes ─────────────────────────────────────────────────────────────
// Drivers push GPS pings and respond to dispatch assignments

router.post('/:id/location',             ...driverGuard, updateLocationHandler);
router.post('/assignments/:id/status',   ...driverGuard, updateAssignmentStatusHandler);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.post('/',                         ...adminGuard, createAmbulanceHandler);
router.put('/:id',                       ...adminGuard, updateAmbulanceHandler);
router.patch('/:id/status',              ...adminGuard, changeAmbulanceStatusHandler);

router.post('/:id/drivers',              ...adminGuard, addDriverHandler);
router.get('/:id/drivers',               ...adminGuard, getDriversHandler);
router.get('/:id/location/history',      ...adminGuard, getLocationHistoryHandler);

router.get('/assignments/:id',           ...adminGuard, getAssignmentHandler);

export default router;
