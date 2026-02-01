const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');

// Get all bookings (with optional filters)
router.get('/', bookingsController.getAllBookings);

// Get booking statistics
router.get('/stats', bookingsController.getBookingStats);

// Get available plants for booking
router.get('/available-plants', bookingsController.getAvailablePlants);

// Get single booking by ID
router.get('/:id', bookingsController.getBookingById);

// Create new booking
router.post('/', bookingsController.createBooking);

// Update booking status
router.patch('/:id/status', bookingsController.updateBookingStatus);

// Cancel booking
router.patch('/:id/cancel', bookingsController.cancelBooking);

module.exports = router;
