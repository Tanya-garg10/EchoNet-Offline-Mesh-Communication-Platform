import fs from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "user";
  status: "online" | "offline";
  signalStrength: number;
  batteryLevel: number;
  coordinates: { x: number; y: number };
  lastSeen: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string; // user ID or "group_all"
  text: string;
  timestamp: string;
  isEncrypted: boolean;
  status: "sent" | "relayed" | "delivered" | "queued" | "failed";
  relayPath: string[]; // usernames of intermediate relayers including sender/receiver
  hopCount: number;
  readBy: string[];
}

export interface SOSAlert {
  id: string;
  userId: string;
  username: string;
  message: string;
  severity: "critical" | "warning";
  coordinates: { x: number; y: number };
  timestamp: string;
  isResolved: boolean;
}

export interface SystemStats {
  totalUsers: number;
  activeNodes: number;
  messagesSent: number;
  messagesRelayed: number;
  averageDeliveryTimeMs: number;
  networkHealth: number; // 0-100 percentage
}

interface DBStructure {
  users: User[];
  messages: Message[];
  sosAlerts: SOSAlert[];
  stats: SystemStats;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Helper to encrypt simple client-side mimicking strings (not real security, just for demo representation)
export function dummyHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${hash}`;
}

const DEFAULT_USERS: User[] = [
  {
    id: "system_ai",
    username: "AI_Dispatcher",
    passwordHash: dummyHash("emergency123"),
    role: "admin",
    status: "online",
    signalStrength: 100,
    batteryLevel: 100,
    coordinates: { x: 500, y: 500 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_alpha",
    username: "Node_Alpha",
    passwordHash: dummyHash("alpha123"),
    role: "user",
    status: "online",
    signalStrength: 92,
    batteryLevel: 88,
    coordinates: { x: 200, y: 200 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_beta",
    username: "Node_Beta",
    passwordHash: dummyHash("beta123"),
    role: "user",
    status: "online",
    signalStrength: 85,
    batteryLevel: 74,
    coordinates: { x: 380, y: 280 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_gamma",
    username: "Node_Gamma",
    passwordHash: dummyHash("gamma123"),
    role: "user",
    status: "online",
    signalStrength: 78,
    batteryLevel: 95,
    coordinates: { x: 550, y: 350 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_delta",
    username: "Node_Delta",
    passwordHash: dummyHash("delta123"),
    role: "user",
    status: "online",
    signalStrength: 64,
    batteryLevel: 51,
    coordinates: { x: 720, y: 440 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_epsilon",
    username: "Node_Epsilon",
    passwordHash: dummyHash("epsilon123"),
    role: "user",
    status: "online",
    signalStrength: 80,
    batteryLevel: 69,
    coordinates: { x: 900, y: 500 },
    lastSeen: new Date().toISOString(),
  },
  {
    id: "node_zeta",
    username: "Node_Zeta",
    passwordHash: dummyHash("zeta123"),
    role: "user",
    status: "offline",
    signalStrength: 0,
    batteryLevel: 12,
    coordinates: { x: 950, y: 150 },
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
  }
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "msg_1",
    senderId: "node_alpha",
    senderName: "Node_Alpha",
    receiverId: "group_all",
    text: "This is Node Alpha. Does anyone read me? Main cellular networks seem to be down.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isEncrypted: false,
    status: "delivered",
    relayPath: ["Node_Alpha"],
    hopCount: 1,
    readBy: ["node_beta", "node_gamma", "system_ai"]
  },
  {
    id: "msg_2",
    senderId: "system_ai",
    senderName: "AI_Dispatcher",
    receiverId: "group_all",
    text: "Welcome to EchoNet. I am the AI Emergency Dispatcher operating on a local battery-powered node. I can route messages and offer triage support.",
    timestamp: new Date(Date.now() - 7100000).toISOString(),
    isEncrypted: false,
    status: "delivered",
    relayPath: ["AI_Dispatcher"],
    hopCount: 1,
    readBy: ["node_alpha", "node_beta", "node_gamma"]
  },
  {
    id: "msg_3",
    senderId: "node_alpha",
    senderName: "Node_Alpha",
    receiverId: "node_gamma",
    text: "Testing secure relay through Node Beta. Can you confirm decryption?",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isEncrypted: true,
    status: "delivered",
    relayPath: ["Node_Alpha", "Node_Beta", "Node_Gamma"],
    hopCount: 3,
    readBy: ["node_gamma"]
  }
];

const DEFAULT_SOS: SOSAlert[] = [
  {
    id: "sos_1",
    userId: "node_gamma",
    username: "Node_Gamma",
    message: "Solar battery pack low. Requesting secondary power cell backup.",
    severity: "warning",
    coordinates: { x: 550, y: 350 },
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    isResolved: false
  }
];

export class Database {
  private data: DBStructure;

  constructor() {
    this.data = {
      users: [...DEFAULT_USERS],
      messages: [...DEFAULT_MESSAGES],
      sosAlerts: [...DEFAULT_SOS],
      stats: {
        totalUsers: DEFAULT_USERS.length,
        activeNodes: DEFAULT_USERS.filter((u) => u.status === "online").length,
        messagesSent: 3,
        messagesRelayed: 1,
        averageDeliveryTimeMs: 140,
        networkHealth: 85,
      },
    };
    this.initDB();
  }

  private initDB() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.data = {
          users: parsed.users || [...DEFAULT_USERS],
          messages: parsed.messages || [...DEFAULT_MESSAGES],
          sosAlerts: parsed.sosAlerts || [...DEFAULT_SOS],
          stats: parsed.stats || this.data.stats,
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to initialize JSON database, using memory-backed:", e);
    }
  }

  public save() {
    try {
      // Direct atomic-like write with temp rename
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
      console.error("Failed to write to JSON database:", e);
    }
  }

  // User Operations
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  public createUser(username: string, passwordHash: string): User {
    const newUser: User = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      username,
      passwordHash,
      role: "user",
      status: "online",
      signalStrength: Math.floor(Math.random() * 30) + 70, // 70-100
      batteryLevel: Math.floor(Math.random() * 40) + 60, // 60-100
      coordinates: {
        x: Math.floor(Math.random() * 600) + 200, // 200-800
        y: Math.floor(Math.random() * 400) + 200, // 200-600
      },
      lastSeen: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.updateStats();
    this.save();
    return newUser;
  }

  public updateUserStatus(id: string, status: "online" | "offline") {
    const user = this.getUserById(id);
    if (user) {
      user.status = status;
      user.lastSeen = new Date().toISOString();
      if (status === "offline") {
        user.signalStrength = 0;
      } else if (user.signalStrength === 0) {
        user.signalStrength = Math.floor(Math.random() * 30) + 70;
      }
      this.updateStats();
      this.save();
    }
  }

  public updateUserCoordinates(id: string, x: number, y: number) {
    const user = this.getUserById(id);
    if (user) {
      user.coordinates = { x, y };
      user.lastSeen = new Date().toISOString();
      this.save();
    }
  }

  public updateUserTelemetry(id: string, battery: number, signal: number) {
    const user = this.getUserById(id);
    if (user) {
      user.batteryLevel = Math.max(0, Math.min(100, battery));
      user.signalStrength = Math.max(0, Math.min(100, signal));
      user.lastSeen = new Date().toISOString();
      this.save();
    }
  }

  // Message Operations
  public getMessages(): Message[] {
    return this.data.messages;
  }

  public addMessage(msg: Omit<Message, "id" | "timestamp">): Message {
    const newMsg: Message = {
      ...msg,
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.messages.push(newMsg);

    this.data.stats.messagesSent += 1;
    if (newMsg.hopCount > 1) {
      this.data.stats.messagesRelayed += 1;
    }

    this.updateStats();
    this.save();
    return newMsg;
  }

  public markMessageAsRead(msgId: string, userId: string) {
    const msg = this.data.messages.find((m) => m.id === msgId);
    if (msg && !msg.readBy.includes(userId)) {
      msg.readBy.push(userId);
      this.save();
    }
  }

  // SOS Operations
  public getSOSAlerts(): SOSAlert[] {
    return this.data.sosAlerts;
  }

  public createSOSAlert(
    userId: string,
    username: string,
    message: string,
    severity: "critical" | "warning",
    coordinates: { x: number; y: number }
  ): SOSAlert {
    const newSOS: SOSAlert = {
      id: `sos_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      message,
      severity,
      coordinates,
      timestamp: new Date().toISOString(),
      isResolved: false,
    };
    this.data.sosAlerts.unshift(newSOS); // Place at top
    this.save();
    return newSOS;
  }

  public resolveSOSAlert(sosId: string) {
    const sos = this.data.sosAlerts.find((s) => s.id === sosId);
    if (sos) {
      sos.isResolved = true;
      this.save();
    }
  }

  // Admin and Stats Operations
  public getStats(): SystemStats {
    this.updateStats();
    return this.data.stats;
  }

  private updateStats() {
    const totalUsers = this.data.users.length;
    const activeNodes = this.data.users.filter((u) => u.status === "online").length;

    // Network Health = ratio of connected components / battery levels
    const totalBattery = this.data.users.reduce(
      (sum, u) => sum + (u.status === "online" ? u.batteryLevel : 0),
      0
    );
    const avgBattery = activeNodes > 0 ? totalBattery / activeNodes : 0;
    const networkHealth = Math.round(
      activeNodes > 0
        ? (activeNodes / totalUsers) * 60 + (avgBattery / 100) * 40
        : 0
    );

    this.data.stats.totalUsers = totalUsers;
    this.data.stats.activeNodes = activeNodes;
    this.data.stats.networkHealth = Math.max(0, Math.min(100, networkHealth));
  }
}

export const db = new Database();
