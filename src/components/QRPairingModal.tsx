import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  Camera, 
  X, 
  Copy, 
  Check, 
  UserPlus, 
  Radio, 
  Compass, 
  Cpu, 
  Info,
  ShieldCheck,
  AlertTriangle,
  Zap
} from "lucide-react";
import { User } from "../types";

interface QRPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  token: string | null;
  onNodeAdded: () => void; // Trigger callback to refresh the main app states
  theme?: "light" | "dark";
}

// Generate a deterministic aesthetic pseudorandom QR-style grid for a username
function generateMockQRGrid(username: string): boolean[][] {
  const size = 21; // 21x21 grid
  const grid = Array(size).fill(null).map(() => Array(size).fill(false));

  // Helper: Fill finder pattern (7x7 outer, 5x5 inner empty, 3x3 filled) at (r, c)
  const drawFinderPattern = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInnerFilled = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isInnerFilled) {
          grid[startR + r][startC + c] = true;
        }
      }
    }
  };

  // Draw three classic QR finder patterns
  drawFinderPattern(0, 0); // Top-left
  drawFinderPattern(0, 14); // Top-right
  drawFinderPattern(14, 0); // Bottom-left

  // Seeded pseudorandom generator based on username
  let seed = 0;
  for (let i = 0; i < username.length; i++) {
    seed += username.charCodeAt(i) * (i + 1);
  }

  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Fill rest of the grid with deterministic random bits
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= 13;
      const inBottomLeft = r >= 13 && c < 8;
      
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        // Alignment pattern mock at (12, 12)
        const inAlignment = r >= 10 && r <= 14 && c >= 10 && c <= 14;
        if (inAlignment) {
          const isBorder = r === 10 || r === 14 || c === 10 || c === 14;
          const isCenter = r === 12 && c === 12;
          grid[r][c] = isBorder || isCenter;
        } else {
          grid[r][c] = random() > 0.45;
        }
      }
    }
  }

  return grid;
}

