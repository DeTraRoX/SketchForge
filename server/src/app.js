const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.get('/', (req, res) => {
    res.json({
      name: 'SketchForge API',
      status: 'running',
      message: 'This is the backend only. Open the frontend at http://localhost:5173',
      health: '/health',
    });
  });

  // Routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  app.use('/api/workspaces', require('./routes/workspace.routes'));
  app.use('/api/folders', require('./routes/folder.routes'));
  app.use('/api/boards', require('./routes/board.routes'));
  app.use('/api/boards/:boardId/activity', require('./routes/activity.routes'));
  app.use('/api/boards/:boardId/comments', require('./routes/comment.routes'));
  app.use('/api/boards/:boardId/versions', require('./routes/version.routes'));
  app.use('/api/boards/:boardId/share', require('./routes/share.routes'));
  app.use('/api/upload', require('./routes/upload.routes'));
  app.use('/api/ai', require('./routes/ai.routes'));

  return app;
}

module.exports = { createApp };

