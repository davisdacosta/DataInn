const adminAuthService = require('../services/adminAuthService');
const siteSettingsService = require('../services/siteSettingsService');
const { asyncHandler } = require('../utils/helpers');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  res.json(adminAuthService.login(email, password));
});

const getSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await siteSettingsService.getAdminSettings() });
});

const updateSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await siteSettingsService.update(req.body?.settings) });
});

module.exports = { login, getSettings, updateSettings };
