const express = require('express');
const router = express.Router();
const { getStaffQueue, markEmergency, markNoShow } = require('../controllers/staffController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(protect, authorize('staff'), apiLimiter);

router.get('/queue', getStaffQueue);
router.post('/emergency', markEmergency);
router.post('/noshow', markNoShow);

module.exports = router;
