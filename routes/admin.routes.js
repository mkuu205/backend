const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/admin-dashboard', adminController.getAdminDashboard);

// Player management
router.get('/players', adminController.getPlayers);
router.put('/players/:playerId/role', adminController.updatePlayerRole);
router.delete('/players/:playerId', adminController.deletePlayer);

module.exports = router;
