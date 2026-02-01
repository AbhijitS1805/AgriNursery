const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');

// Leave routes
router.get('/', leaveController.getLeaveApplications);
router.get('/balance', leaveController.getLeaveBalance);
router.get('/types', leaveController.getLeaveTypes);
router.get('/stats', leaveController.getLeaveStats);
router.post('/', leaveController.applyLeave);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
