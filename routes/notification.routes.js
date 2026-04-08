const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Public route (anyone can subscribe)
router.post('/subscribe', notificationService.saveSubscription);
router.post('/save-subscription', notificationService.saveSubscription);
router.get('/vapid-public-key', notificationService.getVapidPublicKey);

// Admin only (send notifications)
router.post('/send', authenticateToken, requireAdmin, notificationService.sendNotification);
router.post('/send-notification', authenticateToken, requireAdmin, notificationService.sendNotification);

module.exports = router;
