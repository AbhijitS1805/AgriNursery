const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

// Tasks
router.get('/', taskController.getTasks);
router.get('/pending', taskController.getPendingTasks);
router.post('/', taskController.createTask);
router.put('/:id/complete', taskController.completeTask);

// Labor Tracking
router.get('/labor', taskController.getLaborEntries);
router.post('/labor', taskController.createLaborEntry);

module.exports = router;
