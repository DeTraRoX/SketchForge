const mongoose = require('mongoose');

const boardVersionSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: 'Auto-save' },
    elements: { type: Array, default: [] },
    settings: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BoardVersion', boardVersionSchema);
