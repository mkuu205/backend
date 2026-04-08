const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const regex = /^[a-z0-9_]{3,15}$/;
  return regex.test(username);
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateTeam = (team) => {
  if (!team || typeof team !== 'string') return false;
  return team.length >= 2 && team.length <= 30;
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
};

const validatePhone = (phone) => {
  if (!phone) return true; // Phone is optional
  const regex = /^254\d{9}$/;
  return regex.test(phone);
};

module.exports = {
  validateUsername,
  validateEmail,
  validateTeam,
  validatePassword,
  validatePhone
};
