const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const { canAccessWorkspace } = require('./workspaceAccess');

async function canAccessBoard(boardId, userId) {
  const board = await Board.findOne({ _id: boardId, deletedAt: null });
  if (!board) {
    const trashed = await Board.findById(boardId);
    if (trashed?.deletedAt && trashed.owner?.toString() === userId) {
      return { ok: true, board: trashed, canEdit: false, isOwner: true, isTrashed: true };
    }
    return { ok: false, status: 404, board: null };
  }

  const isOwner = board.owner.toString() === userId;
  const isCollaborator = board.collaborators.some((c) => c.toString() === userId);
  let isWorkspaceMember = false;
  let workspaceCanEdit = false;

  if (board.workspace) {
    const workspace = await Workspace.findById(board.workspace);
    if (workspace && canAccessWorkspace(workspace, userId)) {
      isWorkspaceMember = true;
      const role = workspace.owner?.toString() === userId
        ? 'owner'
        : workspace.members?.find((m) => m.user?.toString() === userId)?.role;
      workspaceCanEdit = ['owner', 'admin', 'editor'].includes(role);
    }
  }

  const canView = isOwner || isCollaborator || isWorkspaceMember || board.sharing?.linkEnabled;
  const canEdit = isOwner || isCollaborator || workspaceCanEdit
    || (board.sharing?.linkEnabled && board.sharing?.permission === 'edit');

  if (!canView) return { ok: false, status: 403, board: null };
  return { ok: true, board, canEdit, isOwner };
}

module.exports = { canAccessBoard };
