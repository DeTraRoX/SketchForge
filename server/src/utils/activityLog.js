const BoardActivity = require('../models/BoardActivity');

async function logActivity({ boardId, userId, action, message, meta = {}, io, broadcast = true }) {
  try {
    const entry = await BoardActivity.create({
      board: boardId,
      user: userId || null,
      action,
      message,
      meta,
    });
    await entry.populate('user', 'name email avatar');
    if (broadcast && io) {
      io.to(`board:${boardId}`).emit('board:activity', {
        activity: {
          _id: entry._id,
          action: entry.action,
          message: entry.message,
          meta: entry.meta,
          createdAt: entry.createdAt,
          user: entry.user
            ? { id: entry.user._id, name: entry.user.name, avatar: entry.user.avatar }
            : null,
        },
      });
    }
    return entry;
  } catch {
    return null;
  }
}

module.exports = { logActivity };
