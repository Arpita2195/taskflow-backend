const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect); // all task routes require login

router.get('/stats',  ctrl.getStats);
router.patch('/reorder', ctrl.reorderTasks);
router.route('/').get(ctrl.getTasks).post(ctrl.createTask);
router.route('/:id').patch(ctrl.updateTask).delete(ctrl.deleteTask);

module.exports = router;
