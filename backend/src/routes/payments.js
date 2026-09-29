const express = require('express');
const paymentsController = require('../controllers/paymentsController');
const { readLimiter, writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/config', readLimiter, paymentsController.getPaymentConfig);
router.post('/initialize', writeLimiter, paymentsController.initializePayment);
router.get('/verify/:reference', readLimiter, paymentsController.verifyPayment);
router.post('/webhook', paymentsController.paystackWebhook);

module.exports = router;
