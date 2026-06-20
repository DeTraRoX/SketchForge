const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./utils/mongo');
const { createApp } = require('./app');

async function main() {
  const port = process.env.PORT || 4000;
  await connectMongo();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  app.set('io', io);

  const { protectSocketHandshake } = require('./middleware/authSocket');
  io.use(protectSocketHandshake);

  io.on('connection', (socket) => {
    require('./sockets/board.socket')(socket, io);
  });

  server.listen(port, () => {
    console.log(`SketchForge server listening on http://localhost:${port}`);
  });
}

module.exports = { main };

