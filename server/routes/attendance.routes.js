const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');

// Attendance routes
router.get('/', attendanceController.getAttendance);
router.get('/summary', attendanceController.getAttendanceSummary);
router.get('/today', attendanceController.getTodayAttendance);
router.get('/stats', attendanceController.getAttendanceStats);
router.post('/', attendanceController.markAttendance);
router.post('/bulk', attendanceController.bulkMarkAttendance);

module.exports = router;
