import router from 'express';
import { getHospitals, getHospitalById } from '../controllers/hospitalController';

const hospitalRoutes = router();

hospitalRoutes.get('/all', getHospitals);
hospitalRoutes.get('/:id', getHospitalById);

export default hospitalRoutes;