const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');
const { generateLogoUrl } = require('../services/logo.service');

const register = async (req, res) => {
  try {
    const { username, email, team, password, phone } = req.body;

    // Check if username already exists
    const existingUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      return errorResponse(res, 'Username already taken', 400);
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return errorResponse(res, 'Email already registered', 400);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate logo URL
    const logoUrl = generateLogoUrl(team);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, team_name, logo_url, phone, role, rating, wins, losses, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, 'player', 1000, 0, 0, CURRENT_TIMESTAMP)
       RETURNING id, username, email, team_name, logo_url, phone, role, rating, wins, losses, created_at`,
      [username, email, passwordHash, team, logoUrl, phone || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse(res, 'Registration successful', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        team: user.team_name,
        logo_url: user.logo_url,
        role: user.role,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses
      },
      token
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by username or email
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [identifier.toLowerCase(), identifier.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const user = result.rows[0];
    await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse(res, 'Login successful', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        team: user.team_name,
        logo_url: user.logo_url,
        role: user.role,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return errorResponse(res, 'Username parameter is required', 400);
    }

    const normalizedUsername = username.toLowerCase();

    // Validate format
    const usernameRegex = /^[a-z0-9_]{3,15}$/;
    if (!usernameRegex.test(normalizedUsername)) {
      return res.json({
        available: false,
        message: 'Username must be 3-15 characters (lowercase letters, numbers, underscore only)'
      });
    }

    // Check availability
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [normalizedUsername]
    );

    if (result.rows.length > 0) {
      return res.json({
        available: false,
        message: 'Username already taken'
      });
    }

    return res.json({
      available: true
    });

  } catch (error) {
    console.error('Check username error:', error);
    return errorResponse(res, 'Failed to check username', 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters', 400);
    }

    // Get current user
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = result.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      return errorResponse(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    return successResponse(res, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 'Failed to change password', 500);
  }
};

module.exports = {
  register,
  login,
  checkUsername,
  changePassword
};
