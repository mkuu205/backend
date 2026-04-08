const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// User routes
router.post('/', authenticateToken, paymentController.createPayment);
router.get('/my-payments', authenticateToken, paymentController.getUserPayments);

// Admin routes
router.put('/:paymentId/status', authenticateToken, requireAdmin, paymentController.updatePaymentStatus);

module.exports = router;
