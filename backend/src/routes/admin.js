const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { readLimiter, writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.post('/login', writeLimiter, adminController.login);
router.get('/settings', readLimiter, requireAdmin, adminController.getSettings);
router.put('/settings', writeLimiter, requireAdmin, adminController.updateSettings);

module.exports = router;
