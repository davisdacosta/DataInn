const express = require('express');
const webhooksController = require('../controllers/webhooksController');

const router = express.Router();

router.post('/datasika', webhooksController.datasikaWebhook);

module.exports = router;
