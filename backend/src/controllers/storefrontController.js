const siteSettingsService = require('../services/siteSettingsService');
const { asyncHandler } = require('../utils/helpers');

const getSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await siteSettingsService.getPublicSettings() });
});

module.exports = { getSettings };
