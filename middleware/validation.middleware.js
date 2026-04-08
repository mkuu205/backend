const { errorResponse } = require('../utils/responses');
const { validateUsername, validateEmail, validateTeam, validatePassword } = require('../utils/validators');

const validateRegistration = (req, res, next) => {
  const { username, email, team, password } = req.body;

  const errors = {};

  if (!username || !validateUsername(username.toLowerCase())) {
    errors.username = 'Username must be 3-15 characters (lowercase letters, numbers, underscore only)';
  }

  if (!email || !validateEmail(email)) {
    errors.email = 'Valid email is required';
  }

  if (!team || !validateTeam(team)) {
    errors.team = 'Team name must be 2-30 characters';
  }

  if (!password || !validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation failed', 400, errors);
  }

  // Normalize username to lowercase
  req.body.username = username.toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return errorResponse(res, 'Email/username and password are required', 400);
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin
};
