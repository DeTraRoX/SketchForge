const jwt = require('jsonwebtoken');

function protectSocketHandshake(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.sub };
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
}

module.exports = { protectSocketHandshake };

