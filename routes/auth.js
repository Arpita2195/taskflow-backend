// routes/auth.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/signup',           ctrl.signup);
router.post('/login',            ctrl.login);
router.get('/me',      protect,  ctrl.getMe);
router.patch('/update-password', protect, ctrl.updatePassword);

module.exports = router;
