const Board = require('../models/Board');
const User = require('../models/User');
const { canAccessBoard } = require('../utils/boardAccess');
const { mergeElements, stampElements } = require('../utils/elementMerge');
const { logActivity } = require('../utils/activityLog');

const presenceMap = new Map();
const selectionMap = new Map();

module.exports = (socket, io) => {
  socket.on('board:join', async ({ boardId }) => {
    try {
      if (!boardId) return;
      const access = await canAccessBoard(boardId, socket.user?.id);
      if (!access.ok) {
        socket.emit('board:error', { message: 'Access denied' });
        return;
      }

      socket.join(`board:${boardId}`);
      socket.data.boardId = boardId;
      socket.data.canEdit = access.canEdit;

      const dbUser = await User.findById(socket.user?.id).select('name cursorColor');
      const color = dbUser?.cursorColor || `hsl(${Math.floor(Math.random() * 360)}, 65%, 55%)`;

      if (!presenceMap.has(boardId)) presenceMap.set(boardId, new Map());
      const room = presenceMap.get(boardId);
      room.set(socket.id, {
        userId: socket.user?.id,
        name: dbUser?.name || socket.handshake.auth?.name || 'User',
        color,
        socketId: socket.id,
      });

      if (!selectionMap.has(boardId)) selectionMap.set(boardId, new Map());
      const selections = selectionMap.get(boardId);

      socket.emit('board:state', {
        elements: access.board.elements,
        revision: access.board.revision || 0,
        settings: access.board.settings,
      });

      socket.emit('board:selections:state', {
        selections: Object.fromEntries(
          Array.from(selections.entries()).map(([sid, data]) => [sid, data])
        ),
      });

      io.to(`board:${boardId}`).emit('presence:update', {
        users: Array.from(room.values()),
      });

      await logActivity({
        boardId,
        userId: socket.user?.id,
        action: 'user.joined',
        message: `${dbUser?.name || 'Someone'} joined the board`,
        io,
      });
    } catch {
      socket.emit('board:error', { message: 'Join failed' });
    }
  });

  socket.on('board:cursor', ({ boardId, cursor }) => {
    if (!boardId) return;
    socket.to(`board:${boardId}`).emit('board:cursor', {
      userId: socket.user?.id,
      socketId: socket.id,
      cursor,
    });
  });

  socket.on('board:selection', ({ boardId, elementIds, bounds }) => {
    if (!boardId) return;
    const room = presenceMap.get(boardId);
    const user = room?.get(socket.id);
    if (!user) return;

    if (!selectionMap.has(boardId)) selectionMap.set(boardId, new Map());
    const selections = selectionMap.get(boardId);

    if (!elementIds?.length) {
      selections.delete(socket.id);
    } else {
      selections.set(socket.id, {
        userId: socket.user?.id,
        name: user.name,
        color: user.color,
        elementIds,
        bounds,
        socketId: socket.id,
      });
    }

    socket.to(`board:${boardId}`).emit('board:selection:remote', {
      socketId: socket.id,
      userId: socket.user?.id,
      name: user.name,
      color: user.color,
      elementIds: elementIds || [],
      bounds: bounds || null,
    });
  });

  socket.on('board:elements:update', async ({ boardId, elements, deletedIds }) => {
    if (!boardId || !socket.data.canEdit) return;
    try {
      const access = await canAccessBoard(boardId, socket.user?.id);
      if (!access.ok || !access.canEdit || access.isTrashed) return;

      const stamped = stampElements(elements || [], socket.user?.id);
      const merged = mergeElements(access.board.elements, stamped, deletedIds);
      access.board.elements = merged;
      access.board.revision = (access.board.revision || 0) + 1;
      await access.board.save();

      socket.to(`board:${boardId}`).emit('board:elements:remote', {
        userId: socket.user?.id,
        elements: merged,
        revision: access.board.revision,
        deletedIds: deletedIds || [],
      });

      socket.emit('board:elements:ack', {
        revision: access.board.revision,
        elements: merged,
      });
    } catch {
      // ignore transient errors
    }
  });

  socket.on('disconnect', () => {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    const room = presenceMap.get(boardId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) presenceMap.delete(boardId);
      else io.to(`board:${boardId}`).emit('presence:update', { users: Array.from(room.values()) });
    }

    const selections = selectionMap.get(boardId);
    if (selections) {
      selections.delete(socket.id);
      socket.to(`board:${boardId}`).emit('board:selection:remote', {
        socketId: socket.id,
        userId: socket.user?.id,
        elementIds: [],
        bounds: null,
      });
      if (selections.size === 0) selectionMap.delete(boardId);
    }
  });
};
