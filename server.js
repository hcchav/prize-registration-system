const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO server with CORS enabled
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send confirmation to the client
    socket.emit('connected', { message: 'Successfully connected to server' });

    // Handle wheel spin event from controller
    socket.on('spin-wheel', (data) => {
      console.log('Spin wheel event received:', data);
      // Broadcast to all clients
      io.emit('wheel-spin', data);
    });

    // Handle spin complete event from spinthewheel page
    socket.on('spin-complete', (data) => {
      console.log('Spin complete event received:', data);
      // Broadcast to all clients
      io.emit('spin-complete', data);
    });

    // Handle close-modal event
    socket.on('close-modal', () => {
      console.log('Close modal event received from:', socket.id);
      // Broadcast to all clients
      io.emit('close-modal');
    });

    // Handle claim number submission
    socket.on('submit-claim', (claimNumber) => {
      console.log('Claim number submitted:', claimNumber);
      // Broadcast to all clients
      io.emit('claim-submitted', claimNumber);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server initialized`);
  });
});
