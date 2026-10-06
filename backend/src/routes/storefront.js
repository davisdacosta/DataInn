const express = require('express');
const storefrontController = require('../controllers/storefrontController');
const { readLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.get('/settings', readLimiter, storefrontController.getSettings);

module.exports = router;
