const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Name required'],     trim: true, maxlength: 80 },
  email:    { type: String, required: [true, 'Email required'],    unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password required'], minlength: 6, select: false },
  avatar:   { type: String, default: '' },
}, { timestamps: true });

// Auto-hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare candidate password
userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip password from JSON responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
