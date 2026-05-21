const express = require('express');
const router = express.Router();
const { summarizeTask } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/summarize/:taskId', protect, summarizeTask);

module.exports = router;
