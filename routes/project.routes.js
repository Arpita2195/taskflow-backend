const express = require('express');
const router = express.Router();
const {
  getProjects, createProject, getProject, updateProject, deleteProject, inviteMember, updateMemberRole, removeMember, cancelInvite, getProjectJoinInfo, joinProject
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireProjectAdmin } = require('../middleware/role.middleware');
const { restrictToAdminWrites } = require('../middleware/writeRestriction.middleware');

// Public route - accessible by guests to fetch invite project meta
router.get('/:id/join-info', getProjectJoinInfo);

router.use(protect);
router.use(restrictToAdminWrites);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(requireProjectAdmin, updateProject).delete(requireProjectAdmin, deleteProject);
router.post('/:id/invite', requireProjectAdmin, inviteMember);
router.delete('/:id/invite/:email', requireProjectAdmin, cancelInvite);
router.post('/:id/join', joinProject);
router.put('/:id/members/:userId', requireProjectAdmin, updateMemberRole);
router.delete('/:id/members/:userId', requireProjectAdmin, removeMember);

module.exports = router;
