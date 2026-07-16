import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { db, dummyHash, User, Message, SOSAlert } from "./server/db.ts";
import { askAI } from "./server/ai.ts";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ECHONET_MESH_SECRET_KEY_2026";
const TRANSMISSION_RANGE = 250; // Grid units for direct transmission

app.use(express.json());

// API Request Logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Helper: Euclidean Distance
function getDistance(coord1: { x: number; y: number }, coord2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2));
}

// --- EMI Simulation Variables & Functions ---
let emiEnabled = false;
let emiDropRate = 0.3; // Default 30% drop rate
let droppedLinks: { from: string; to: string }[] = [];

function getStatsWithSimulation() {
  const stats = db.getStats();
  if (emiEnabled) {
    const penalty = Math.round(emiDropRate * 45);
    return {
      ...stats,
      networkHealth: Math.max(12, stats.networkHealth - penalty),
    };
  }
  return stats;
}

function recalculateDroppedLinks() {
  if (!emiEnabled) {
    droppedLinks = [];
    return;
  }

  const onlineUsers = db.getUsers().filter((u) => u.status === "online");
  const newDrops: { from: string; to: string }[] = [];

  for (let i = 0; i < onlineUsers.length; i++) {
    for (let j = i + 1; j < onlineUsers.length; j++) {
      const u1 = onlineUsers[i];
      const u2 = onlineUsers[j];
      const dist = getDistance(u1.coordinates, u2.coordinates);
      if (dist <= TRANSMISSION_RANGE) {
        if (Math.random() < emiDropRate) {
          newDrops.push({ from: u1.username, to: u2.username });
        }
      }
    }
  }
  droppedLinks = newDrops;
}

// Recalculate EMI drops periodically
setInterval(() => {
  if (emiEnabled) {
    recalculateDroppedLinks();
    io.emit("emi_state_updated", {
      emiEnabled,
      emiDropRate,
      droppedLinks,
    });
    io.emit("mesh_topology_updated", {
      users: db.getUsers(),
      stats: getStatsWithSimulation(),
    });
  }
}, 7000);

// Mesh Pathfinder: BFS to find shortest path of online nodes
export function findMeshPath(
  senderUsername: string,
  receiverUsername: string,
  onlineUsers: User[]
): { path: string[]; status: "delivered" | "queued"; hops: number } {
  if (receiverUsername === "group_all") {
    // Group chat is broadcast: all online nodes receive it.
    // The relay path starts from sender. We can list the sender as the starting hop.
    return { path: [senderUsername], status: "delivered", hops: 1 };
  }

  const sender = onlineUsers.find((u) => u.username === senderUsername);
  const receiver = onlineUsers.find((u) => u.username === receiverUsername);

  // If receiver is offline, message must be queued (Store-and-Forward DTN routing)
  if (!receiver || receiver.status === "offline") {
    return { path: [senderUsername], status: "queued", hops: 0 };
  }

  // If sender is not found, default to direct
  if (!sender) {
    return { path: [senderUsername, receiverUsername], status: "delivered", hops: 1 };
  }

  // BFS search
  const queue: { username: string; path: string[] }[] = [{ username: senderUsername, path: [senderUsername] }];
  const visited = new Set<string>();
  visited.add(senderUsername);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    
    if (curr.username === receiverUsername) {
      return {
        path: curr.path,
        status: "delivered",
        hops: curr.path.length - 1,
      };
    }

    const currNode = onlineUsers.find((u) => u.username === curr.username);
    if (!currNode) continue;

    // Find neighbors (online users within TRANSMISSION_RANGE)
    for (const neighbor of onlineUsers) {
      if (neighbor.status !== "online") continue;
      if (visited.has(neighbor.username)) continue;

      if (emiEnabled) {
        const isDropped = droppedLinks.some(
          (dl) =>
            (dl.from === curr.username && dl.to === neighbor.username) ||
            (dl.from === neighbor.username && dl.to === curr.username)
        );
        if (isDropped) continue;
      }

      const dist = getDistance(currNode.coordinates, neighbor.coordinates);
      if (dist <= TRANSMISSION_RANGE) {
        visited.add(neighbor.username);
        queue.push({
          username: neighbor.username,
          path: [...curr.path, neighbor.username],
        });
      }
    }
  }

  // No active online path found: Store-and-Forward queued
  return { path: [senderUsername], status: "queued", hops: 0 };
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token missing" });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

