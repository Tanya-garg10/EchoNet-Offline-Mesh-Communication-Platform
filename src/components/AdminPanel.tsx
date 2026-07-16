import { useState, useEffect } from "react";
import { User, SystemStats } from "../types";
import { Shield, Radio, Terminal, CloudLightning, RotateCcw, AlertTriangle, Zap, Server } from "lucide-react";

interface AdminPanelProps {
  nodes: User[];
  stats: SystemStats;
  currentUser: any;
  onDisconnectNode: (userId: string) => void;
  onReconnectNode: (userId: string) => void;
  transmissionRange: number;
  setTransmissionRange: (val: number) => void;
  theme?: "light" | "dark";
}

export default function AdminPanel({
  nodes,
  stats,
  currentUser,
  onDisconnectNode,
  onReconnectNode,
  transmissionRange,
  setTransmissionRange,
  theme = "light",
}: AdminPanelProps) {
  const isLight = theme === "light";
  const [logs, setLogs] = useState<string[]>([]);
  const [isSolarStorm, setIsSolarStorm] = useState(false);

  // Add initial mock logs
  useEffect(() => {
    const initLogs = [
      `[LOGS init] EchoNet Core Version 1.0.4 loaded. Ready for mesh ingestion...`,
      `[LOGS auth] Secure key storage initialized. JWT encryption online.`,
      `[LOGS routes] BFS pathfinding pre-cached. Direct transceive radius set to ${transmissionRange}m.`,
      `[LOGS telemetry] System reports ${nodes.filter((n) => n.status === "online").length} operational nodes.`
    ];
    setLogs(initLogs);
  }, []);

  // Periodically add random mesh logs for atmosphere
  useEffect(() => {
    const logPool = [
      "Node_Beta received beacon packet from Node_Alpha. RSSI: -68dBm, battery 84%",
      "E2EE packet signed & encapsulated with AES-GCM-256 by Node_Gamma",
      "AI_Dispatcher processed query queue. Routing safety triage handbook",
      "Network signal decay adjusted due to simulated low-orbit alien satellite activity",
      "Telemetry sync successfully completed for Node_Epsilon via Node_Delta relay",
      "Warning: Solar shielding active on local transceiver Alpha",
      "Spore index tracking system reports nominal outdoor concentration levels"
    ];

    const interval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${timestamp}] ${randomLog}`, ...prev.slice(0, 25)]);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  const triggerSolarStorm = () => {
    setIsSolarStorm(true);
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${timestamp}] ⚠️ DANGER: SOLAR FLARE INDUCING EMP WAVE! Telemetry degraded!`,
      `[${timestamp}] Wireless signals decay rapidly. Comm links severed!`,
      ...prev
    ]);

    // Save previous range and reduce it
    const oldRange = transmissionRange;
    setTransmissionRange(120);

    setTimeout(() => {
      setIsSolarStorm(false);
      setTransmissionRange(oldRange);
      const endTimestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${endTimestamp}] ✅ Solar flare EMP cleared. Re-establishing standard ${oldRange}m range.`,
        ...prev
      ]);
    }, 15000);
  };

  const addManualLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${text}`, ...prev]);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Range & Simulation Overrides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Slider control */}
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-850" : "bg-slate-900/50 border-slate-800 text-slate-100"
        }`}>
          <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <Radio className="w-4 h-4 text-cyan-500" />
            Transceiver Signal Range ({transmissionRange}m)
          </h4>
          <p className="text-[10px] text-slate-500 font-mono mb-4 leading-relaxed">
            Manipulate the maximum distance wireless waves can travel. Decreasing this simulates storms, solar decay, or subterranean blockades, forcing messages to take more hops or fail entirely!
          </p>

          <div className="space-y-3">
            <input
              id="slider-range"
              type="range"
              min="100"
              max="400"
              step="10"
              value={transmissionRange}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTransmissionRange(val);
                addManualLog(`Signal transmission range modified to ${val} meters.`);
              }}
              className="w-full accent-cyan-500 cursor-pointer bg-slate-950 rounded-lg h-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>100m (Weak)</span>
              <span>250m (Standard)</span>
              <span>400m (Amplified)</span>
            </div>
          </div>
        </div>

        {/* Tactical Overrides */}
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-850" : "bg-slate-900/50 border-slate-800 text-slate-100"
        }`}>
          <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <CloudLightning className="w-4 h-4 text-amber-500 animate-pulse" />
            Simulated Space Disasters
          </h4>
          <p className="text-[10px] text-slate-500 font-mono mb-4 leading-relaxed">
            Trigger simulated physical disasters that temporarily impair signal ranges across the entire grid or scramble peer cryptographic keys.
          </p>

          <div className="space-y-2">
            <button
              id="btn-trigger-storm"
              onClick={triggerSolarStorm}
              disabled={isSolarStorm}
              className={`w-full py-2.5 rounded-lg border text-xs font-mono font-bold uppercase transition-all ${
                isSolarStorm
                  ? "bg-red-950/40 border-red-500 text-red-400 animate-pulse"
                  : isLight 
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-250 text-amber-600 hover:text-amber-700 font-bold"
                  : "bg-slate-950 border-slate-800 hover:border-amber-500/40 text-amber-400 hover:text-amber-300"
              }`}
            >
              {isSolarStorm ? "🔥 EMP FLUX ACTIVE (15s)" : "⚡ Trigger EMP / Solar Storm"}
            </button>
            <p className="text-[9px] text-slate-500 text-center font-mono italic">
              Reduces transceiver range to 120m, severing long-range routing pipelines!
            </p>
          </div>
        </div>

        {/* Node Kill switches */}
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-850" : "bg-slate-900/50 border-slate-800 text-slate-100"
        }`}>
          <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <Zap className="w-4 h-4 text-red-500" />
            Physical Node Killswitches
          </h4>
          <p className="text-[10px] text-slate-500 font-mono mb-3 leading-relaxed">
            Manually disrupt a node's power supply to simulate physical capture, battery death, or destruction by the alien invaders.
          </p>

          <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
            {nodes
              .filter((n) => n.id !== "system_ai")
              .map((n) => {
                const isOnline = n.status === "online";
                return (
                  <div key={n.id} className={`flex items-center justify-between p-2 rounded border ${
                    isLight ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-900"
                  }`}>
                    <span className={`text-[11px] font-mono font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>@{n.username}</span>
                    <button
                      onClick={() => {
                        if (isOnline) {
                          onDisconnectNode(n.id);
                          addManualLog(`Node @${n.username} forcibly disconnected from local mesh.`);
                        } else {
                          onReconnectNode(n.id);
                          addManualLog(`Node @${n.username} battery cell restored. Reconnected.`);
                        }
                      }}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-colors ${
                        isOnline
                          ? "bg-red-50 border border-red-200 text-red-750 hover:bg-red-100 dark:bg-red-950/60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/40"
                          : "bg-emerald-50 border border-emerald-200 text-emerald-750 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                      }`}
                    >
                      {isOnline ? "Force Kill" : "Restore Power"}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 2. Console Logs terminal */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col h-80 relative overflow-hidden">
        <div className="absolute top-2 right-4 text-[10px] text-emerald-600 font-mono flex items-center gap-1">
          <Server className="w-3.5 h-3.5 animate-pulse" />
          <span>MESH SERVER PROCESS_STDOUT</span>
        </div>

        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-slate-400" />
          Tactical Command audit logs
        </h3>

        {/* Real-time terminal lines */}
        <div className="flex-1 overflow-y-auto font-mono text-[11px] text-emerald-500/90 space-y-1.5 pr-2 select-text selection:bg-emerald-800 selection:text-white">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap hover:bg-slate-900/45 px-1 rounded">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
