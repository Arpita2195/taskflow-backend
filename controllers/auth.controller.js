const User = require('../models/User.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');

// @POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Assign 'admin' role to the first user in the database to prevent initial lock-out
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const user = await User.create({ name, email, password, role });

    // Auto-join any projects that have invited this email address
    try {
      const Project = require('../models/Project.model');
      const pendingProjects = await Project.find({ 'pendingInvites.email': email.toLowerCase() });
      for (const project of pendingProjects) {
        const invite = project.pendingInvites.find(i => i.email.toLowerCase() === email.toLowerCase());
        if (invite) {
          project.members.push({ user: user._id, role: invite.role });
          project.pendingInvites = project.pendingInvites.filter(i => i.email.toLowerCase() !== email.toLowerCase());
          await project.save();
        }
      }
    } catch (err) {
      console.error('Failed to auto-join invited projects:', err);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({ success: true, accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
};

// @POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    await user.save();

    res.json({ success: true, accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
};

// @POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newRefreshToken = generateRefreshToken(user._id);
    const newAccessToken = generateAccessToken(user._id);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// @POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// @GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, refresh, logout, getMe };
