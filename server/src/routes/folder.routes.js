const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const Folder = require('../models/Folder');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const { canAccessWorkspace, canEditWorkspace } = require('../utils/workspaceAccess');

const router = express.Router();

async function canAccessFolder(folder, userId) {
  if (folder.owner?.toString() === userId) return true;
  if (folder.workspace) {
    const workspace = await Workspace.findById(folder.workspace);
    return workspace && canAccessWorkspace(workspace, userId);
  }
  return false;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const query = { $or: [{ owner: req.user.id }] };
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !canAccessWorkspace(workspace, req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query.$or = [{ workspace: workspaceId }];
    } else {
      query.$or.push({ workspace: null, owner: req.user.id });
    }
    const folders = await Folder.find(query).sort({ name: 1 });
    res.json({ folders });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list folders', error: String(e) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, workspaceId, color } = req.body;
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !canEditWorkspace(workspace, req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const folder = await Folder.create({
      name: name?.trim() || 'New folder',
      owner: req.user.id,
      workspace: workspaceId || null,
      color: color || '#6366f1',
    });
    res.json({ folder });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create folder', error: String(e) });
  }
});

router.patch('/:folderId', requireAuth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder || !(await canAccessFolder(folder, req.user.id))) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const { name, color } = req.body;
    if (name?.trim()) folder.name = name.trim();
    if (color) folder.color = color;
    await folder.save();
    res.json({ folder });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update folder', error: String(e) });
  }
});

router.delete('/:folderId', requireAuth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder || folder.owner?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Board.updateMany({ folder: folder._id }, { folder: null });
    await folder.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete folder', error: String(e) });
  }
});

module.exports = router;
