const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const BoardVersion = require('../models/BoardVersion');
const { canAccessBoard } = require('../utils/boardAccess');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    const versions = await BoardVersion.find({ board: boardId })
      .populate('savedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ versions });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load versions', error: String(e) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { label } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.canEdit) return res.status(403).json({ message: 'View-only access' });

    const version = await BoardVersion.create({
      board: boardId,
      savedBy: req.user.id,
      label: label || 'Manual snapshot',
      elements: access.board.elements,
      settings: access.board.settings,
    });
    res.json({ version });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save version', error: String(e) });
  }
});

router.post('/:versionId/restore', requireAuth, async (req, res) => {
  try {
    const { boardId, versionId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.canEdit) return res.status(403).json({ message: 'View-only access' });

    const version = await BoardVersion.findOne({ _id: versionId, board: boardId });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    access.board.elements = version.elements;
    access.board.settings = { ...access.board.settings, ...version.settings };
    await access.board.save();
    res.json({ board: access.board });
  } catch (e) {
    res.status(500).json({ message: 'Failed to restore version', error: String(e) });
  }
});

module.exports = router;
