import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start listening
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[PlusOne Server] Running on http://localhost:${PORT}`);
  });
});
