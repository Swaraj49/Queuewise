const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Cron Jobs
const setupCron = require('./cron/noShowJob');
setupCron(io);

// Attach io to app so routes can access it
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/businesses", require("./routes/businesses"));
app.use("/api/queue", require("./routes/queue"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reviews", require("./routes/reviews"));

// Basic health route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on("joinRoom", ({ businessId, userId }) => {
    if (businessId) socket.join(businessId.toString());
    if (userId) socket.join(userId.toString());
    console.log(`Socket ${socket.id} joined rooms: business=${businessId}, user=${userId}`);
  });
  
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/queuewise";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
