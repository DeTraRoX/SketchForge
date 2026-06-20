const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const Board = require('../models/Board');
const BoardVersion = require('../models/BoardVersion');
const Folder = require('../models/Folder');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { canAccessBoard } = require('../utils/boardAccess');
const { canAccessWorkspace, canEditWorkspace } = require('../utils/workspaceAccess');
const { mergeElements, stampElements } = require('../utils/elementMerge');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

function getIo(req) {
  return req.app.get('io');
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, workspaceId, folderId } = req.body;
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !canEditWorkspace(workspace, req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const board = await Board.create({
      title: title || 'Untitled',
      owner: req.user.id,
      collaborators: [],
      workspace: workspaceId || null,
      folder: folderId || null,
      revision: 0,
      sharing: { linkEnabled: true, permission: 'view' },
    });
    const user = await User.findById(req.user.id).select('name');
    await logActivity({
      boardId: board._id,
      userId: req.user.id,
      action: 'board.created',
      message: `${user?.name || 'Someone'} created the board`,
      io: getIo(req),
    });
    res.json({ board });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create board', error: String(e) });
  }
});

router.get('/trash', requireAuth, async (req, res) => {
  try {
    const boards = await Board.find({ owner: req.user.id, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 });
    res.json({ boards });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list trash', error: String(e) });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { folderId, workspaceId } = req.query;
    const query = { deletedAt: null };

    if (folderId) {
      query.folder = folderId;
    } else if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !canAccessWorkspace(workspace, req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query.workspace = workspaceId;
    } else {
      query.$or = [
        { owner: req.user.id, workspace: null },
        { collaborators: req.user.id },
        { workspace: { $in: await Workspace.find({ $or: [{ owner: req.user.id }, { 'members.user': req.user.id }] }).distinct('_id') } },
      ];
    }

    const boards = await Board.find(query).sort({ updatedAt: -1 });
    res.json({ boards });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list boards', error: String(e) });
  }
});

router.get('/:boardId', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: access.status === 404 ? 'Board not found' : 'Forbidden' });
    res.json({
      board: access.board,
      canEdit: access.canEdit,
      revision: access.board.revision,
      isTrashed: !!access.isTrashed,
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load board', error: String(e) });
  }
});

router.put('/:boardId', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { elements, settings, revision, deletedIds } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.canEdit) return res.status(403).json({ message: 'View-only access' });
    if (access.isTrashed) return res.status(403).json({ message: 'Board is in trash' });

    const prevCount = access.board.elements?.length || 0;
    if (Array.isArray(elements)) {
      const stamped = stampElements(elements, req.user.id);
      access.board.elements = mergeElements(access.board.elements, stamped, deletedIds);
      access.board.revision = (access.board.revision || 0) + 1;
    }
    if (settings) {
      access.board.settings = { ...(access.board.settings?.toObject?.() ?? access.board.settings), ...settings };
    }
    await access.board.save();

    if (Array.isArray(elements) && access.board.elements.length > 0 && access.board.elements.length % 15 === 0) {
      BoardVersion.create({
        board: boardId,
        savedBy: req.user.id,
        label: 'Auto-save',
        elements: access.board.elements,
        settings: access.board.settings,
      }).catch(() => {});
    }

    const newCount = access.board.elements?.length || 0;
    if (Array.isArray(elements) && (newCount !== prevCount || (deletedIds?.length > 0))) {
      const user = await User.findById(req.user.id).select('name');
      const delta = newCount - prevCount;
      let message = `${user?.name || 'Someone'} updated the canvas`;
      if (delta > 0) message = `${user?.name || 'Someone'} added ${delta} element${delta > 1 ? 's' : ''}`;
      else if (delta < 0) message = `${user?.name || 'Someone'} removed ${Math.abs(delta)} element${Math.abs(delta) > 1 ? 's' : ''}`;
      await logActivity({
        boardId,
        userId: req.user.id,
        action: 'elements.updated',
        message,
        meta: { elementCount: newCount },
        io: getIo(req),
      });
    }

    res.json({ board: access.board, revision: access.board.revision, merged: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update board', error: String(e) });
  }
});

router.patch('/:boardId/move', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { folderId, workspaceId } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can move board' });

    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || !(await canAccessFolderSimple(folder, req.user.id))) {
        return res.status(400).json({ message: 'Invalid folder' });
      }
      access.board.folder = folderId;
      access.board.workspace = folder.workspace || access.board.workspace;
    } else if (folderId === null) {
      access.board.folder = null;
    }

    if (workspaceId !== undefined) {
      if (workspaceId) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace || !canEditWorkspace(workspace, req.user.id)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        access.board.workspace = workspaceId;
      } else {
        access.board.workspace = null;
        access.board.folder = null;
      }
    }

    await access.board.save();
    const user = await User.findById(req.user.id).select('name');
    await logActivity({
      boardId,
      userId: req.user.id,
      action: 'board.moved',
      message: `${user?.name || 'Someone'} moved the board`,
      io: getIo(req),
    });
    res.json({ board: access.board });
  } catch (e) {
    res.status(500).json({ message: 'Failed to move board', error: String(e) });
  }
});

async function canAccessFolderSimple(folder, userId) {
  if (folder.owner?.toString() === userId) return true;
  if (folder.workspace) {
    const workspace = await Workspace.findById(folder.workspace);
    return workspace && canAccessWorkspace(workspace, userId);
  }
  return false;
}

router.patch('/:boardId/rename', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body;
    const access = await canAccessBoard(boardId, req.user.id);
    if (!access.ok) return res.status(access.status).json({ message: 'Forbidden' });
    if (!access.isOwner) return res.status(403).json({ message: 'Only owner can rename' });

    const oldTitle = access.board.title;
    access.board.title = title || access.board.title;
    await access.board.save();
    const user = await User.findById(req.user.id).select('name');
    await logActivity({
      boardId,
      userId: req.user.id,
      action: 'board.renamed',
      message: `${user?.name || 'Someone'} renamed board to "${access.board.title}"`,
      meta: { from: oldTitle, to: access.board.title },
      io: getIo(req),
    });
    res.json({ board: access.board });
  } catch (e) {
    res.status(500).json({ message: 'Failed to rename board', error: String(e) });
  }
});

router.post('/:boardId/restore', requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ _id: req.params.boardId, owner: req.user.id });
    if (!board || !board.deletedAt) return res.status(404).json({ message: 'Not in trash' });
    board.deletedAt = null;
    await board.save();
    const user = await User.findById(req.user.id).select('name');
    await logActivity({
      boardId: board._id,
      userId: req.user.id,
      action: 'board.restored',
      message: `${user?.name || 'Someone'} restored the board from trash`,
      io: getIo(req),
    });
    res.json({ board });
  } catch (e) {
    res.status(500).json({ message: 'Failed to restore board', error: String(e) });
  }
});

router.delete('/:boardId', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { permanent } = req.query;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Not found' });
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only owner can delete' });
    }

    if (permanent === 'true' && board.deletedAt) {
      await board.deleteOne();
      return res.json({ ok: true, permanent: true });
    }

    if (!board.deletedAt) {
      board.deletedAt = new Date();
      await board.save();
      const user = await User.findById(req.user.id).select('name');
      await logActivity({
        boardId,
        userId: req.user.id,
        action: 'board.trashed',
        message: `${user?.name || 'Someone'} moved the board to trash`,
        io: getIo(req),
      });
      return res.json({ ok: true, trashed: true });
    }

    await board.deleteOne();
    res.json({ ok: true, permanent: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete board', error: String(e) });
  }
});

module.exports = router;
