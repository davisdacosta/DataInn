const express = require('express');
const plansController = require('../controllers/plansController');
const { readLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', readLimiter, plansController.getPlans);

module.exports = router;
