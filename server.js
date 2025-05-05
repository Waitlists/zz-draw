const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

let drawHistory = [];

io.on('connection', socket => {
  console.log('User connected');

  // Send existing canvas history
  socket.emit('init', drawHistory);

  socket.on('draw', data => {
    drawHistory.push(data);
    socket.broadcast.emit('draw', data);
  });

  socket.on('clear', () => {
    drawHistory = [];
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
