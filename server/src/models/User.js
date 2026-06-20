const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    cursorColor: { type: String, default: '#6366f1' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

