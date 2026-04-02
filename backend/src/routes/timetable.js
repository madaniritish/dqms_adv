const express = require('express');
const router = express.Router();
const { getTimetable } = require('../controllers/timetableController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.get('/', protect, apiLimiter, getTimetable);

module.exports = router;
