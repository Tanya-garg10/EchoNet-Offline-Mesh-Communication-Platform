import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { User, Message, SOSAlert, SystemStats } from "./types";

import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import MeshMap from "./components/MeshMap";
import ChatPanel from "./components/ChatPanel";
import SOSManager from "./components/SOSManager";
import StatsPanel from "./components/StatsPanel";
import AdminPanel from "./components/AdminPanel";
import RelayLogs from "./components/RelayLogs";
import QRPairingModal from "./components/QRPairingModal";

import {
  Radio,
  MessageSquare,
  AlertTriangle,
  Activity,
  Shield,
  LogOut,
  Battery,
  Signal,
  Flame,
  Volume2,
  VolumeX,
  BatteryWarning,
  AlertOctagon,
  QrCode,
  Sun,
  Moon,
} from "lucide-react";

export default function App() {
  const [inTerminal, setInTerminal] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "sos" | "stats" | "relays" | "admin">("dashboard");

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("echonet_mesh_theme") as "light" | "dark") || "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("echonet_mesh_theme", nextTheme);
  };

  // Core Mesh state
  const [nodes, setNodes] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeNodes: 0,
    messagesSent: 0,
    messagesRelayed: 0,
    averageDeliveryTimeMs: 140,
    networkHealth: 85,
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [transmissionRange, setTransmissionRange] = useState(250);

  // EMI Simulation States
  const [emiEnabled, setEmiEnabled] = useState(false);
  const [emiDropRate, setEmiDropRate] = useState(0.3);
  const [droppedLinks, setDroppedLinks] = useState<{ from: string; to: string }[]>([]);

  // Audio mute helper (for emergency sound synthesizers)
  const [muteAudio, setMuteAudio] = useState(true);

  // Socket instance ref
  const socketRef = useRef<Socket | null>(null);

  // Floating Fullscreen Alarm for critical SOS
  const [incomingSOS, setIncomingSOS] = useState<SOSAlert | null>(null);

  // Low battery tracking states
  const [showLowBatteryAlert, setShowLowBatteryAlert] = useState(false);
  const [lastNotifiedBattery, setLastNotifiedBattery] = useState<number | null>(null);

  // QR Pairing Modal Open State
  const [isQRPairingOpen, setIsQRPairingOpen] = useState(false);

  // 1. Restore Auth token from localStorage on boot
  useEffect(() => {
    const savedToken = localStorage.getItem("echonet_mesh_token");
    const savedUser = localStorage.getItem("echonet_mesh_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
      setInTerminal(true);
    }
  }, []);

  // 2. Load initial data from APIs once logged in and support on-demand refreshes
  const refreshNodesAndState = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Users
      const usersRes = await fetch("/api/users", { headers });
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) setNodes(usersData);

      // Messages
      const msgRes = await fetch("/api/messages", { headers });
      const msgData = await msgRes.json();
      if (Array.isArray(msgData)) setMessages(msgData);

      // SOS
      const sosRes = await fetch("/api/sos", { headers });
      const sosData = await sosRes.json();
      if (Array.isArray(sosData)) setSOSAlerts(sosData);

      // Stats
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      if (statsData && !statsData.error) setStats(statsData);

    } catch (e) {
      console.warn("Failed to load or refresh mesh state:", e);
    }
  };

  useEffect(() => {
    if (!token) return;
    refreshNodesAndState();
  }, [token]);

  // 3. Setup Socket.io-client & listeners
  useEffect(() => {
    if (!token || !currentUser) return;

    // Connect to local host. Since Vite reverse proxies to port 3000, connecting to relative path is standard
    const socket = io();
    socketRef.current = socket;

    // Join room
    socket.emit("join_mesh", { username: currentUser.username });

    // Listeners
    socket.on("mesh_topology_updated", (payload: { users: User[]; stats: SystemStats }) => {
      setNodes(payload.users);
      setStats(payload.stats);
    });

    socket.on("emi_state_updated", (payload: { emiEnabled: boolean; emiDropRate: number; droppedLinks: { from: string; to: string }[] }) => {
      setEmiEnabled(payload.emiEnabled);
      setEmiDropRate(payload.emiDropRate);
      setDroppedLinks(payload.droppedLinks);
    });

    socket.on("telemetry_updated", (payload: { userId: string; batteryLevel: number; signalStrength: number }) => {
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === payload.userId
            ? { ...n, batteryLevel: payload.batteryLevel, signalStrength: payload.signalStrength }
            : n
        )
      );
    });

    socket.on("message_received", (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicate append
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("sos_broadcast", (sos: SOSAlert) => {
      setSOSAlerts((prev) => {
        if (prev.some((s) => s.id === sos.id)) return prev;
        return [sos, ...prev];
      });

      // Sound synthesizer alarm (if unmuted)
      if (!muteAudio) {
        synthesizeAlarm();
      }

      // Display Fullscreen Marquee alarm if critical
      if (sos.severity === "critical") {
        setIncomingSOS(sos);
      }
    });

    socket.on("sos_resolved", (payload: { sosId: string }) => {
      setSOSAlerts((prev) =>
        prev.map((s) => (s.id === payload.sosId ? { ...s, isResolved: true } : s))
      );
    });

    socket.on("node_disconnected", (payload: { userId: string }) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === payload.userId ? { ...n, status: "offline" as const, signalStrength: 0 } : n))
      );
    });

    socket.on("node_reconnected", (payload: { userId: string }) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === payload.userId ? { ...n, status: "online" as const } : n))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token, currentUser]);

  // 4. Telemetry simulation: Deplete battery and fluctuate signal shadows
  useEffect(() => {
    if (!token || !currentUser || currentUser.username === "AI_Dispatcher") return;

    let bat = currentUser.batteryLevel;
    let sig = currentUser.signalStrength;

    const interval = setInterval(() => {
      // Deplete battery slowly
      bat = Math.max(1, bat - 1);
      // Fluctuate signal randomly (shadowing)
      const drift = Math.floor(Math.random() * 11) - 5; // -5 to +5
      sig = Math.max(40, Math.min(100, sig + drift));

      // Update local storage representation
      const updatedUser = { ...currentUser, batteryLevel: bat, signalStrength: sig };
      setCurrentUser(updatedUser);
      localStorage.setItem("echonet_mesh_user", JSON.stringify(updatedUser));

      // Push to backend
      fetch("/api/users/telemetry", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ batteryLevel: bat, signalStrength: sig }),
      }).catch((e) => console.warn("Telemetry report offline:", e));

    }, 35000); // Check and push telemetry every 35 seconds

    return () => clearInterval(interval);
  }, [token, currentUser]);

  // 4b. Monitor Battery level of current user for low power warning (< 15%)
  useEffect(() => {
    if (!currentUser || currentUser.username === "AI_Dispatcher") return;
    
    const bat = currentUser.batteryLevel;
    if (bat < 15) {
      if (lastNotifiedBattery === null || lastNotifiedBattery >= 15) {
        setShowLowBatteryAlert(true);
        setLastNotifiedBattery(bat);
        if (!muteAudio) {
          synthesizeLowBatteryWarningAudio();
        }
      }
    } else {
      setShowLowBatteryAlert(false);
      setLastNotifiedBattery(bat);
    }
  }, [currentUser?.batteryLevel, lastNotifiedBattery, muteAudio]);

  const synthesizeLowBatteryWarningAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(330, ctx.currentTime); // E4
      osc1.frequency.setValueAtTime(220, ctx.currentTime + 0.2); // A3

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.setValueAtTime(440, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context blocked:", e);
    }
  };

  // 5. Sound Synthesizer (Standard Web Audio API - no third party dependencies, 100% robust)
  const synthesizeAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 frequency
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6); // Sweep down

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio Context blocked by browser safety standard:", e);
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setCurrentUser(newUser);
    localStorage.setItem("echonet_mesh_token", newToken);
    localStorage.setItem("echonet_mesh_user", JSON.stringify(newUser));
    setInTerminal(true);
  };

  const handleLogout = () => {
    // Notify server of offline status
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    localStorage.removeItem("echonet_mesh_token");
    localStorage.removeItem("echonet_mesh_user");
    setToken(null);
    setCurrentUser(null);
    setInTerminal(false);
    setActiveTab("dashboard");
  };

  const handleSendMessage = (receiverId: string, receiverName: string, text: string, isEncrypted: boolean) => {
    if (!socketRef.current || !currentUser) return;

    socketRef.current.emit("send_message", {
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      receiverName,
      text,
      isEncrypted,
    });
  };

  const handleTriggerSOS = (message: string, severity: "critical" | "warning") => {
    if (!socketRef.current || !currentUser) return;

    socketRef.current.emit("send_sos", {
      username: currentUser.username,
      message,
      severity,
    });
  };

  const handleResolveSOS = async (sosId: string) => {
    if (!token) return;
    try {
      await fetch("/api/sos/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sosId }),
      });
    } catch (e) {
      console.warn("SOS resolve failed:", e);
    }
  };

  const handleUpdateCoordinates = (x: number, y: number) => {
    if (!socketRef.current || !currentUser) return;

    socketRef.current.emit("update_coordinates", {
      username: currentUser.username,
      x,
      y,
    });

    // Update locally in currentUser state to prevent snapback
    setCurrentUser((prev: any) => {
      if (!prev) return null;
      const updated = { ...prev, coordinates: { x, y } };
      localStorage.setItem("echonet_mesh_user", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin simulation overrides
  const handleDisconnectNode = async (userId: string) => {
    if (!token) return;
    try {
      await fetch("/api/admin/blackout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: userId, action: "disconnect" }),
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleReconnectNode = async (userId: string) => {
    if (!token) return;
    try {
      await fetch("/api/admin/blackout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: userId, action: "reconnect" }),
      });
    } catch (e) {
      console.warn(e);
    }
  };

  // Find active distress marquee
  const unresolvedSOS = sosAlerts.filter((s) => !s.isResolved && s.severity === "critical");

  if (!inTerminal) {
    return <LandingPage onEnter={() => setInTerminal(true)} />;
  }

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} onBack={() => setInTerminal(false)} />;
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none pb-8 transition-colors duration-300 ${
      theme === "light" ? "bg-[#f8fafc] text-slate-800" : "bg-slate-950 text-slate-100"
    }`}>
      {/* Low Battery Warning Toast Notification */}
      {showLowBatteryAlert && (
        <div 
          id="low-battery-notification"
          className="fixed bottom-6 right-6 z-50 bg-red-950 border-2 border-red-500 rounded-xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] max-w-sm w-full animate-pulse flex flex-col gap-2.5 font-mono"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-900/60 rounded-lg border border-red-500/40 text-red-400">
              <AlertOctagon className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase text-red-200 tracking-wider">
                Critical Telemetry Warning
              </h4>
              <p className="text-[10px] text-red-300 mt-1 leading-relaxed">
                Node battery is critically low at <strong className="text-white underline">{currentUser?.batteryLevel}%</strong>. Transceiver range may decay. Connect to the mesh power grid.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end mt-1">
            <button
              id="btn-dismiss-battery-warning"
              onClick={() => setShowLowBatteryAlert(false)}
              className="px-2.5 py-1 bg-red-900/40 border border-red-700/60 hover:bg-red-900/80 rounded text-[10px] font-bold text-red-300 transition-colors uppercase"
            >
              Acknowledge
            </button>
            <button
              id="btn-charge-battery-sim"
              onClick={() => {
                const chargedUser = { ...currentUser, batteryLevel: 100 };
                setCurrentUser(chargedUser);
                localStorage.setItem("echonet_mesh_user", JSON.stringify(chargedUser));
                setShowLowBatteryAlert(false);
                setLastNotifiedBattery(100);
                
                // Push update to backend
                fetch("/api/users/telemetry", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ batteryLevel: 100, signalStrength: currentUser.signalStrength }),
                }).catch((e) => console.warn("Telemetry report offline:", e));
              }}
              className="px-2.5 py-1 bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 rounded text-[10px] font-bold text-slate-100 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all uppercase"
            >
              🔌 Re-Charge (100%)
            </button>
          </div>
        </div>
      )}

      {/* 1. Global Flashing Distress Marquee (Shows if any unresolved critical alert exists) */}
      {unresolvedSOS.length > 0 && (
        <div className="bg-red-950/95 text-red-200 border-b border-red-500 py-1.5 px-4 text-xs font-mono flex items-center justify-between z-40 relative animate-pulse">
          <div className="flex items-center gap-2 overflow-hidden">
            <Flame className="w-4 h-4 text-red-500 animate-bounce" />
            <span className="font-bold uppercase tracking-widest text-[10px] text-red-400">🚨 distress flood:</span>
            <marquee scrollamount="4" className="w-96 md:w-[600px]">
              {unresolvedSOS.map((s) => `[Node @${s.username} - Distress Alert: "${s.message}"]`).join("  ||  ")}
            </marquee>
          </div>
          <button
            onClick={() => setActiveTab("sos")}
            className="text-[9px] bg-red-900/60 border border-red-700 hover:bg-red-900 rounded px-2 py-0.5 uppercase font-bold text-red-200 transition-all cursor-pointer"
          >
            Route triage
          </button>
        </div>
      )}

      {/* 2. Fullscreen Tactical Interrupt Alarm Overlay */}
      {incomingSOS && (
        <div className="fixed inset-0 bg-slate-950/95 border-4 border-red-600 flex items-center justify-center p-6 z-50 animate-fade-in backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-5 relative shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-mono uppercase text-red-400 tracking-wider">
                INCOMING EMERGENCY DISTRESS
              </h3>
              <p className="text-[10px] font-mono text-slate-500 uppercase">
                COORDINATES CAPTURED ON PHYSICAL TRANSCEIVER
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg text-left space-y-2">
              <p className="text-xs font-mono text-slate-400">
                <span className="text-red-400 font-bold">NODE:</span> @{incomingSOS.username}
              </p>
              <p className="text-xs font-mono text-slate-400">
                <span className="text-red-400 font-bold">DISTRESS TEXT:</span> "{incomingSOS.message}"
              </p>
              <p className="text-xs font-mono text-slate-400">
                <span className="text-red-400 font-bold">COORDS:</span> x={incomingSOS.coordinates.x}, y={incomingSOS.coordinates.y}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-dismiss-incoming-alarm"
                onClick={() => setIncomingSOS(null)}
                className="flex-1 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-slate-400 transition-colors"
              >
                Dismiss Indicator
              </button>
              <button
                id="btn-route-triage-alarm"
                onClick={() => {
                  setIncomingSOS(null);
                  setActiveTab("sos");
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-slate-100 transition-colors border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                Triage Beacon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Header */}
      <header className={`px-6 py-4 flex items-center justify-between flex-wrap gap-4 z-20 transition-colors border-b ${
        theme === "light" 
          ? "bg-white border-slate-200/80 text-slate-800 shadow-sm" 
          : "bg-slate-900 border-slate-800/80 text-slate-100"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
            theme === "light" ? "bg-cyan-50 border-cyan-200" : "bg-cyan-950 border-cyan-400/40"
          }`}>
            <Radio className="w-5 h-5 text-cyan-500 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-lg uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-emerald-500 font-sans">
              EchoNet
            </span>
            <span className={`text-[9px] font-mono uppercase tracking-widest block leading-none ${
              theme === "light" ? "text-cyan-600" : "text-cyan-400"
            }`}>
              offline mesh console
            </span>
          </div>
        </div>

        {/* Local Telemetry readout */}
        {currentUser && (
          <div className={`flex items-center gap-4 text-xs font-mono ${
            theme === "light" ? "text-slate-600" : "text-slate-400"
          }`}>
            <div className="flex items-center gap-1.5" title="Local node callsign">
              <span className={`text-[10px] uppercase ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}>node:</span>
              <span className={`font-bold ${theme === "light" ? "text-slate-850" : "text-slate-200"}`}>@{currentUser.username}</span>
            </div>

            {currentUser.username !== "AI_Dispatcher" && (
              <>
                <div 
                  id="header-battery-telemetry"
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-300 border ${
                    currentUser.batteryLevel < 15
                      ? "bg-red-950/60 border-red-500/60 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)] font-bold"
                      : "border-transparent text-slate-400"
                  }`}
                  title={currentUser.batteryLevel < 15 ? "CRITICAL BATTERY LEVEL - BELOW 15%" : "Local node battery level"}
                >
                  {currentUser.batteryLevel < 15 ? (
                    <BatteryWarning className="w-4 h-4 text-red-400 animate-bounce" />
                  ) : (
                    <Battery className={`w-4 h-4 ${currentUser.batteryLevel > 30 ? "text-slate-500" : "text-amber-500"}`} />
                  )}
                  <span className={
                    currentUser.batteryLevel < 15 
                      ? "text-red-200" 
                      : currentUser.batteryLevel > 30 
                      ? (theme === "light" ? "text-slate-700" : "text-slate-200")
                      : "text-amber-500 font-bold"
                  }>
                    {currentUser.batteryLevel}%
                  </span>

                  {/* Built-in test simulation presets */}
                  <div className={`flex items-center gap-1 ml-1 px-1 py-0.5 rounded border ${
                    theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                  }`}>
                    {currentUser.batteryLevel >= 15 ? (
                      <button
                        id="btn-sim-low-battery"
                        onClick={() => {
                          const lowUser = { ...currentUser, batteryLevel: 10 };
                          setCurrentUser(lowUser);
                          localStorage.setItem("echonet_mesh_user", JSON.stringify(lowUser));
                          // Report telemetry update
                          fetch("/api/users/telemetry", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ batteryLevel: 10, signalStrength: currentUser.signalStrength }),
                          }).catch((e) => console.warn(e));
                        }}
                        className="text-[8px] text-red-500 hover:text-red-600 font-bold px-1 rounded transition-all font-mono"
                        title="Simulate Low Battery (10%)"
                      >
                        SIM 10%
                      </button>
                    ) : (
                      <button
                        id="btn-sim-full-battery"
                        onClick={() => {
                          const normalUser = { ...currentUser, batteryLevel: 85 };
                          setCurrentUser(normalUser);
                          localStorage.setItem("echonet_mesh_user", JSON.stringify(normalUser));
                          // Report telemetry update
                          fetch("/api/users/telemetry", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ batteryLevel: 85, signalStrength: currentUser.signalStrength }),
                          }).catch((e) => console.warn(e));
                        }}
                        className="text-[8px] text-emerald-600 hover:text-emerald-500 font-bold px-1 rounded transition-all font-mono"
                        title="Simulate Nominal Battery (85%)"
                      >
                        RESET
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5" title="Local transceiving strength">
                  <Signal className="w-4 h-4 text-slate-500" />
                  <span className={theme === "light" ? "text-slate-700" : "text-slate-200"}>{currentUser.signalStrength}%</span>
                </div>
              </>
            )}

            {/* QR Pairing Trigger */}
            <button
              id="btn-qr-pairing-trigger"
              onClick={() => setIsQRPairingOpen(true)}
              className={`flex items-center gap-1.5 p-1.5 rounded border transition-colors ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-cyan-600 hover:bg-slate-100"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-cyan-400"
              }`}
              title="Open secure node QR code pairing"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-wider px-1 hidden sm:inline">QR Pair</span>
            </button>

            {/* Synthesizer alarm audio toggle */}
            <button
              onClick={() => {
                setMuteAudio(!muteAudio);
                if (muteAudio) synthesizeAlarm(); // Quick feedback chirp
              }}
              className={`p-1.5 rounded border transition-colors ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  : "bg-slate-950 border-slate-800 hover:text-cyan-400"
              }`}
              title={muteAudio ? "Unmute emergency warning alarms" : "Mute warning alarms"}
            >
              {muteAudio ? <VolumeX className={`w-4 h-4 ${theme === "light" ? "text-slate-400" : "text-slate-500"}`} /> : <Volume2 className="w-4 h-4 text-cyan-500" />}
            </button>

            {/* Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className={`p-1.5 rounded border transition-all ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200 text-amber-500 hover:bg-slate-100 hover:text-amber-600"
                  : "bg-slate-950 border-slate-800 text-cyan-400 hover:text-cyan-300"
              }`}
              title={theme === "light" ? "Tactical Dark Mode" : "High-Contrast Light Mode"}
            >
              {theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
              activeTab === "dashboard"
                ? (theme === "light" ? "bg-slate-100 border-slate-200 text-cyan-600 font-bold" : "bg-slate-950 border-cyan-500/30 text-cyan-400")
                : (theme === "light" ? "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
            }`}
          >
            Overview
          </button>
          <button
            id="tab-chat"
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
              activeTab === "chat"
                ? (theme === "light" ? "bg-slate-100 border-slate-200 text-cyan-600 font-bold" : "bg-slate-950 border-cyan-500/30 text-cyan-400")
                : (theme === "light" ? "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
            }`}
          >
            Chat
          </button>
          <button
            id="tab-sos"
            onClick={() => setActiveTab("sos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
              activeTab === "sos"
                ? (theme === "light" ? "bg-slate-100 border-slate-200 text-red-600 font-bold" : "bg-slate-950 border-red-500/30 text-red-400")
                : (theme === "light" ? "border-transparent text-slate-600 hover:text-red-700 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
            }`}
          >
            Distress
          </button>
          <button
            id="tab-stats"
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
              activeTab === "stats"
                ? (theme === "light" ? "bg-slate-100 border-slate-200 text-cyan-600 font-bold" : "bg-slate-950 border-cyan-500/30 text-cyan-400")
                : (theme === "light" ? "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
            }`}
          >
            Analytics
          </button>
          <button
            id="tab-relays"
            onClick={() => setActiveTab("relays")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
              activeTab === "relays"
                ? (theme === "light" ? "bg-slate-100 border-slate-200 text-cyan-600 font-bold" : "bg-slate-950 border-cyan-500/30 text-cyan-400")
                : (theme === "light" ? "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
            }`}
          >
            Relay Logs
          </button>

          {/* Admin panel only visible to AI_Dispatcher or admin users */}
          {currentUser?.role === "admin" && (
            <button
              id="tab-admin"
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTab === "admin"
                  ? (theme === "light" ? "bg-slate-100 border-slate-200 text-amber-600 font-bold" : "bg-slate-950 border-amber-500/30 text-amber-400")
                  : (theme === "light" ? "border-transparent text-slate-600 hover:text-amber-700 hover:bg-slate-50" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40")
              }`}
            >
              Control
            </button>
          )}

          <button
            id="btn-logout"
            onClick={handleLogout}
            className={`p-1.5 transition-colors ml-4 border border-transparent rounded ${
              theme === "light"
                ? "text-slate-500 hover:text-red-650 hover:bg-slate-100"
                : "text-slate-500 hover:text-red-400 hover:bg-slate-850"
            }`}
            title="Disconnect terminal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </header>

      {/* 4. Active Tab Stage Wrapper */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1">
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Mesh Map covers 2 columns */}
            <div className="lg:col-span-2 h-full">
              <MeshMap
                nodes={nodes}
                currentUser={currentUser}
                activePath={activePath}
                onUpdateCoordinates={handleUpdateCoordinates}
                transmissionRange={transmissionRange}
                droppedLinks={droppedLinks}
                emiEnabled={emiEnabled}
                theme={theme}
              />
            </div>

            {/* Quick overview panels */}
            <div className="space-y-6">
              
              {/* Mesh Status Card */}
              <div className={`border rounded-xl p-5 backdrop-blur transition-all ${
                theme === "light" ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
              }`}>
                <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3.5 flex items-center gap-1.5 ${
                  theme === "light" ? "text-slate-800" : "text-slate-300"
                }`}>
                  <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
                  Local Mesh Status report
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 border rounded-lg ${
                    theme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-950/60 border-slate-900"
                  }`}>
                    <p className="text-[9px] font-mono text-slate-500 uppercase">Operational components</p>
                    <p className={`text-xl font-bold font-mono mt-0.5 ${
                      theme === "light" ? "text-slate-800" : "text-slate-200"
                    }`}>
                      {nodes.filter((n) => n.status === "online").length} Nodes
                    </p>
                  </div>
                  <div className={`p-3 border rounded-lg ${
                    theme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-950/60 border-slate-900"
                  }`}>
                    <p className="text-[9px] font-mono text-slate-500 uppercase">Coverage health</p>
                    <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">{stats.networkHealth}%</p>
                  </div>
                </div>

                <div className={`mt-4 p-3.5 rounded-lg text-xs font-mono leading-relaxed border ${
                  theme === "light" ? "bg-slate-50 border-slate-150 text-slate-600" : "bg-slate-950/30 border-slate-850 text-slate-400"
                }`}>
                  <p className={`font-bold flex items-center gap-1 text-[11px] uppercase mb-1 ${
                    theme === "light" ? "text-slate-800" : "text-slate-300"
                  }`}>
                    <Shield className="w-3.5 h-3.5 text-cyan-500" /> Tactical Instruction
                  </p>
                  Click the <strong className={`font-bold ${theme === "light" ? "text-cyan-600" : "text-cyan-300"}`}>Chat tab</strong> to select a peer on the left pane and write a message. EchoNet will pathfind the shortest route through intermediate online nodes in real-time, displaying the relay pulse path on the map above.
                </div>
              </div>

              {/* Signal Simulation panel (EMI) */}
              <div className={`border rounded-xl p-5 backdrop-blur space-y-4 animate-fade-in transition-all ${
                theme === "light" ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
              }`} id="signal-simulation-panel">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === "light" ? "text-slate-800" : "text-slate-300"
                  }`}>
                    <Radio className={`w-4 h-4 ${emiEnabled ? "text-amber-500 animate-pulse" : "text-cyan-500"}`} />
                    Signal Simulation
                  </h4>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${
                    emiEnabled 
                      ? "bg-amber-950/40 text-amber-400 border-amber-900/60" 
                      : (theme === "light" ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-slate-950/60 text-slate-500 border-slate-900")
                  }`}>
                    {emiEnabled ? "EMI ACTIVE" : "NOMINAL"}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                  Toggle Electromagnetic Interference (EMI) to simulate dynamic local jamming. EchoNet routes packets dynamically around severed links in real-time.
                </p>

                {/* Toggle & Drop Rate Control */}
                <div className={`space-y-3 p-3 rounded-lg border ${
                  theme === "light" ? "bg-slate-50 border-slate-150" : "bg-slate-950/50 border-slate-900"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-medium ${
                      theme === "light" ? "text-slate-700" : "text-slate-300"
                    }`}>Enable EMI Jamming</span>
                    <button
                      id="toggle-emi-switch"
                      type="button"
                      onClick={() => {
                        const nextState = !emiEnabled;
                        setEmiEnabled(nextState);
                        if (socketRef.current) {
                          socketRef.current.emit("set_emi", { enabled: nextState, dropRate: emiDropRate });
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        emiEnabled ? "bg-amber-500" : (theme === "light" ? "bg-slate-200" : "bg-slate-800")
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                          emiEnabled ? "translate-x-4 bg-slate-950" : "translate-x-0 bg-white"
                        }`}
                      />
                    </button>
                  </div>

                  {emiEnabled && (
                    <div className={`space-y-2 pt-2 border-t ${theme === "light" ? "border-slate-150" : "border-slate-900"}`}>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Interference Severity:</span>
                        <span className="text-amber-500 font-bold">{Math.round(emiDropRate * 100)}% drops</span>
                      </div>
                      <input
                        id="emi-drop-rate-slider"
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={emiDropRate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setEmiDropRate(val);
                          if (socketRef.current) {
                            socketRef.current.emit("set_emi", { enabled: emiEnabled, dropRate: val });
                          }
                        }}
                        className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-amber-500 ${
                          theme === "light" ? "bg-slate-200" : "bg-slate-800"
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Active EMI Drops Monitor / Jam log */}
                {emiEnabled && (
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Jammed Connections ({droppedLinks.length})</span>
                    {droppedLinks.length === 0 ? (
                      <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-2.5 rounded-lg">
                        ⚡ Grid Interference in progress. Selecting victim links...
                      </div>
                    ) : (
                      <div className={`border rounded-lg p-2 max-h-28 overflow-y-auto space-y-1.5 scrollbar-thin ${
                        theme === "light" ? "bg-slate-50 border-slate-150" : "bg-slate-950/80 border-slate-900"
                      }`}>
                        {droppedLinks.map((link, idx) => (
                          <div key={idx} className={`flex items-center justify-between font-mono text-[9px] ${
                            theme === "light" ? "text-slate-700" : "text-slate-300"
                          }`}>
                            <span>@{link.from} ⚡ @{link.to}</span>
                            <span className="text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-950/60 px-1 py-0.2 rounded border border-red-200 dark:border-red-900/40 text-[8px] font-bold">JAMMED</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Distress alerts quick view */}
              <div className={`border rounded-xl p-5 backdrop-blur transition-all ${
                theme === "light" ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
              }`}>
                <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3.5 flex items-center justify-between ${
                  theme === "light" ? "text-slate-850" : "text-slate-300"
                }`}>
                  <span>Active Distress Feeds</span>
                  <span className="text-[10px] bg-red-50 border border-red-200 text-red-600 dark:bg-red-950 dark:text-red-400 dark:border-red-900 px-1.5 py-0.2 rounded font-bold uppercase">
                    {sosAlerts.filter((s) => !s.isResolved).length} distress
                  </span>
                </h4>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {sosAlerts.filter((s) => !s.isResolved).length === 0 ? (
                    <div className="text-center py-6 font-mono text-[11px] text-slate-500 border border-dashed border-slate-200 dark:border-slate-850 rounded-lg">
                      Nominal state. No active distress feeds.
                    </div>
                  ) : (
                    sosAlerts
                      .filter((s) => !s.isResolved)
                      .map((sos) => (
                        <div
                          key={sos.id}
                          onClick={() => setActiveTab("sos")}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-red-500/40 text-left ${
                            theme === "light" ? "bg-slate-50 border-slate-150" : "bg-slate-950/80 border-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                            <span className="text-red-500 uppercase">@{sos.username}</span>
                            <span className="text-slate-500">{new Date(sos.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className={`text-[11px] font-mono mt-1 truncate ${
                            theme === "light" ? "text-slate-700" : "text-slate-300"
                          }`}>{sos.message}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <ChatPanel
            messages={messages}
            users={nodes}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            activePathCallback={setActivePath}
            theme={theme}
          />
        )}

        {activeTab === "sos" && (
          <SOSManager
            alerts={sosAlerts}
            currentUser={currentUser}
            onTriggerSOS={handleTriggerSOS}
            onResolveSOS={handleResolveSOS}
            theme={theme}
          />
        )}

        {activeTab === "stats" && (
          <StatsPanel
            stats={stats}
            nodes={nodes}
            messages={messages}
            currentUser={currentUser}
            theme={theme}
          />
        )}

        {activeTab === "relays" && (
          <RelayLogs
            messages={messages}
            nodes={nodes}
            currentUser={currentUser}
            theme={theme}
          />
        )}

        {activeTab === "admin" && currentUser?.role === "admin" && (
          <AdminPanel
            nodes={nodes}
            stats={stats}
            currentUser={currentUser}
            onDisconnectNode={handleDisconnectNode}
            onReconnectNode={handleReconnectNode}
            transmissionRange={transmissionRange}
            setTransmissionRange={setTransmissionRange}
            theme={theme}
          />
        )}
      </main>

      {/* QR Pairing Modal */}
      <QRPairingModal
        isOpen={isQRPairingOpen}
        onClose={() => setIsQRPairingOpen(false)}
        currentUser={currentUser}
        token={token}
        onNodeAdded={refreshNodesAndState}
        theme={theme}
      />
    </div>
  );
}
