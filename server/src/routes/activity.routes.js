const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const BoardActivity = require('../models/BoardActivity');
const { canAccessBoard } = require('../utils/boardAccess');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    const activities = await BoardActivity.find({ board: boardId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      activities: activities.map((a) => ({
        _id: a._id,
        action: a.action,
        message: a.message,
        meta: a.meta,
        createdAt: a.createdAt,
        user: a.user
          ? { id: a.user._id, name: a.user.name, avatar: a.user.avatar }
          : null,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load activity', error: String(e) });
  }
});

module.exports = router;
