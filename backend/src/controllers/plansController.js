const plansRepository = require('../db/plansRepository');
const { serializePlan } = require('../utils/serializers');
const { asyncHandler } = require('../utils/helpers');
const siteSettingsService = require('../services/siteSettingsService');

const getPlans = asyncHandler(async (req, res) => {
  const plans = await plansRepository.listActive();
  const settings = await siteSettingsService.getPublicSettings();
  res.json({ plans: plans.filter((plan) => settings.networks[plan.network] !== false).map(serializePlan) });
});

module.exports = { getPlans };