// --- AUTH ENDPOINTS ---

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const existing = db.getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: "Username already registered on local mesh" });
  }

  const hash = dummyHash(password);
  const newUser = db.createUser(username, hash);

  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, {
    expiresIn: "24h",
  });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      coordinates: newUser.coordinates,
      batteryLevel: newUser.batteryLevel,
      signalStrength: newUser.signalStrength,
    },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(400).json({ error: "Node credentials not found on local mesh" });
  }

  const hash = dummyHash(password);
  if (user.passwordHash !== hash) {
    return res.status(400).json({ error: "Invalid node passkey" });
  }

  // Make user online
  db.updateUserStatus(user.id, "online");

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      coordinates: user.coordinates,
      batteryLevel: user.batteryLevel,
      signalStrength: user.signalStrength,
    },
  });
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Node not registered" });

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    coordinates: user.coordinates,
    batteryLevel: user.batteryLevel,
    signalStrength: user.signalStrength,
    status: user.status,
  });
});

// --- CORE APIs ---

// Get active nodes list
app.get("/api/users", authenticateToken, (req, res) => {
  res.json(db.getUsers());
});

// Update node telemetry
app.put("/api/users/telemetry", authenticateToken, (req: any, res) => {
  const { batteryLevel, signalStrength } = req.body;
  db.updateUserTelemetry(req.user.id, batteryLevel, signalStrength);
  
  // Notify everyone
  io.emit("telemetry_updated", {
    userId: req.user.id,
    batteryLevel,
    signalStrength,
  });

  res.json({ success: true });
});

// Get chat history
app.get("/api/messages", authenticateToken, (req, res) => {
  res.json(db.getMessages());
});

// Get emergency alerts
app.get("/api/sos", authenticateToken, (req, res) => {
  res.json(db.getSOSAlerts());
});

// Trigger emergency SOS
app.post("/api/sos", authenticateToken, (req: any, res) => {
  const { message, severity } = req.body;
  const user = db.getUserById(req.user.id);

  if (!user) return res.status(404).json({ error: "Node not found" });

  const sos = db.createSOSAlert(
    user.id,
    user.username,
    message || "IMMEDIATE ASSISTANCE REQUIRED",
    severity || "critical",
    user.coordinates
  );

  // Broadcast SOS through WebSockets
  io.emit("sos_broadcast", sos);

  res.status(201).json(sos);
});

// Resolve emergency SOS
app.post("/api/sos/resolve", authenticateToken, (req: any, res) => {
  const { sosId } = req.body;
  db.resolveSOSAlert(sosId);

  // Notify everyone
  io.emit("sos_resolved", { sosId });

  res.json({ success: true });
});

// Get system analytics/stats
app.get("/api/stats", (req, res) => {
  res.json(db.getStats());
});

