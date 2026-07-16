import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { Move, Battery, Signal, Zap } from "lucide-react";

interface MeshMapProps {
  nodes: User[];
  currentUser: any;
  activePath: string[]; // usernames in the selected message path
  onUpdateCoordinates: (x: number, y: number) => void;
  transmissionRange?: number;
  droppedLinks?: { from: string; to: string }[];
  emiEnabled?: boolean;
  theme?: "light" | "dark";
}

export default function MeshMap({
  nodes,
  currentUser,
  activePath = [],
  onUpdateCoordinates,
  transmissionRange = 250,
  droppedLinks = [],
  emiEnabled = false,
  theme = "light",
}: MeshMapProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<User | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Width and height of virtual space
  const WIDTH = 1000;
  const HEIGHT = 600;

  // Track Euclidean Distance
  const getDistance = (n1: User, n2: User) => {
    return Math.sqrt(
      Math.pow(n1.coordinates.x - n2.coordinates.x, 2) +
        Math.pow(n1.coordinates.y - n2.coordinates.y, 2)
    );
  };

  // Find all active links (pairs where distance <= range and both are online)
  const links: { from: User; to: User; distance: number; isDropped: boolean }[] = [];
  const onlineNodes = nodes.filter((n) => n.status === "online");

  for (let i = 0; i < onlineNodes.length; i++) {
    for (let j = i + 1; j < onlineNodes.length; j++) {
      const dist = getDistance(onlineNodes[i], onlineNodes[j]);
      if (dist <= transmissionRange) {
        const fromName = onlineNodes[i].username;
        const toName = onlineNodes[j].username;
        const isDropped = emiEnabled && droppedLinks.some(
          (dl) => (dl.from === fromName && dl.to === toName) || (dl.from === toName && dl.to === fromName)
        );
        links.push({
          from: onlineNodes[i],
          to: onlineNodes[j],
          distance: Math.round(dist),
          isDropped: !!isDropped,
        });
      }
    }
  }

  // Handle Drag-and-Drop coordinates
  const handleMouseDown = (nodeId: string, username: string) => {
    // Only allow dragging of current user's node, OR any node if logged in as admin AI_Dispatcher
    const isAdmin = currentUser?.username === "AI_Dispatcher";
    const isSelf = username === currentUser?.username;

    if (isSelf || isAdmin) {
      setDragging(nodeId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;

    // Get SVG coordinates from client coordinates
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    // Limit within bounds
    const clampedX = Math.max(20, Math.min(WIDTH - 20, x));
    const clampedY = Math.max(20, Math.min(HEIGHT - 20, y));

    // Optimistically update coordinates
    const targetNode = nodes.find((n) => n.id === dragging);
    if (targetNode) {
      targetNode.coordinates = { x: clampedX, y: clampedY };
    }

    onUpdateCoordinates(clampedX, clampedY);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragging(null);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const isLight = theme === "light";

  return (
    <div className={`border rounded-xl p-4 flex flex-col h-full relative overflow-hidden backdrop-blur ${
      isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/80 border-slate-800"
    }`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className={`text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2 ${
            isLight ? "text-slate-850" : "text-slate-100"
          }`}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Tactical Mesh Topology Map
          </h3>
          <p className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {currentUser?.username === "AI_Dispatcher"
              ? "⚡ Admin privileges active. Drag any node to simulate movement."
              : "📡 Drag your callsign icon to update coordinates and realign relays."}
          </p>
        </div>

        {/* Legend */}
        <div className={`flex items-center gap-4 text-[10px] font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Direct Signal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400/30 border-t border-dashed border-cyan-400" />
            <span>Relay Links</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-red-500" />
            <span>Active Hop Path</span>
          </div>
        </div>
      </div>

      {/* Main Map SVG stage */}
      <div className={`relative flex-1 border rounded-lg overflow-hidden min-h-[350px] md:min-h-[450px] ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-900"
      }`}>
        {/* Subtle decorative grid cells */}
        <div 
          className={`absolute inset-0 pointer-events-none ${
            isLight 
              ? "opacity-4 bg-[linear-gradient(rgba(15,23,42,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.15)_1px,transparent_1px)]" 
              : "opacity-10 bg-[linear-gradient(rgba(0,240,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.2)_1px,transparent_1px)]"
          }`}
          style={{ backgroundSize: "40px 40px" }}
        />

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-full select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          id="mesh-svg-map"
        >
          {/* SVG Glow Filter Definition */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-strong" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links: Static active connections between nodes */}
          {links.map((link, idx) => {
            // Check if this link is part of the active pathfinder route
            const pathIdx1 = activePath.indexOf(link.from.username);
            const pathIdx2 = activePath.indexOf(link.to.username);
            const isPathLink =
              pathIdx1 !== -1 &&
              pathIdx2 !== -1 &&
              Math.abs(pathIdx1 - pathIdx2) === 1;

            const midX = (link.from.coordinates.x + link.to.coordinates.x) / 2;
            const midY = (link.from.coordinates.y + link.to.coordinates.y) / 2;

            return (
              <g key={`link-group-${idx}`}>
                <line
                  x1={link.from.coordinates.x}
                  y1={link.from.coordinates.y}
                  x2={link.to.coordinates.x}
                  y2={link.to.coordinates.y}
                  stroke={link.isDropped ? "#f87171" : isPathLink ? "#ff073a" : "#0ea5e9"}
                  strokeWidth={isPathLink ? 3.5 : link.isDropped ? 1.5 : 1}
                  strokeOpacity={link.isDropped ? 0.4 : isPathLink ? 0.9 : 0.25}
                  strokeDasharray={link.isDropped ? "3,3" : isPathLink ? "none" : "4,4"}
                  filter={isPathLink ? "url(#glow)" : undefined}
                  className="transition-all"
                />
                {link.isDropped && (
                  <g>
                    {/* Small warning badge in the middle */}
                    <rect
                      x={midX - 22}
                      y={midY - 8}
                      width={44}
                      height={16}
                      rx={3}
                      fill="#450a0a"
                      stroke="#ef4444"
                      strokeWidth={1}
                      className="opacity-90"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      fill="#fca5a5"
                      fontSize={7.5}
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ⚡ EMI JAM
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Glowing Animated Pulses along active relay path */}
          {activePath.length > 1 &&
            activePath.map((username, idx) => {
              if (idx === activePath.length - 1) return null;
              const node1 = onlineNodes.find((n) => n.username === username);
              const node2 = onlineNodes.find((n) => n.username === activePath[idx + 1]);

              if (!node1 || !node2) return null;

              return (
                <circle
                  key={`pulse-${idx}`}
                  r="5"
                  fill="#ff073a"
                  filter="url(#glow)"
                >
                  <animateMotion
                    dur="1.8s"
                    repeatCount="indefinite"
                    path={`M ${node1.coordinates.x} ${node1.coordinates.y} L ${node2.coordinates.x} ${node2.coordinates.y}`}
                  />
                </circle>
              );
            })}

          {/* Nodes Signal Radii & Node circle representations */}
          {nodes.map((node) => {
            const isOnline = node.status === "online";
            const isSelf = node.username === currentUser?.username;
            const isAI = node.username === "AI_Dispatcher";
            const isInActivePath = activePath.includes(node.username);

            // Determine border color
            let color = "#475569"; // offline gray
            if (isOnline) {
              if (isAI) color = "#10b981"; // AI Dispatch green
              else if (isSelf) color = "#06b6d4"; // self cyan
              else color = "#38bdf8"; // other nodes sky-blue
            }

            if (isInActivePath && isOnline) {
              color = "#ef4444"; // red path glow
            }

            return (
              <g
                key={node.id}
                className="transition-all duration-300"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* 1. Broadcast Signal Range circular ripple (only for online nodes) */}
                {isOnline && (
                  <>
                    <circle
                      cx={node.coordinates.x}
                      cy={node.coordinates.y}
                      r={transmissionRange}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity="0.06"
                      className="pointer-events-none"
                    />
                    <circle
                      cx={node.coordinates.x}
                      cy={node.coordinates.y}
                      r={transmissionRange}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      strokeOpacity="0.03"
                      className="pointer-events-none animate-ping"
                      style={{ animationDuration: isSelf ? "6s" : "9s" }}
                    />
                  </>
                )}

                {/* 2. Drag/Target Outer Aura */}
                {isOnline && (isSelf || currentUser?.username === "AI_Dispatcher") && (
                  <circle
                    cx={node.coordinates.x}
                    cy={node.coordinates.y}
                    r="24"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="2,4"
                    strokeOpacity="0.35"
                    className="animate-spin"
                    style={{ animationDuration: "12s" }}
                  />
                )}

                {/* 3. Outer Ring for active packet path node */}
                {isInActivePath && isOnline && (
                  <circle
                    cx={node.coordinates.x}
                    cy={node.coordinates.y}
                    r="16"
                    fill="none"
                    stroke="#ff073a"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                    filter="url(#glow)"
                  />
                )}

                {/* 4. Node Core Dot */}
                <circle
                  cx={node.coordinates.x}
                  cy={node.coordinates.y}
                  r={isAI ? "10" : "8"}
                  fill={isOnline ? color : "#1e293b"}
                  stroke={isOnline ? "#0f172a" : "#334155"}
                  strokeWidth="2.5"
                  className="cursor-pointer"
                  onMouseDown={() => handleMouseDown(node.id, node.username)}
                  filter={isOnline && (isSelf || isAI || isInActivePath) ? "url(#glow)" : undefined}
                />

                {/* 5. Callsign Text Label */}
                <text
                  x={node.coordinates.x}
                  y={node.coordinates.y - (isAI ? 18 : 15)}
                  textAnchor="middle"
                  fill={isOnline ? (isLight ? "#334155" : "#e2e8f0") : "#64748b"}
                  fontSize="10"
                  fontWeight={isSelf ? "bold" : "normal"}
                  fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {node.username} {isSelf && "(YOU)"}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover node tooltip dashboard */}
        {hoveredNode && (
          <div
            className={`absolute bottom-4 left-4 border rounded-lg p-3 text-xs font-mono w-52 shadow-xl backdrop-blur z-20 pointer-events-none ${
              isLight ? "bg-white/95 border-slate-200 text-slate-700 shadow-md" : "bg-slate-900/95 border-slate-800 text-slate-300"
            }`}
            style={{ animation: "fadeIn 0.15s ease-out" }}
          >
            <div className={`flex items-center justify-between border-b pb-1.5 mb-1.5 ${isLight ? "border-slate-100" : "border-slate-800"}`}>
              <span className={`font-bold ${isLight ? "text-slate-850" : "text-slate-100"}`}>{hoveredNode.username}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                  hoveredNode.status === "online"
                    ? isLight ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : isLight ? "bg-slate-50 text-slate-400 border border-slate-200" : "bg-slate-950 text-slate-500 border border-slate-800"
                }`}
              >
                {hoveredNode.status}
              </span>
            </div>
            <div className={`space-y-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              <div className="flex items-center justify-between">
                <span>Signal Range:</span>
                <span className={isLight ? "text-slate-800" : "text-slate-200"}>{hoveredNode.status === "online" ? `${transmissionRange}m` : "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Battery className="w-3.5 h-3.5" /> Battery:</span>
                <span className={`font-bold ${hoveredNode.batteryLevel > 30 ? (isLight ? "text-slate-800" : "text-slate-200") : "text-amber-500"}`}>
                  {hoveredNode.batteryLevel}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Signal className="w-3.5 h-3.5" /> Signal:</span>
                <span className={isLight ? "text-slate-800" : "text-slate-200"}>{hoveredNode.status === "online" ? `${hoveredNode.signalStrength}%` : "Offline"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Grid Pos:</span>
                <span className={isLight ? "text-slate-800" : "text-slate-200"}>({hoveredNode.coordinates.x}, {hoveredNode.coordinates.y})</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Help Overlay */}
        <div className={`absolute top-3 left-3 border rounded-lg p-2 text-[10px] font-mono max-w-[200px] backdrop-blur pointer-events-none ${
          isLight ? "bg-white/80 border-slate-200 text-slate-500" : "bg-slate-900/70 border-slate-800 text-slate-400"
        }`}>
          <p className={`font-bold uppercase mb-1 ${isLight ? "text-slate-700" : "text-slate-200"}`}>💡 Network Range rule</p>
          Nodes with intersecting circles (distance ≤ {transmissionRange}) form direct peer connections. Drag nodes closer to build a multi-hop relay route!
        </div>
      </div>
    </div>
  );
}
