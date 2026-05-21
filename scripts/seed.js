const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User.model');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const Activity = require('../models/Activity.model');
const Notification = require('../models/Notification.model');
const bcrypt = require('bcryptjs');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const seed = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb+srv://arpitanathwani2155_db_user:Arpu2192005%40@cluster0.ggvnpjj.mongodb.net/taskflow?retryWrites=true&w=majority';
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing demo data
    await User.deleteMany({ email: /demo/ });
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});

    // 1. Create Demo Users
    const salt = await bcrypt.genSalt(10);
    const hashedPW = await bcrypt.hash('demo123', salt);

    const users = await User.insertMany([
      { name: 'Arpita', email: 'arpita@demo.com', password: hashedPW, role: 'admin' },
      { name: 'Yashvi', email: 'yashvi@demo.com', password: hashedPW },
      { name: 'Riya', email: 'riya@demo.com', password: hashedPW },
      { name: 'Divya', email: 'divya@demo.com', password: hashedPW },
    ]);

    console.log('Users created (Arpita, Yashvi, Riya, Divya).');

    // 2. Create Project A: Web Dev (Arpita & Yashvi)
    const projectA = await Project.create({
      name: 'Web Dev Project',
      description: 'Project for Arpita and Yashvi.',
      color: '#6C63FF',
      owner: users[0]._id, // Arpita
      members: [
        { user: users[1]._id, role: 'admin' }, // Yashvi
      ]
    });

    // 3. Create Project B: AI ML (Arpita & Riya & Divya)
    const projectB = await Project.create({
      name: 'AI ML Project',
      description: 'Project for Arpita, Riya and Divya.',
      color: '#FF6B6B',
      owner: users[0]._id, // Arpita
      members: [
        { user: users[2]._id, role: 'member' }, // Riya
        { user: users[3]._id, role: 'member' }, // Divya
      ]
    });

    console.log('Projects created (Web Dev & AI ML).');

    // 4. Create Demo Tasks for Project A
    const tasksA = await Task.insertMany([
      {
        title: 'Design Frontend',
        description: 'Create modern UI designs using Figma.',
        status: 'In Progress',
        column: 'In Progress',
        priority: 'high',
        project: projectA._id,
        assignees: [users[0]._id, users[1]._id],
        progress: 63,
        dueDate: new Date(Date.now() + 86400000 * 1), // Tomorrow
        checklist: [
          { text: 'Logo design', done: true },
          { text: 'Color palette', done: true },
          { text: 'Mobile mockups', done: false }
        ]
      },
      {
        title: 'API Integration',
        description: 'Connect frontend to backend endpoints.',
        status: 'In Progress',
        column: 'In Progress',
        priority: 'medium',
        project: projectA._id,
        assignees: [users[1]._id],
        dueDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
        progress: 20
      },
      {
        title: 'User Testing',
        description: 'Gather feedback from beta testers.',
        status: 'Backlog',
        column: 'Backlog',
        priority: 'low',
        project: projectA._id,
        dueDate: new Date(Date.now() + 86400000 * 5), // 5 days from now
        assignees: [users[0]._id]
      },
      {
        title: 'Fix Deployment Bug',
        description: 'Resolve issue with Vercel deployment.',
        status: 'Backlog',
        column: 'Backlog',
        priority: 'high',
        project: projectA._id,
        assignees: [users[0]._id],
        dueDate: new Date(Date.now() + 86400000 * 2) // 2 days from now
      }
    ]);

    // 5. Create Demo Tasks for Project B
    await Task.insertMany([
      {
        title: 'Train ML Model',
        status: 'Backlog',
        column: 'Backlog',
        priority: 'high',
        project: projectB._id,
        dueDate: new Date(Date.now() + 86400000 * 4), // 4 days from now
        assignees: [users[0]._id, users[2]._id, users[3]._id],
      },
      {
        title: 'Data Collection',
        status: 'Done',
        column: 'Done',
        priority: 'medium',
        project: projectB._id,
        assignees: [users[2]._id],
        dueDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
        progress: 100
      }
    ]);

    // 6. Add some activities
    await Activity.insertMany([
      {
        project: projectA._id,
        task: tasksA[0]._id,
        user: users[1]._id,
        message: 'created modern UI designs',
        type: 'task_updated'
      },
      {
        project: projectA._id,
        task: tasksA[3]._id,
        user: users[0]._id,
        message: 'updated deployment status',
        type: 'task_updated'
      }
    ]);

    // 7. Add some notifications
    await Notification.insertMany([
      {
        recipient: users[0]._id,
        sender: users[1]._id,
        type: 'mention',
        title: 'New Comment',
        message: '<strong>Yashvi</strong> mentioned you in a comment',
        relatedProject: projectA._id,
        relatedTask: tasksA[0]._id,
        isRead: false
      },
      {
        recipient: users[0]._id,
        sender: users[2]._id,
        type: 'project_invite',
        title: 'New Project',
        message: '<strong>Riya</strong> added you to a new project',
        relatedProject: projectB._id,
        isRead: false
      }
    ]);

    console.log('Tasks, Activities, and Notifications created.');
    console.log('Seeding complete! Arpita (arpita@demo.com) can now see rich data.');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
