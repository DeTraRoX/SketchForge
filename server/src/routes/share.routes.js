const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const User = require('../models/User');
const { canAccessBoard } = require('../utils/boardAccess');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    await access.board.populate('collaborators', 'name email avatar');
    res.json({
      sharing: access.board.sharing,
      collaborators: access.board.collaborators,
      shareLink: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/board/${boardId}`,
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get share info', error: String(e) });
  }
});

router.patch('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can change sharing' });

    const { linkEnabled, permission } = req.body;
    if (linkEnabled !== undefined) access.board.sharing.linkEnabled = linkEnabled;
    if (permission) access.board.sharing.permission = permission;
    await access.board.save();
    res.json({ sharing: access.board.sharing });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update sharing', error: String(e) });
  }
});

router.post('/invite', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { email } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can invite' });

    const user = await User.findOne({ email: email?.toLowerCase()?.trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user._id.toString() === req.user.id) return res.status(400).json({ message: 'Cannot invite yourself' });

    const exists = access.board.collaborators.some((c) => c.toString() === user._id.toString());
    if (!exists) {
      access.board.collaborators.push(user._id);
      await access.board.save();
    }
    res.json({ ok: true, collaborators: access.board.collaborators });
  } catch (e) {
    res.status(500).json({ message: 'Failed to invite collaborator', error: String(e) });
  }
});

router.delete('/collaborators/:userId', requireAuth, async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can remove collaborators' });

    access.board.collaborators = access.board.collaborators.filter((c) => c.toString() !== userId);
    await access.board.save();
    res.json({ collaborators: access.board.collaborators });
  } catch (e) {
    res.status(500).json({ message: 'Failed to remove collaborator', error: String(e) });
  }
});

module.exports = router;
