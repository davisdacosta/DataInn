const plansRepository = require('../db/plansRepository');
const { serializePlan } = require('../utils/serializers');
const { asyncHandler } = require('../utils/helpers');

const getPlans = asyncHandler(async (req, res) => {
  const plans = await plansRepository.listActive();
  res.json({ plans: plans.map(serializePlan) });
});

module.exports = { getPlans };
