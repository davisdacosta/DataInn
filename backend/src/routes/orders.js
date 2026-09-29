const express = require('express');
const ordersController = require('../controllers/ordersController');
const { readLimiter, writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, ordersController.createOrder);
router.get('/:reference', readLimiter, ordersController.getOrder);
router.get('/:reference/status', readLimiter, ordersController.getOrderStatus);

module.exports = router;
