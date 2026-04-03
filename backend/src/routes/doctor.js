const express = require('express');
const router = express.Router();
const { getDoctorQueue, getDoctorHistory, callNextPatient } = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(protect, authorize('doctor'), apiLimiter);

router.get('/queue', getDoctorQueue);
router.get('/history', getDoctorHistory);
router.post('/next', callNextPatient);

module.exports = router;
