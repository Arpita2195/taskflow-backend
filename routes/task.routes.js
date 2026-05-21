const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { checkProjectPermission } = require('../middleware/role.middleware');
const { restrictToAdminWrites } = require('../middleware/writeRestriction.middleware');
const { upload } = require('../config/cloudinary');
const { getTasks, createTask, getTask, updateTask, moveTask, deleteTask, addAttachment, addLink } = require('../controllers/task.controller');

router.use(protect);
router.use(restrictToAdminWrites);

router.route('/')
  .get(checkProjectPermission(['admin', 'member', 'viewer']), getTasks)
  .post(checkProjectPermission(['admin', 'member']), createTask);

router.route('/:id')
  .get(checkProjectPermission(['admin', 'member', 'viewer']), getTask)
  .put(checkProjectPermission(['admin', 'member']), updateTask)
  .delete(checkProjectPermission(['admin']), deleteTask);

router.patch('/:id/move', checkProjectPermission(['admin', 'member']), moveTask);

router.post('/:id/attachments', 
  checkProjectPermission(['admin', 'member']), 
  upload.single('file'), 
  addAttachment
);

router.post('/:id/links', checkProjectPermission(['admin', 'member']), addLink);

module.exports = router;
