const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    elements: { type: Array, default: [] },
    settings: {
      backgroundColor: { type: String, default: '#ffffff' },
      gridEnabled: { type: Boolean, default: true },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    },
    sharing: {
      linkEnabled: { type: Boolean, default: false },
      permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    },
    revision: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1, deletedAt: 1 });
boardSchema.index({ workspace: 1, deletedAt: 1 });
boardSchema.index({ folder: 1, deletedAt: 1 });

module.exports = mongoose.model('Board', boardSchema);
