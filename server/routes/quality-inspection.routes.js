const express = require('express');
const router = express.Router();
const qualityInspectionController = require('../controllers/quality-inspection.controller');

// Inspections
router.get('/', qualityInspectionController.getAllInspections);
router.get('/pending', qualityInspectionController.getPendingInspections);
router.get('/rejection-summary', qualityInspectionController.getRejectionSummary);
router.get('/:id', qualityInspectionController.getInspectionById);
router.post('/', qualityInspectionController.createInspection);

// Inspection actions
router.put('/:id/approve', qualityInspectionController.approveInspection);
router.put('/:id/reject', qualityInspectionController.rejectInspection);
router.put('/items/:id', qualityInspectionController.updateInspectionItem);

// Debit Notes
router.get('/debit-notes/all', qualityInspectionController.getDebitNotes);
router.get('/debit-notes/:id', qualityInspectionController.getDebitNoteById);

module.exports = router;
