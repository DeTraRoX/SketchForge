const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const {
  loadWorkspace,
  canManageWorkspace,
  canEditWorkspace,
  getMemberRole,
} = require('../utils/workspaceAccess');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user.id }, { 'members.user': req.user.id }],
    })
      .populate('owner', 'name email avatar')
      .sort({ updatedAt: -1 });
    res.json({ workspaces });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list workspaces', error: String(e) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name: name?.trim() || 'My Team',
      description: description || '',
      owner: req.user.id,
      members: [],
    });
    await workspace.populate('owner', 'name email avatar');
    res.json({ workspace });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create workspace', error: String(e) });
  }
});

router.get('/:workspaceId', requireAuth, async (req, res) => {
  try {
    const access = await loadWorkspace(req.params.workspaceId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    res.json({ workspace: access.workspace, role: access.role });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load workspace', error: String(e) });
  }
});

router.patch('/:workspaceId', requireAuth, async (req, res) => {
  try {
    const access = await loadWorkspace(req.params.workspaceId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!canManageWorkspace(access.workspace, req.user.id)) {
      return res.status(403).json({ message: 'Only admins can update workspace' });
    }
    const { name, description } = req.body;
    if (name?.trim()) access.workspace.name = name.trim();
    if (description !== undefined) access.workspace.description = description;
    await access.workspace.save();
    res.json({ workspace: access.workspace });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update workspace', error: String(e) });
  }
});

router.post('/:workspaceId/members', requireAuth, async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;
    const access = await loadWorkspace(req.params.workspaceId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!canManageWorkspace(access.workspace, req.user.id)) {
      return res.status(403).json({ message: 'Only admins can invite members' });
    }
    const user = await User.findOne({ email: email?.toLowerCase()?.trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot invite yourself' });
    }
    const exists = access.workspace.members.some((m) => m.user.toString() === user._id.toString());
    if (!exists) {
      access.workspace.members.push({ user: user._id, role });
      await access.workspace.save();
    }
    await access.workspace.populate('members.user', 'name email avatar');
    res.json({ workspace: access.workspace });
  } catch (e) {
    res.status(500).json({ message: 'Failed to add member', error: String(e) });
  }
});

router.delete('/:workspaceId/members/:userId', requireAuth, async (req, res) => {
  try {
    const access = await loadWorkspace(req.params.workspaceId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!canManageWorkspace(access.workspace, req.user.id)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }
    access.workspace.members = access.workspace.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await access.workspace.save();
    res.json({ workspace: access.workspace });
  } catch (e) {
    res.status(500).json({ message: 'Failed to remove member', error: String(e) });
  }
});

router.delete('/:workspaceId', requireAuth, async (req, res) => {
  try {
    const access = await loadWorkspace(req.params.workspaceId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (getMemberRole(access.workspace, req.user.id) !== 'owner') {
      return res.status(403).json({ message: 'Only owner can delete workspace' });
    }
    await access.workspace.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete workspace', error: String(e) });
  }
});

module.exports = router;
