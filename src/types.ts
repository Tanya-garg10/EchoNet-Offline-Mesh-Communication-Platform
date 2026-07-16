export interface User {
  id: string;
  username: string;
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
  relayPath: string[];
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
  networkHealth: number;
}
