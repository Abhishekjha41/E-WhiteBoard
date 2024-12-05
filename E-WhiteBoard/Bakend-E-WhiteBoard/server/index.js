const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

// Set up Express and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // React app URL
    methods: ["GET", "POST"],
  },
});
app.use(cors());

// Handle connections
io.on("connection", (socket) => {
  console.log("A user connected");

  // Listen for video frames from Python backend
  socket.on("video_frame", (data) => {
    // Relay the video frame to the frontend
    io.emit("video_frame", data);
  });

  // Listen for draw events from Python backend
  socket.on("draw", (data) => {
    // console.log("Received draw data:", data); // Log data received from Python
    io.emit("draw", data); // Broadcast drawing data to all connected clients
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