// AI Dispatch Node interaction
app.post("/api/ai/ask", authenticateToken, async (req: any, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Query is required" });

  const onlineNodes = db.getUsers().filter((u) => u.status === "online");
  const activeSOS = db.getSOSAlerts();
  const recentMessages = db.getMessages().slice(-10);

  try {
    const replyText = await askAI(prompt, onlineNodes, activeSOS, recentMessages);

    // Save as message in database from AI dispatcher
    const aiMessage = db.addMessage({
      senderId: "system_ai",
      senderName: "AI_Dispatcher",
      receiverId: req.user.id,
      text: replyText,
      isEncrypted: false,
      status: "delivered",
      relayPath: ["AI_Dispatcher", req.user.username],
      hopCount: 2,
      readBy: [],
    });

    io.emit("message_received", aiMessage);
    res.json(aiMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- QR PAIRING ENDPOINT ---
app.post("/api/mesh/pair", authenticateToken, (req: any, res) => {
  const { username, coordinates, batteryLevel, signalStrength } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required for pairing" });
  }

  const existing = db.getUserByUsername(username);
  if (existing) {
    db.updateUserStatus(existing.id, "online");
    if (coordinates) {
      existing.coordinates = coordinates;
    }
    if (batteryLevel !== undefined) {
      existing.batteryLevel = batteryLevel;
    }
    if (signalStrength !== undefined) {
      existing.signalStrength = signalStrength;
    }
    db.save();
    io.emit("telemetry_updated", {
      userId: existing.id,
      batteryLevel: existing.batteryLevel,
      signalStrength: existing.signalStrength,
      status: "online"
    });
    return res.json({ success: true, message: "Node re-synchronized", user: existing });
  }

  const hash = dummyHash("paired123");
  const newUser = db.createUser(username, hash);
  
  if (coordinates) {
    newUser.coordinates = coordinates;
  }
  if (batteryLevel !== undefined) {
    newUser.batteryLevel = batteryLevel;
  }
  if (signalStrength !== undefined) {
    newUser.signalStrength = signalStrength;
  }
  
  db.save();
  
  io.emit("telemetry_updated", {
    userId: newUser.id,
    batteryLevel: newUser.batteryLevel,
    signalStrength: newUser.signalStrength,
    status: "online"
  });

  res.status(201).json({ success: true, message: "New node paired successfully", user: newUser });
});

// Admin command: simulate network blackout or reset stats
app.post("/api/admin/blackout", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized admin capability" });
  }

  const { targetUserId, action } = req.body;
  if (action === "disconnect") {
    db.updateUserStatus(targetUserId, "offline");
    io.emit("node_disconnected", { userId: targetUserId });
  } else if (action === "reconnect") {
    db.updateUserStatus(targetUserId, "online");
    io.emit("node_reconnected", { userId: targetUserId });
  }

  res.json({ success: true });
});

// --- SOCKET.IO EVENT ROUTER ---

const activeSockets = new Map<string, string>(); // socketId -> username

io.on("connection", (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Send current EMI state immediately on connection
  socket.emit("emi_state_updated", {
    emiEnabled,
    emiDropRate,
    droppedLinks,
  });

  // Handle client toggling EMI or updating drop rate
  socket.on("set_emi", (payload: { enabled: boolean; dropRate?: number }) => {
    emiEnabled = payload.enabled;
    if (payload.dropRate !== undefined) {
      emiDropRate = payload.dropRate;
    }
    recalculateDroppedLinks();
    
    io.emit("emi_state_updated", {
      emiEnabled,
      emiDropRate,
      droppedLinks,
    });

    io.emit("mesh_topology_updated", {
      users: db.getUsers(),
      stats: getStatsWithSimulation(),
    });
  });

  // Node Identification on Mesh Join
  socket.on("join_mesh", (payload: { username: string; id?: string }) => {
    if (!payload?.username) return;

    activeSockets.set(socket.id, payload.username);
    
    // Find or locate user in DB
    const user = db.getUserByUsername(payload.username);
    if (user) {
      db.updateUserStatus(user.id, "online");
      console.log(`[Socket] ${payload.username} registered as active mesh node.`);
    }

    // Join global group channel room
    socket.join("group_all");

    // Broadcast updated users to everyone
    io.emit("mesh_topology_updated", {
      users: db.getUsers(),
      stats: getStatsWithSimulation(),
    });
  });

  // Client sent coordinate update (e.g. dragged their node on map)
  socket.on("update_coordinates", (payload: { username: string; x: number; y: number }) => {
    const user = db.getUserByUsername(payload.username);
    if (user) {
      db.updateUserCoordinates(user.id, payload.x, payload.y);
      console.log(`[Socket] ${payload.username} moved to (${payload.x}, ${payload.y})`);

      // Broadcast new topology
      io.emit("mesh_topology_updated", {
        users: db.getUsers(),
        stats: getStatsWithSimulation(),
      });
    }
  });

  // Message Sending
  socket.on("send_message", (payload: {
    senderId: string;
    senderName: string;
    receiverId: string; // "group_all" or specific username
    receiverName: string;
    text: string;
    isEncrypted: boolean;
  }) => {
    const onlineUsers = db.getUsers();
    
    // Calculate Mesh Relay Path (BFS)
    const { path: relayPath, status, hops } = findMeshPath(
      payload.senderName,
      payload.receiverName || "group_all",
      onlineUsers
    );

    const newMsg = db.addMessage({
      senderId: payload.senderId,
      senderName: payload.senderName,
      receiverId: payload.receiverId,
      text: payload.text,
      isEncrypted: payload.isEncrypted,
      status: status,
      relayPath: relayPath,
      hopCount: Math.max(1, hops),
      readBy: [payload.senderId],
    });

    console.log(`[Mesh Message] Path: ${relayPath.join(" -> ")} | Status: ${status}`);

    // Broadcast to everyone so they see the animated hops on the graph, plus store history
    io.emit("message_received", newMsg);

    // If addressed to AI, let the AI responder reply automatically in a few seconds!
    if (payload.receiverName === "AI_Dispatcher") {
      setTimeout(async () => {
        try {
          const replyText = await askAI(payload.text, onlineUsers.filter(u => u.status === "online"), db.getSOSAlerts(), db.getMessages().slice(-10));
          const aiMsg = db.addMessage({
            senderId: "system_ai",
            senderName: "AI_Dispatcher",
            receiverId: payload.senderId,
            text: replyText,
            isEncrypted: false,
            status: "delivered",
            relayPath: ["AI_Dispatcher", payload.senderName],
            hopCount: 2,
            readBy: [],
          });
          io.emit("message_received", aiMsg);
        } catch (e) {
          console.error("AI automated socket responder error:", e);
        }
      }, 2000);
    }
  });

  // SOS triggered through sockets
  socket.on("send_sos", (payload: { username: string; message: string; severity: "critical" | "warning" }) => {
    const user = db.getUserByUsername(payload.username);
    if (user) {
      const sos = db.createSOSAlert(
        user.id,
        user.username,
        payload.message || "EMERGENCY: NEED MEDICAL / SUPPLY SUPPORT",
        payload.severity || "critical",
        user.coordinates
      );
      io.emit("sos_broadcast", sos);
    }
  });

  socket.on("disconnect", () => {
    const username = activeSockets.get(socket.id);
    if (username) {
      activeSockets.delete(socket.id);
      console.log(`[Socket] Disconnected: ${username}`);

      // Wait a short time before setting offline to avoid flicker during hot refreshes
      setTimeout(() => {
        // Only set offline if no other sockets are registered for this username
        const stillConnected = Array.from(activeSockets.values()).includes(username);
        if (!stillConnected) {
          const user = db.getUserByUsername(username);
          if (user && user.id !== "system_ai") {
            db.updateUserStatus(user.id, "offline");
            io.emit("mesh_topology_updated", {
              users: db.getUsers(),
              stats: getStatsWithSimulation(),
            });
          }
        }
      }, 3000);
    }
  });
});

// --- VITE DEV AND PRODUCTION MIDDLEWARE SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`================================================`);
    console.log(`🌌 EchoNet Mesh Platform Running on Port ${PORT}`);
    console.log(`🔗 Mode: ${process.env.NODE_ENV || "development"}`);
    console.log(`🛰️ Mesh range configured: ${TRANSMISSION_RANGE} units`);
    console.log(`================================================`);
  });
}

startServer();
