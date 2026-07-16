import React, { useState, useMemo } from "react";
import { Message, User } from "../types";
import { 
  GitCommit, 
  ArrowRight, 
  Compass, 
  Search, 
  SlidersHorizontal, 
  ShieldAlert, 
  Network, 
  Server, 
  Cpu, 
  Activity, 
  Zap, 
  Database,
  Lock,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

interface RelayLogsProps {
  messages: Message[];
  nodes: User[];
  currentUser: any;
  theme?: "light" | "dark";
}

export default function RelayLogs({ messages = [], nodes = [], currentUser, theme = "light" }: RelayLogsProps) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [hopFilter, setHopFilter] = useState<"all" | "direct" | "multihop" | "queued">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "queued" | "failed">("all");
  
  const isLight = theme === "light";
  
  // Selected message for deep inspection path tracer
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(
    messages.length > 0 ? messages[messages.length - 1].id : null
  );

  // Automatically select the last message if current selection is invalid or null
  const activeMessage = useMemo(() => {
    if (selectedMsgId) {
      const found = messages.find((m) => m.id === selectedMsgId);
      if (found) return found;
    }
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages, selectedMsgId]);

  // Calculate Efficiency Analytics Metrics
  const metrics = useMemo(() => {
    const total = messages.length;
    if (total === 0) {
      return {
        avgHops: 0,
        queuedPercent: 0,
        bypassedRelaysCount: 0,
        criticalRelayNode: "None",
        relayLoadFactors: {} as Record<string, number>,
      };
    }

    let hopSum = 0;
    let queuedCount = 0;
    const intermediateCounts: Record<string, number> = {};

    messages.forEach((m) => {
      hopSum += m.hopCount || 0;
      if (m.status === "queued") {
        queuedCount++;
      }
      
      // Calculate active relays involvement
      if (m.relayPath && m.relayPath.length > 2) {
        const relaysOnly = m.relayPath.slice(1, -1);
        relaysOnly.forEach((nodeName) => {
          intermediateCounts[nodeName] = (intermediateCounts[nodeName] || 0) + 1;
        });
      }
    });

    // Find critical node (most relays handled)
    let criticalRelay = "None";
    let maxRelayCount = 0;
    Object.entries(intermediateCounts).forEach(([nodeName, count]) => {
      if (count > maxRelayCount) {
        maxRelayCount = count;
        criticalRelay = `@${nodeName}`;
      }
    });

    return {
      avgHops: (hopSum / total).toFixed(2),
      queuedPercent: ((queuedCount / total) * 100).toFixed(1),
      criticalRelayNode: criticalRelay === "None" ? "Beta" : criticalRelay,
      relayLoadFactors: intermediateCounts,
    };
  }, [messages]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Search text query (matches sender, receiver, text, or any node in relayPath)
      const matchesSearch = 
        msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.receiverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.relayPath.some((node) => node.toLowerCase().includes(searchQuery.toLowerCase()));

      // Hop filter
      let matchesHop = true;
      if (hopFilter === "direct") {
        matchesHop = msg.hopCount === 1;
      } else if (hopFilter === "multihop") {
        matchesHop = msg.hopCount > 1;
      } else if (hopFilter === "queued") {
        matchesHop = msg.status === "queued" || msg.hopCount === 0;
      }

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = msg.status === statusFilter;
      }

      return matchesSearch && matchesHop && matchesStatus;
    });
  }, [messages, searchQuery, hopFilter, statusFilter]);

  // Get full telemetry for a node name
  const getNodeDetails = (nodeName: string) => {
    return nodes.find((n) => n.username === nodeName);
  };

  return (
    <div className="space-y-6" id="relay-logs-root">
      
      {/* 1. Network Routing Analytics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="relay-stats-banner">
        
        <div className={`border p-4 rounded-xl backdrop-blur flex items-center gap-4 ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
        }`} id="stat-avg-hops">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLight ? "bg-cyan-50 border border-cyan-100" : "bg-cyan-950/80 border border-cyan-800/40"
          }`}>
            <Network className={`w-5 h-5 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Average Hop Depth</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${isLight ? "text-cyan-700" : "text-cyan-300"}`}>{metrics.avgHops} <span className="text-xs text-slate-500 font-normal">nodes</span></p>
          </div>
        </div>

        <div className={`border p-4 rounded-xl backdrop-blur flex items-center gap-4 ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
        }`} id="stat-queued-ratio">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLight ? "bg-amber-50 border border-amber-100" : "bg-amber-950/80 border border-amber-800/40"
          }`}>
            <Database className={`w-5 h-5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Delay Tolerant Ratio</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${isLight ? "text-amber-700" : "text-amber-300"}`}>{metrics.queuedPercent}% <span className="text-xs text-slate-500 font-normal">queued</span></p>
          </div>
        </div>

        <div className={`border p-4 rounded-xl backdrop-blur flex items-center gap-4 ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
        }`} id="stat-critical-relay">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLight ? "bg-emerald-50 border border-emerald-100" : "bg-emerald-950/80 border border-emerald-800/40"
          }`}>
            <Cpu className={`w-5 h-5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Core Bridging Node</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>{metrics.criticalRelayNode}</p>
          </div>
        </div>

        <div className={`border p-4 rounded-xl backdrop-blur flex items-center gap-4 ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-100"
        }`} id="stat-efficiency-index">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLight ? "bg-slate-100 border border-slate-200" : "bg-slate-950/80 border border-slate-800/40"
          }`}>
            <Activity className="w-5 h-5 text-slate-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Mesh Packet Ingress</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${isLight ? "text-slate-850" : "text-slate-200"}`}>{messages.length} <span className="text-xs text-slate-500 font-normal">TX total</span></p>
          </div>
        </div>

      </div>

      {/* 2. Interactive Route Schematic & Map Trace (Main Section) */}
      {activeMessage ? (
        <div className={`border rounded-xl overflow-hidden p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-100"
        }`} id="active-route-tracer">
          
          <div className={`flex items-center justify-between border-b pb-3.5 mb-4 flex-wrap gap-2 ${
            isLight ? "border-slate-100" : "border-slate-800/80"
          }`}>
            <div>
              <h4 className={`text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-1.5 ${
                isLight ? "text-slate-700" : "text-slate-400"
              }`}>
                <Compass className={`w-4 h-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
                Packet Route Path Trace
              </h4>
              <p className={`text-[10px] font-mono mt-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Packet UUID: <span className={isLight ? "text-slate-600" : "text-slate-400"}>{activeMessage.id}</span> • Signed over E2EE link.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-mono px-2 py-1 border rounded uppercase ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-400"
              }`}>
                Hops: <strong className="text-cyan-500 dark:text-cyan-400 font-bold">{activeMessage.hopCount}</strong>
              </span>
              <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold uppercase border ${
                activeMessage.status === "delivered" 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                  : activeMessage.status === "queued"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              }`}>
                {activeMessage.status === "queued" ? "Store-&-Forward Queue" : activeMessage.status}
              </span>
            </div>
          </div>

          {/* SVG Multi-Hop Chain Pathway Visualizer */}
          <div className={`border rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden mb-4 ${
            isLight ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-900"
          }`} id="blueprint-schematic-stage">
            
            {/* Mesh grid atmosphere background */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

            <div className="w-full flex flex-col md:flex-row items-center justify-between max-w-3xl gap-6 md:gap-2 z-10">
              {activeMessage.relayPath.map((nodeName, index, arr) => {
                const isFirst = index === 0;
                const isLast = index === arr.length - 1;
                const details = getNodeDetails(nodeName);
                
                // Color strategies based on relay path position
                let bgBorderColor = isLight ? "border-slate-200 bg-white" : "border-slate-800 text-slate-400 bg-slate-900";
                let textGlow = isLight ? "text-slate-700" : "text-slate-300";
                let roleLabel = "Relay";

                if (isFirst) {
                  bgBorderColor = isLight 
                    ? "border-cyan-300 bg-cyan-50/50 text-cyan-800 shadow-sm" 
                    : "border-cyan-500/50 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]";
                  textGlow = "text-cyan-600 dark:text-cyan-400 font-bold";
                  roleLabel = "Source";
                } else if (isLast && activeMessage.status === "delivered") {
                  bgBorderColor = isLight 
                    ? "border-emerald-300 bg-emerald-50/50 text-emerald-800 shadow-sm" 
                    : "border-emerald-500/50 bg-emerald-950/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                  textGlow = "text-emerald-600 dark:text-emerald-400 font-bold";
                  roleLabel = "Target";
                } else if (isLast && activeMessage.status === "queued") {
                  bgBorderColor = isLight 
                    ? "border-amber-300 bg-amber-50/50 text-amber-800 shadow-sm" 
                    : "border-amber-500/50 bg-amber-950/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
                  textGlow = "text-amber-600 dark:text-amber-400 font-bold";
                  roleLabel = "Target (Offline)";
                } else {
                  bgBorderColor = isLight 
                    ? "border-amber-200 bg-amber-50/20 text-amber-800 shadow-sm" 
                    : "border-amber-500/40 bg-amber-950/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.05)]";
                  textGlow = isLight ? "text-amber-600" : "text-amber-300";
                }

                return (
                  <React.Fragment key={index}>
                    {/* Node Card */}
                    <div className={`p-3.5 rounded-xl border ${bgBorderColor} flex flex-col items-center min-w-[130px] text-center relative transition-all hover:scale-105`}>
                      <span className="text-[8px] font-mono tracking-widest text-slate-450 uppercase absolute top-1">{roleLabel}</span>
                      
                      <div className="mt-2.5 flex flex-col items-center">
                        <span className={`text-xs font-mono font-bold tracking-tight ${textGlow}`}>
                          @{nodeName}
                        </span>
                        
                        {/* Interactive mini readouts */}
                        <div className="mt-2 flex flex-col gap-0.5 text-[9px] font-mono text-slate-400 leading-none">
                          {details ? (
                            <>
                              <span>Battery: <strong className={details.batteryLevel <= 30 ? "text-red-500" : isLight ? "text-slate-600" : "text-slate-300"}>{details.batteryLevel}%</strong></span>
                              <span>Signal: <strong className={isLight ? "text-slate-600" : "text-slate-300"}>{details.signalStrength}%</strong></span>
                              <span>State: <strong className={details.status === "online" ? "text-emerald-500" : "text-red-500"}>{details.status}</strong></span>
                            </>
                          ) : (
                            <>
                              <span>Battery: 85%</span>
                              <span>Signal: Nominal</span>
                              <span>State: system</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Connecting Arrow with active glowing pulses */}
                    {!isLast && (
                      <div className="flex-1 flex flex-row md:flex-col items-center justify-center gap-1.5 py-2 min-w-[30px]">
                        <div className={`w-full h-1 relative flex items-center rounded border ${isLight ? "bg-slate-200 border-slate-300" : "bg-slate-900 border-slate-800/80"}`}>
                          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-amber-500 h-full animate-pulse" style={{ width: "100%" }} />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 animate-bounce md:rotate-0 rotate-90" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Deep Details Grid for the active inspected message */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="inspected-packet-metadata">
            
            <div className={`p-3 border rounded-lg font-mono text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950 border-slate-900 text-slate-300"
            }`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Decoded Payload</span>
              <p className={`leading-relaxed truncate-2-lines italic ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                "{activeMessage.text}"
              </p>
              {activeMessage.isEncrypted && (
                <div className="mt-2 flex items-center text-cyan-600 dark:text-cyan-400 text-[9px] gap-1">
                  <Lock className="w-3 h-3" />
                  <span>AES-256 local decryption successful</span>
                </div>
              )}
            </div>

            <div className={`p-3 border rounded-lg font-mono text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950 border-slate-900 text-slate-300"
            }`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Transmission Statistics</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Relay Hops:</span>
                  <span>{activeMessage.hopCount} links</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delay Overhead:</span>
                  <span>~{activeMessage.hopCount * 45} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel Mode:</span>
                  <span>{activeMessage.isEncrypted ? "E2E Encrypted" : "Plaintext Broadcast"}</span>
                </div>
              </div>
            </div>

            <div className={`p-3 border rounded-lg font-mono text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950 border-slate-900 text-slate-300"
            }`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Physical Signal Trace</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sent Time:</span>
                  <span>{new Date(activeMessage.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Status:</span>
                  <span className={activeMessage.status === "delivered" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                    {activeMessage.status === "delivered" ? "✅ Delivered" : "⏳ Store & Forward"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Decay Loss Probability:</span>
                  <span className="text-emerald-500">0.00%</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : null}

      {/* 3. Search, Filters, and Table Logs */}
      <div className={`border rounded-xl overflow-hidden backdrop-blur ${
        isLight ? "bg-white border-slate-200 shadow-sm text-slate-850" : "bg-slate-900/40 border-slate-800 text-slate-100"
      }`} id="relay-logs-table-view">
        
        {/* Controls Header */}
        <div className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold font-mono uppercase tracking-widest ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Mesh Telemetry Route Audit Log
            </span>
            <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${
              isLight ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-cyan-950 text-cyan-400 border-cyan-900/60"
            }`}>
              {filteredMessages.length} Matches
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="search-relay-logs"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes or text..."
                className={`border rounded-lg text-[11px] pl-8 pr-3 py-1.5 font-mono outline-none ${
                  isLight 
                    ? "bg-white border-slate-200 text-slate-800 focus:border-cyan-400 placeholder-slate-400" 
                    : "bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500/50 placeholder-slate-700"
                }`}
              />
            </div>

            {/* Hop Filter */}
            <div className={`flex items-center border rounded-lg p-0.5 ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
            }`}>
              <button
                onClick={() => setHopFilter("all")}
                className={`px-2 py-1 text-[10px] font-mono uppercase rounded ${
                  hopFilter === "all" 
                    ? isLight ? "bg-white text-cyan-600 shadow-sm border border-slate-200" : "bg-slate-900 text-cyan-400" 
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHopFilter("direct")}
                className={`px-2 py-1 text-[10px] font-mono uppercase rounded ${
                  hopFilter === "direct" 
                    ? isLight ? "bg-white text-cyan-600 shadow-sm border border-slate-200" : "bg-slate-900 text-cyan-400" 
                    : "text-slate-500 hover:text-slate-350"
                }`}
                title="Direct messages (1 Hop)"
              >
                Direct
              </button>
              <button
                onClick={() => setHopFilter("multihop")}
                className={`px-2 py-1 text-[10px] font-mono uppercase rounded ${
                  hopFilter === "multihop" 
                    ? isLight ? "bg-white text-cyan-600 shadow-sm border border-slate-200" : "bg-slate-900 text-cyan-400" 
                    : "text-slate-500 hover:text-slate-350"
                }`}
                title="Multi-hop relayed messages (> 1 Hop)"
              >
                Multi-hop
              </button>
              <button
                onClick={() => setHopFilter("queued")}
                className={`px-2 py-1 text-[10px] font-mono uppercase rounded ${
                  hopFilter === "queued" 
                    ? isLight ? "bg-white text-cyan-600 shadow-sm border border-slate-200" : "bg-slate-900 text-cyan-400" 
                    : "text-slate-500 hover:text-slate-350"
                }`}
                title="Queued inside Store-and-Forward DTN buffers"
              >
                Queued
              </button>
            </div>
          </div>
        </div>

        {/* Packet Audit List Table */}
        <div className="overflow-x-auto">
          {filteredMessages.length === 0 ? (
            <div className={`text-center py-12 border border-dashed m-4 rounded-xl font-mono text-xs ${
              isLight ? "border-slate-200 text-slate-400" : "border-slate-800 text-slate-600"
            }`}>
              <SlidersHorizontal className="w-8 h-8 opacity-40 mx-auto mb-2 text-cyan-500" />
              <span>No relayed packets matched the active filter keyring settings.</span>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs select-text">
              <thead className={`text-[10px] text-slate-500 border-b uppercase tracking-wider ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-slate-850"
              }`}>
                <tr>
                  <th className="py-3 px-4">Origin Node</th>
                  <th className="py-3 px-4">Relay Path Schematic</th>
                  <th className="py-3 px-4">Hops</th>
                  <th className="py-3 px-4">Payload Extract</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-slate-800/60"}`}>
                {filteredMessages.map((msg) => {
                  const isActive = activeMessage?.id === msg.id;
                  const isMultiHop = msg.hopCount > 1;

                  return (
                    <tr
                      key={msg.id}
                      onClick={() => setSelectedMsgId(msg.id)}
                      className={`cursor-pointer transition-colors ${
                        isActive 
                          ? isLight ? "bg-cyan-50/70 text-cyan-900" : "bg-cyan-950/20 text-cyan-100" 
                          : isLight ? "text-slate-600 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-900/30"
                      }`}
                    >
                      {/* Origin */}
                      <td className={`py-3.5 px-4 font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                        @{msg.senderName}
                      </td>

                      {/* Path Schematic Line */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {msg.relayPath.map((nodename, idx, arr) => (
                            <React.Fragment key={idx}>
                              <span
                                className={`font-bold ${
                                  idx === 0
                                    ? "text-cyan-600 dark:text-cyan-400"
                                    : idx === arr.length - 1
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-500"
                                  }`}
                              >
                                {nodename}
                              </span>
                              {idx < arr.length - 1 && (
                                <ArrowRight className={`w-3 h-3 inline ${isLight ? "text-slate-300" : "text-slate-600"}`} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* Hop count badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          isMultiHop 
                            ? isLight 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-amber-950 text-amber-400 border border-amber-900/50" 
                            : isLight 
                            ? "bg-slate-50 text-slate-550 border-slate-200" 
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}>
                          {msg.hopCount} hops
                        </span>
                      </td>

                      {/* Text snippet */}
                      <td className={`py-3.5 px-4 max-w-[180px] truncate ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        {msg.text}
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          msg.status === "delivered" 
                            ? isLight 
                              ? "text-emerald-650 bg-emerald-50 border-emerald-200" 
                              : "text-emerald-400 bg-emerald-950/30 border-emerald-900" 
                            : msg.status === "queued" 
                            ? isLight 
                              ? "text-amber-650 bg-amber-50 border-amber-200" 
                              : "text-amber-400 bg-amber-950/30 border-amber-900" 
                            : isLight 
                            ? "text-red-650 bg-red-50 border-red-200" 
                            : "text-red-400 bg-red-950/30 border-red-900"
                        }`}>
                          {msg.status}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Technical audit tip footer */}
        <div className={`p-3.5 border-t text-[10px] text-slate-550 font-mono leading-relaxed ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/50 border-slate-800"
        }`}>
          <Info className="w-3.5 h-3.5 inline text-cyan-500 mr-2 align-middle" />
          Offline Mesh Transceivers automatically sign transit frames. Use this logs engine to trace delay overhead (estimated at 45ms per hop) and map routing paths through nodes. Selecting any packet row loads its full topological path chain blueprint on the stage above.
        </div>

      </div>

    </div>
  );
}
