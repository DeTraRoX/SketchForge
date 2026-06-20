const mongoose = require('mongoose');

const boardActivitySchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

boardActivitySchema.index({ board: 1, createdAt: -1 });

module.exports = mongoose.model('BoardActivity', boardActivitySchema);
