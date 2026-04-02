const express = require('express');
const router = express.Router();
const {
  joinQueue, getAvailableSlots, getQueueStatus, getHistory,
  getLaterSlots, moveSlot, cancelAppointment,
} = require('../controllers/queueController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(protect, apiLimiter);

router.post('/join', authorize('student'), joinQueue);
router.get('/slots', getAvailableSlots);
router.get('/status/:studentId', getQueueStatus);
router.get('/history/:studentId', getHistory);
router.get('/slots/later', getLaterSlots);
router.put('/move', authorize('student'), moveSlot);
router.delete('/cancel/:appointmentId', authorize('student', 'staff'), cancelAppointment);

module.exports = router;
