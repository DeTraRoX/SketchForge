const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const Comment = require('../models/Comment');
const { canAccessBoard } = require('../utils/boardAccess');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    const comments = await Comment.find({ board: boardId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ comments });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load comments', error: String(e) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { x, y, text } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.canEdit) return res.status(403).json({ message: 'View-only access' });

    const comment = await Comment.create({
      board: boardId,
      user: req.user.id,
      x: x ?? 0,
      y: y ?? 0,
      text: text || '',
    });
    await comment.populate('user', 'name avatar');
    res.json({ comment });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create comment', error: String(e) });
  }
});

router.patch('/:commentId', requireAuth, async (req, res) => {
  try {
    const { boardId, commentId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    const comment = await Comment.findOne({ _id: commentId, board: boardId });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    if (req.body.text !== undefined) comment.text = req.body.text;
    if (req.body.resolved !== undefined) comment.resolved = req.body.resolved;
    await comment.save();
    await comment.populate('user', 'name avatar');
    res.json({ comment });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update comment', error: String(e) });
  }
});

router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const { boardId, commentId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });

    const comment = await Comment.findOne({ _id: commentId, board: boardId });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user.id && !access.isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await comment.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete comment', error: String(e) });
  }
});

module.exports = router;
