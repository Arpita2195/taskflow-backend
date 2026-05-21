const Project = require('../models/Project.model');
const Activity = require('../models/Activity.model');
const User = require('../models/User.model');
const { sendInviteEmail } = require('../utils/email');

// @GET /api/projects
const getProjects = async (req, res, next) => {
  try {
    const query = req.user && req.user.role === 'admin'
      ? { isArchived: false }
      : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }], isArchived: false };

    const projects = await Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ success: true, projects });
  } catch (err) { next(err); }
};

// @POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body;
    const project = await Project.create({ name, description, color, icon, owner: req.user._id });
    await project.populate('owner', 'name email avatar');

    const io = req.app.get('io');
    io.emit('project:created', project);

    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
};

// @GET /api/projects/:id
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'project_updated',
      message: `${req.user.name} updated project details`,
      details: req.body,
    });

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

// @POST /api/projects/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const invitee = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const inviteLink = `${process.env.CLIENT_URL}/join/${project._id}?email=${email}`;

    if (invitee) {
      const alreadyMember = project.members.some((m) => m.user.toString() === invitee._id.toString());
      if (!alreadyMember) {
        project.members.push({ user: invitee._id, role });
        await project.save();
      }
    } else {
      const alreadyPending = project.pendingInvites.some(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      );
      if (!alreadyPending) {
        project.pendingInvites.push({ email: email.toLowerCase(), role });
        await project.save();
      }
    }

    await sendInviteEmail(email, req.user.name, project.name, inviteLink);

    // Populate updated details
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'member_invited',
      message: `${req.user.name} invited ${email} as ${role}`,
    });

    res.json({ success: true, message: 'Invitation sent', project });
  } catch (err) { next(err); }
};

// @DELETE /api/projects/:id/invite/:email
const cancelInvite = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.pendingInvites = project.pendingInvites.filter(
      (i) => i.email.toLowerCase() !== req.params.email.toLowerCase()
    );
    await project.save();

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'invite_cancelled',
      message: `${req.user.name} cancelled the invitation for ${req.params.email}`,
    });

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @GET /api/projects/:id/join-info
const getProjectJoinInfo = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        owner: {
          name: project.owner.name,
          email: project.owner.email,
        }
      }
    });
  } catch (err) { next(err); }
};

// @POST /api/projects/:id/join
const joinProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Check if user is owner
    if (project.owner.toString() === req.user._id.toString()) {
      return res.json({ success: true, message: 'You are the owner of this project', project });
    }

    // Check if user is already a member
    const alreadyMember = project.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) {
      return res.json({ success: true, message: 'Already a member of this project', project });
    }

    // Check if user has a pending invite role
    const inviteIndex = project.pendingInvites.findIndex(
      i => i.email.toLowerCase() === req.user.email.toLowerCase()
    );
    let role = 'member';
    if (inviteIndex !== -1) {
      role = project.pendingInvites[inviteIndex].role;
      project.pendingInvites.splice(inviteIndex, 1);
    }

    project.members.push({ user: req.user._id, role });
    await project.save();

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'member_joined',
      message: `${req.user.name} joined the project`,
    });

    res.json({ success: true, message: 'Joined project successfully', project });
  } catch (err) { next(err); }
};

// @PUT /api/projects/:id/members/:userId
const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid member role' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Check if member exists
    const member = project.members.find((m) => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found in project' });

    const previousRole = member.role;
    member.role = role;
    await project.save();
    
    // Fetch details of updated member to return
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    // Find the user object to get their name for activity logging
    const userObj = await User.findById(req.params.userId);
    const memberName = userObj ? userObj.name : 'User';

    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'member_role_updated',
      message: `${req.user.name} changed ${memberName}'s role from ${previousRole} to ${role}`,
    });

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Prevent removing project owner
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }

    // Check if member exists
    const exists = project.members.some((m) => m.user.toString() === req.params.userId);
    if (!exists) return res.status(404).json({ success: false, message: 'Member not found in project' });

    project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    const userObj = await User.findById(req.params.userId);
    const memberName = userObj ? userObj.name : 'User';

    // Log Activity
    await Activity.create({
      project: project._id,
      user: req.user._id,
      type: 'member_removed',
      message: `${req.user.name} removed ${memberName} from the project`,
    });

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

module.exports = { 
  getProjects, 
  createProject, 
  getProject, 
  updateProject, 
  deleteProject, 
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvite,
  getProjectJoinInfo,
  joinProject
};
