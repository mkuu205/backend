const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/check-username', authController.checkUsername);

// Protected routes
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
