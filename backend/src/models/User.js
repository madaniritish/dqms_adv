const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MAX_FAILED_LOGINS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-zA-Z0-9._%+-]+@(student\.)?nitw\.ac\.in$/, 'Must be a valid NITW email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'staff', 'doctor'],
      required: true,
      default: 'student',
    },
    rollNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

// Increment failed logins
userSchema.methods.incrementFailedLogins = async function () {
  this.failedLogins += 1;
  if (this.failedLogins >= MAX_FAILED_LOGINS) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 min
  }
  await this.save();
};

// Reset failed logins on success
userSchema.methods.resetFailedLogins = async function () {
  this.failedLogins = 0;
  this.lockedUntil = null;
  this.lastActivity = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
