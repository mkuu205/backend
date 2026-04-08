const generateLogoUrl = (teamName) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teamName)}`;
};

module.exports = {
  generateLogoUrl
};