export default function QRPairingModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  token,
  onNodeAdded,
  theme = "light"
}: QRPairingModalProps) {
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"show" | "scan">("show");
  const [copied, setCopied] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPairingInProcess, setIsPairingInProcess] = useState(false);

  // Scan simulation states
  const [customCallsign, setCustomCallsign] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Pre-configured tactical simulator peers
  const simulatorPeers = [
    { username: "Node_Sierra", desc: "Search & Rescue Outpost", x: 450, y: 150, battery: 92, signal: 89 },
    { username: "Node_Tango", desc: "S-Band Relay Tower", x: 620, y: 550, battery: 85, signal: 94 },
    { username: "Node_Victor", desc: "Medical Relief Tent", x: 810, y: 320, battery: 78, signal: 73 },
    { username: "Node_Whiskey", desc: "Mobile Off-Road Recon", x: 150, y: 450, battery: 64, signal: 82 }
  ];

  // Auto-scrolling laser scanner simulation
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      timer = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 8;
        });
      }, 100);
    } else {
      setScanProgress(0);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  if (!isOpen) return null;

  // Generate pairing payload JSON
  const pairingPayload = JSON.stringify({
    mesh_protocol: "ECHONET_SECURE_v1.2",
    callsign: currentUser?.username || "UnknownNode",
    node_id: currentUser?.id || "unknown",
    key_fingerprint: "SHA256-EF92AA81B94C",
    created_at: new Date().toISOString()
  }, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Triggers the QR pairing API endpoint
  const registerPairedNode = async (username: string, coordinates?: { x: number, y: number }, battery?: number, signal?: number) => {
    setIsPairingInProcess(true);
    setErrorMessage(null);
    setPairingSuccess(null);

    try {
      const response = await fetch("/api/mesh/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          coordinates,
          batteryLevel: battery,
          signalStrength: signal
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to establish pairing link");
      }

      setPairingSuccess(`Mesh Node @${username} is now securely synced & online!`);
      onNodeAdded(); // Notify parent to fetch users immediately
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during pairing handshake.");
    } finally {
      setIsPairingInProcess(false);
    }
  };

  // Simulate scanning a specific predefined node
  const handleSimulateScan = (peer: typeof simulatorPeers[0]) => {
    setIsScanning(true);
    setScanProgress(0);
    setErrorMessage(null);
    setPairingSuccess(null);

    setTimeout(() => {
      setIsScanning(false);
      registerPairedNode(peer.username, { x: peer.x, y: peer.y }, peer.battery, peer.signal);
    }, 1500); // Wait for scanning animation to play
  };

  // Handle custom manual text entry scan
  const handleManualPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCallsign.trim()) return;
    
    // Create random coordinate and battery
    const randX = Math.floor(Math.random() * 600) + 200;
    const randY = Math.floor(Math.random() * 400) + 200;
    const randBat = Math.floor(Math.random() * 30) + 70;
    const randSig = Math.floor(Math.random() * 30) + 70;

    // Standardize callsign name (remove spaces, prefix @ etc)
    let cleanCall = customCallsign.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanCall) {
      setErrorMessage("Invalid node callsign string structure.");
      return;
    }

    registerPairedNode(cleanCall, { x: randX, y: randY }, randBat, randSig);
    setCustomCallsign("");
  };

  const qrGrid = generateMockQRGrid(currentUser?.username || "Node");

  return (
    <div 
      id="qr-pairing-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="qr-pairing-modal"
        className={`border-2 rounded-xl max-w-lg w-full overflow-hidden flex flex-col font-mono ${
          isLight ? "bg-white border-slate-200 shadow-xl text-slate-800" : "bg-slate-900 border-slate-800 shadow-[0_0_40px_rgba(6,182,212,0.15)] text-slate-100"
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded flex items-center justify-center border ${
              isLight ? "bg-cyan-50 border-cyan-100" : "bg-cyan-950 border-cyan-800/40"
            }`}>
              <QrCode className={`w-4 h-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Tactical QR Onboarding
              </h3>
              <p className="text-[9px] text-slate-500 font-mono">
                Decentralized Secure Peer Key-Exchange
              </p>
            </div>
          </div>
          <button 
            id="close-qr-modal"
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isLight ? "hover:bg-slate-200 text-slate-500 hover:text-slate-850" : "hover:bg-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className={`flex border-b ${isLight ? "border-slate-200 bg-slate-100/50" : "border-slate-800 bg-slate-950/30"}`}>
          <button
            id="tab-qr-show"
            onClick={() => {
              setActiveTab("show");
              setErrorMessage(null);
              setPairingSuccess(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-all ${
              activeTab === "show"
                ? isLight 
                  ? "border-cyan-600 text-cyan-600 bg-white" 
                  : "border-cyan-500 text-cyan-400 bg-cyan-950/10"
                : isLight
                ? "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
            }`}
          >
            Show My QR Tag
          </button>
          <button
            id="tab-qr-scan"
            onClick={() => {
              setActiveTab("scan");
              setErrorMessage(null);
              setPairingSuccess(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-all ${
              activeTab === "scan"
                ? isLight 
                  ? "border-cyan-600 text-cyan-600 bg-white" 
                  : "border-cyan-500 text-cyan-400 bg-cyan-950/10"
                : isLight
                ? "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
            }`}
          >
            Scan / Onboard Peer
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 flex-1 space-y-4">
          
          {/* Status Display Banners */}
          {pairingSuccess && (
            <div id="pairing-success-banner" className={`border p-3.5 rounded-lg flex items-start gap-3 animate-fade-in text-xs ${
              isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
              <div>
                <strong className={`block font-bold uppercase ${isLight ? "text-emerald-900" : "text-emerald-200"}`}>PAIRING COMPLETED</strong>
                <p className="mt-1 leading-relaxed text-[11px]">{pairingSuccess}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div id="pairing-error-banner" className={`border p-3.5 rounded-lg flex items-start gap-3 animate-fade-in text-xs ${
              isLight ? "bg-red-50 border-red-200 text-red-800" : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? "text-red-600" : "text-red-400"}`} />
              <div>
                <strong className={`block font-bold uppercase ${isLight ? "text-red-900" : "text-red-200"}`}>HANDSHAKE FAILED</strong>
                <p className="mt-1 leading-relaxed text-[11px]">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: SHOW USER QR CODE */}
          {activeTab === "show" && (
            <div className="space-y-4 animate-fade-in" id="show-qr-panel">
              <div className="text-[10px] text-slate-500 text-center uppercase tracking-wider mb-2">
                Display this tag on your screen for nearby transceivers to scan
              </div>

              {/* Dynamic Pixel SVG QR Representation */}
              <div className={`border p-6 rounded-xl flex justify-center items-center relative overflow-hidden ${
                isLight ? "bg-slate-100/50 border-slate-200" : "bg-slate-950 border-slate-800"
              }`}>
                <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:12px_12px] opacity-10" />
                
                <div className="bg-white p-3 rounded-lg shadow-lg relative z-10 transition-transform hover:scale-105 duration-300">
                  <svg 
                    width="168" 
                    height="168" 
                    viewBox="0 0 21 21" 
                    shapeRendering="crispEdges"
                    className="text-slate-950 fill-current"
                  >
                    {qrGrid.map((row, rIdx) => 
                      row.map((val, cIdx) => 
                        val ? (
                          <rect 
                            key={`${rIdx}-${cIdx}`} 
                            x={cIdx} 
                            y={rIdx} 
                            width="1" 
                            height="1" 
                          />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
              </div>

              {/* Credentials Copy details block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-500 font-bold">Raw Radio Token Frame</span>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded text-[10px] transition-all font-mono ${
                      isLight 
                        ? "bg-slate-50 border-slate-250 hover:bg-slate-100 text-slate-600 hover:text-cyan-600" 
                        : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-550 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Frame</span>
                      </>
                    )}
                  </button>
                </div>
                
                <pre className={`p-3 border rounded-lg text-[10px] overflow-x-auto max-h-[110px] leading-tight select-all font-mono scrollbar-thin ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-650" : "bg-slate-950 border-slate-900 text-slate-400"
                }`}>
                  {pairingPayload}
                </pre>
              </div>

              <div className={`p-3 border rounded-lg text-[10px] leading-relaxed flex gap-2 ${
                isLight ? "bg-cyan-50/50 border-cyan-150 text-cyan-800" : "bg-cyan-950/15 border-cyan-800/20 text-cyan-400/85"
              }`}>
                <Info className="w-4 h-4 shrink-0 text-cyan-500" />
                <span>The QR code stores a signed JSON signature. Scanning it configures physical transceiver channels on the second node instantly without grid registration requirement.</span>
              </div>
            </div>
          )}

          {/* TAB 2: SCAN/ONBOARD PEER */}
          {activeTab === "scan" && (
            <div className="space-y-4 animate-fade-in" id="scan-qr-panel">
              
              {/* Camera view finder simulation */}
              <div className={`border rounded-xl relative overflow-hidden aspect-video flex flex-col items-center justify-center p-4 ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
              }`}>
                {/* Visual Camera scan noise overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                
                {isScanning ? (
                  <>
                    {/* Laser scanning bar */}
                    <div 
                      className="absolute left-0 right-0 h-1.5 bg-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-20"
                      style={{ 
                        top: `${scanProgress}%`, 
                        transition: "all 0.1s linear" 
                      }} 
                    />
                    
                    {/* Pulsing focal square */}
                    <div className="w-32 h-32 border-2 border-cyan-450 border-dashed animate-pulse relative z-10 flex items-center justify-center">
                      <Compass className="w-8 h-8 text-cyan-550/60 animate-spin" style={{ animationDuration: "4s" }} />
                    </div>

                    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 border px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest animate-pulse font-mono ${
                      isLight ? "bg-white border-cyan-200 text-cyan-600" : "bg-slate-900/90 border-cyan-500/40 text-cyan-400"
                    }`}>
                      Acquiring radio link: {scanProgress}%
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2 z-10">
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto ${
                      isLight ? "bg-white border-slate-250 text-slate-400" : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}>
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-400"}`}>
                      Optical Handshake Viewfinder
                    </div>
                    <p className="text-[9px] text-slate-500 max-w-xs mx-auto leading-normal">
                      Scan code or select a pre-negotiated tactical transceiver below to simulate optical key-pairing.
                    </p>
                  </div>
                )}
              </div>

              {/* 1. Predefined simulator nodes */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Available radio beacons (Simulate scanner)</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {simulatorPeers.map((peer) => (
                    <button
                      key={peer.username}
                      id={`btn-pair-sim-${peer.username.toLowerCase()}`}
                      disabled={isScanning || isPairingInProcess}
                      onClick={() => handleSimulateScan(peer)}
                      className={`p-2.5 disabled:opacity-40 border rounded-lg text-left transition-all flex flex-col justify-between group ${
                        isLight 
                          ? "bg-white border-slate-200 hover:bg-slate-50 hover:border-cyan-400 shadow-sm" 
                          : "bg-slate-950 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold font-mono group-hover:text-cyan-600 dark:group-hover:text-cyan-400 ${
                          isLight ? "text-slate-800" : "text-slate-200"
                        }`}>
                          @{peer.username}
                        </span>
                        <Zap className="w-3 h-3 text-amber-500 group-hover:animate-bounce" />
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 truncate">{peer.desc}</span>
                      <div className="flex items-center gap-2 mt-1.5 text-[8px] text-slate-400 font-mono">
                        <span>Batt: {peer.battery}%</span>
                        <span>Sig: {peer.signal}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Manual Custom Callsign Form */}
              <form onSubmit={handleManualPair} className={`space-y-2 pt-2 border-t ${isLight ? "border-slate-100" : "border-slate-800/60"}`}>
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Onboard via Custom Callsign</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-600 dark:text-cyan-400 text-xs font-bold font-mono">@</span>
                    <input
                      id="input-pair-callsign"
                      type="text"
                      required
                      value={customCallsign}
                      onChange={(e) => setCustomCallsign(e.target.value)}
                      placeholder="Node_Outpost"
                      disabled={isScanning || isPairingInProcess}
                      className={`w-full border outline-none rounded-lg py-2 pl-6 pr-3 text-xs font-mono focus:border-cyan-400 dark:focus:border-cyan-500/50 ${
                        isLight 
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400" 
                          : "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-700"
                      }`}
                    />
                  </div>
                  <button
                    id="btn-submit-pair-manual"
                    type="submit"
                    disabled={isScanning || isPairingInProcess || !customCallsign.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-100 flex items-center gap-1.5 transition-colors uppercase"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard</span>
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

        {/* Modal Footer info bar */}
        <div className={`p-3 border-t text-[10px] flex items-center gap-2 ${
          isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-500"
        }`}>
          <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="leading-tight">All transceivers are provisioned with symmetrical AES keys signed on QR scan.</span>
        </div>
      </div>
    </div>
  );
}
