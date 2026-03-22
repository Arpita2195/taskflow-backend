const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/breakdown',     ctrl.breakdown);
router.post('/auto-priority', ctrl.autoPriority);
router.post('/summary',       ctrl.summary);
router.post('/daily-plan',    ctrl.dailyPlan);
router.post('/reminders',     ctrl.reminders);
router.post('/chat',          ctrl.chat);

module.exports = router;
