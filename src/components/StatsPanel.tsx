import React, { useState, useEffect } from "react";
import { User, Message, SystemStats } from "../types";
import { 
  Activity, 
  Battery, 
  MessageSquare, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Info, 
  Gauge, 
  ZapOff, 
  CheckCircle 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";

interface StatsPanelProps {
  stats: SystemStats;
  nodes: User[];
  messages: Message[];
  currentUser?: any;
}

interface StatsPanelProps {
  stats: SystemStats;
  nodes: User[];
  messages: Message[];
  currentUser?: any;
  theme?: "light" | "dark";
}

export default function StatsPanel({ stats, nodes, messages, currentUser, theme = "light" }: StatsPanelProps) {
  const isLight = theme === "light";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`border p-2.5 rounded-lg shadow-xl font-mono text-[10px] ${
          isLight ? "bg-white border-slate-200 text-slate-700 shadow-sm" : "bg-slate-950/95 border-2 border-slate-800 text-slate-300"
        }`}>
          <p className={isLight ? "text-slate-400" : "text-slate-400"}>Time Interval: <span className={`font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>{payload[0].payload.timeLabel}</span></p>
          <p className="text-cyan-500 mt-1">Battery Reserve: <span className={`font-bold ${isLight ? "text-cyan-600" : "text-white"}`}>{payload[0].value}%</span></p>
        </div>
      );
    }
    return null;
  };
  const onlineNodes = nodes.filter((u) => u.status === "online");
  const offlineNodes = nodes.filter((u) => u.status === "offline");

  // Load or generate battery history
  const [batteryHistory, setBatteryHistory] = useState<{ timeLabel: string; battery: number; timestamp: number }[]>([]);
  const [depletionRate, setDepletionRate] = useState<number>(0);
  const [estSurvivalMin, setEstSurvivalMin] = useState<number | string>("Infinite");

  useEffect(() => {
    if (!currentUser) return;

    const storageKey = `echonet_battery_history_${currentUser.username}`;
    const saved = localStorage.getItem(storageKey);
    let historyData: { timestamp: number; battery: number }[] = [];

    if (saved) {
      try {
        historyData = JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse battery history", e);
      }
    }

    const now = Date.now();
    // If no history exists, or it has been cleared, initialize 7 points (every 10 minutes for last 60 minutes)
    if (historyData.length === 0) {
      for (let i = 6; i >= 0; i--) {
        const timestamp = now - i * 10 * 60 * 1000;
        // Mock a steady depletion backwards
        const battery = Math.min(100, Math.max(1, currentUser.batteryLevel + i * 2));
        historyData.push({ timestamp, battery });
      }
      localStorage.setItem(storageKey, JSON.stringify(historyData));
    } else {
      // Keep the final entry perfectly synchronized with the current live battery level
      const lastIndex = historyData.length - 1;
      if (historyData[lastIndex].battery !== currentUser.batteryLevel) {
        const timeDiff = now - historyData[lastIndex].timestamp;
        
        // If more than 3 minutes passed since last log, push a new point
        if (timeDiff > 3 * 60 * 1000) {
          historyData.push({ timestamp: now, battery: currentUser.batteryLevel });
          if (historyData.length > 10) historyData.shift();
        } else {
          // Otherwise update the latest reading live
          historyData[lastIndex] = { timestamp: historyData[lastIndex].timestamp, battery: currentUser.batteryLevel };
        }
        localStorage.setItem(storageKey, JSON.stringify(historyData));
      }
    }

    // Map to chart display objects
    const displayData = historyData.map((pt) => {
      const minutesAgo = Math.round((now - pt.timestamp) / 60000);
      let label = "Now";
      if (minutesAgo > 0) {
        label = `-${minutesAgo}m`;
      }
      return {
        timeLabel: label,
        battery: pt.battery,
        timestamp: pt.timestamp
      };
    });

    setBatteryHistory(displayData);

    // Calculate hourly battery depletion rate and remaining run-time
    if (historyData.length > 1) {
      const startBattery = historyData[0].battery;
      const endBattery = historyData[historyData.length - 1].battery;
      const rate = startBattery - endBattery;
      setDepletionRate(rate > 0 ? rate : 0);

      if (rate > 0) {
        const minutesTracked = (historyData[historyData.length - 1].timestamp - historyData[0].timestamp) / 60000;
        const ratePerMinute = rate / (minutesTracked || 60);
        const minsLeft = currentUser.batteryLevel / (ratePerMinute || 0.05);
        setEstSurvivalMin(Math.round(minsLeft));
      } else {
        setEstSurvivalMin("Infinite (Steady)");
      }
    } else {
      setDepletionRate(2);
      setEstSurvivalMin(Math.round(currentUser.batteryLevel / 0.03));
    }
  }, [currentUser?.batteryLevel, currentUser?.username]);

  // Calculate relay load statistics: count how many times each user appeared in a message's relayPath (excluding origin/destination or just counting overall bridging)
  const relayCounts: Record<string, number> = {};
  messages.forEach((msg) => {
    if (msg.relayPath && msg.relayPath.length > 2) {
      // It's a multi-hop message. The intermediate nodes did the relaying!
      const intermediates = msg.relayPath.slice(1, -1);
      intermediates.forEach((nodename) => {
        relayCounts[nodename] = (relayCounts[nodename] || 0) + 1;
      });
    }
  });

  // Top active relays to display
  const relayLoadData = Object.entries(relayCounts)
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count);

  // Fill in some default values if empty
  if (relayLoadData.length === 0) {
    relayLoadData.push({ username: "Node_Beta", count: 2 });
    relayLoadData.push({ username: "AI_Dispatcher", count: 1 });
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Statistics Cards Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Card 1 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-total-nodes">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Total Nodes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold font-sans ${isLight ? "text-slate-800" : "text-slate-100"}`}>{stats.totalUsers}</span>
            <span className="text-[10px] text-slate-500 font-mono">registered</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div className="bg-cyan-500 h-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Card 2 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-active-relays">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Active Relays</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-sans text-emerald-500">{stats.activeNodes}</span>
            <span className="text-[10px] text-slate-500 font-mono">online</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(stats.activeNodes / stats.totalUsers) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 3 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-packets-sent">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Packets Sent</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold font-sans ${isLight ? "text-slate-850" : "text-slate-100"}`}>{stats.messagesSent}</span>
            <span className="text-[10px] text-slate-500 font-mono">TX total</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div className="bg-slate-500 h-full w-full" />
          </div>
        </div>

        {/* Card 4 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-relayed-hops">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Relayed Hops</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-sans text-cyan-500">{stats.messagesRelayed}</span>
            <span className="text-[10px] text-slate-500 font-mono">bridged</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div
              className="bg-cyan-500 h-full"
              style={{
                width: `${stats.messagesSent > 0 ? (stats.messagesRelayed / stats.messagesSent) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 5 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-avg-latency">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Avg Latency</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold font-sans ${isLight ? "text-slate-850" : "text-slate-100"}`}>{stats.averageDeliveryTimeMs}</span>
            <span className="text-[10px] text-slate-500 font-mono">ms/hop</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div className="bg-slate-500 h-full w-full" />
          </div>
        </div>

        {/* Card 6 */}
        <div className={`border p-4 rounded-xl backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800/80 text-slate-100"
        }`} id="stat-card-network-health">
          <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Network Health</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-sans text-emerald-500">{stats.networkHealth}%</span>
            <span className="text-[10px] text-slate-500 font-mono">optimal</span>
          </div>
          <div className={`w-full h-1 rounded-full overflow-hidden mt-3 ${isLight ? "bg-slate-100" : "bg-slate-950"}`}>
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${stats.networkHealth}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Personal Node Battery Diagnostics & Line Chart */}
      {currentUser && (
        <div id="battery-depletion-analytics" className={`border rounded-xl p-5 backdrop-blur space-y-4 ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
            isLight ? "border-slate-100" : "border-slate-800"
          }`}>
            <div>
              <h4 className={`text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? "text-slate-800" : "text-slate-200"
              }`}>
                <Gauge className="w-4 h-4 text-cyan-500" />
                Live Terminal Energy Analytics: @{currentUser.username}
              </h4>
              <p className={`text-[10px] font-mono mt-1 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Historical depletion rate and power consumption over the last hour
              </p>
            </div>
            
            {/* HUD Status Elements */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1 border rounded-lg flex items-center gap-1.5 font-mono ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/80 border-slate-800/60 text-slate-300"
              }`}>
                <span className="text-[9px] text-slate-400 uppercase">Hourly Draw:</span>
                <span className={`text-xs font-bold ${depletionRate > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  -{depletionRate}%
                </span>
              </div>
              <div className={`px-3 py-1 border rounded-lg flex items-center gap-1.5 font-mono ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/80 border-slate-800/60 text-slate-300"
              }`}>
                <span className="text-[9px] text-slate-400 uppercase">Est. Runtime:</span>
                <span className="text-xs font-bold text-cyan-600">
                  {typeof estSurvivalMin === "number" ? `${Math.floor(estSurvivalMin / 60)}h ${estSurvivalMin % 60}m` : estSurvivalMin}
                </span>
              </div>
              <div className={`px-3 py-1 border rounded-lg flex items-center gap-1.5 font-mono ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/80 border-slate-800/60 text-slate-300"
              }`}>
                <span className="text-[9px] text-slate-400 uppercase">Grid Status:</span>
                <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                  currentUser.batteryLevel < 15 
                    ? 'text-red-500 animate-pulse' 
                    : depletionRate > 0 
                    ? 'text-amber-500' 
                    : 'text-emerald-500'
                }`}>
                  {currentUser.batteryLevel < 15 ? (
                    <>
                      <ZapOff className="w-3 h-3 text-red-500 shrink-0" /> CRITICAL
                    </>
                  ) : depletionRate > 0 ? (
                    <>
                      <Zap className="w-3 h-3 text-amber-500 shrink-0" /> DISCHARGING
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> STABLE
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Line Chart Container */}
          <div className={`w-full h-64 rounded-xl border p-3 flex flex-col justify-between ${
            isLight ? "bg-slate-50/50 border-slate-200" : "bg-slate-950/40 border-slate-900/50"
          }`} id="container-battery-linechart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={batteryHistory}
                margin={{ top: 15, right: 15, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1e293b"} vertical={false} />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke={isLight ? "#64748b" : "#475569"} 
                  fontSize={10} 
                  fontFamily="monospace"
                  tickLine={false} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke={isLight ? "#64748b" : "#475569"} 
                  fontSize={10} 
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconType="circle"
                  formatter={(value) => <span className={`text-[10px] font-mono uppercase tracking-wide ${isLight ? "text-slate-500" : "text-slate-400"}`}>{value}</span>}
                />
                <Line
                  name="Battery Reserve Level"
                  type="monotone"
                  dataKey="battery"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, stroke: "#0891b2", strokeWidth: 1.5, fill: isLight ? "#ffffff" : "#0f172a" }}
                  activeDot={{ r: 5, stroke: "#06b6d4", strokeWidth: 1.5, fill: "#06b6d4" }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Custom SVG Visual Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart A: Battery Distribution of Online Nodes */}
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-200"
        }`} id="panel-reserves-chart">
          <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-250"
          }`}>
            <Battery className="w-4 h-4 text-emerald-500" />
            Active Node Battery Reserves (%)
          </h4>

          {onlineNodes.length === 0 ? (
            <div className={`text-center py-12 font-mono text-xs border border-dashed rounded-lg ${
              isLight ? "border-slate-200 text-slate-400" : "border-slate-800 text-slate-600"
            }`}>
              No online nodes detected to plot reserves.
            </div>
          ) : (
            <div className="space-y-4">
              {onlineNodes.map((n) => {
                const isLow = n.batteryLevel <= 30;
                return (
                  <div key={n.id} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className={`font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>@{n.username}</span>
                      <span className={isLow ? "text-amber-500" : "text-emerald-555"}>
                        {n.batteryLevel}% {isLow && "(CRITICAL)"}
                      </span>
                    </div>
                    <div className={`w-full h-2.5 border rounded-full overflow-hidden ${
                      isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-900"
                    }`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? "bg-amber-550" : "bg-emerald-500"
                        }`}
                        style={{ width: `${n.batteryLevel}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart B: Relay Traffic Load per Transceiver */}
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-200"
        }`} id="panel-relay-load-chart">
          <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-250"
          }`}>
            <Activity className="w-4 h-4 text-cyan-500" />
            Bridging Load Index (Hop Count count)
          </h4>

          <div className="space-y-4">
            {relayLoadData.map((item, idx) => {
              const maxCount = Math.max(...relayLoadData.map((d) => d.count), 1);
              const percentage = (item.count / maxCount) * 100;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className={`font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>@{item.username}</span>
                    <span className="text-cyan-600 font-bold">{item.count} hops handled</span>
                  </div>
                  <div className={`w-full h-2.5 border rounded-full overflow-hidden ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-900"
                  }`}>
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className={`mt-4 p-3 border rounded-lg text-[10px] font-mono leading-relaxed ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-slate-950/40 border-slate-850 text-slate-500"
            }`}>
              <Info className="w-3.5 h-3.5 inline text-cyan-500 mr-1.5 align-middle" />
              Bridging Load measures how many multi-hop communications rely on that node as a physical relay. Nodes in the geographical center (like Node_Beta) handle the highest load index.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
