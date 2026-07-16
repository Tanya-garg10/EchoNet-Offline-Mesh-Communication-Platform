import { Shield, Radio, Activity, MessageSquare, Zap, AlertTriangle, ArrowRight } from "lucide-react";

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background Tech Hex Grid overlay effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(rgba(18,24,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.5)_1px,transparent_1px)]"
        style={{ backgroundSize: "30px 30px" }}
      />

      <div className="max-w-4xl w-full z-10 flex flex-col items-center text-center">
        {/* Animated Beacon Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
          <div className="w-16 h-16 rounded-full border border-cyan-400 flex items-center justify-center bg-slate-900/80 relative">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Tactical Title */}
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-500 uppercase font-sans drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          EchoNet Mesh
        </h1>
        <p className="text-cyan-400 font-mono text-xs tracking-[0.3em] uppercase mt-2">
          Decentralized Off-Grid Communication Protocol
        </p>

        {/* Narrative Banner */}
        <div className="mt-8 mb-10 p-5 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-300 max-w-2xl leading-relaxed text-sm backdrop-blur">
          <div className="flex items-center gap-2 text-red-500 font-mono text-xs uppercase mb-2 justify-center">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>GLOBAL COMM-BLACKOUT / INVASION DAY 03</span>
          </div>
          The global communications grid has been vaporized. Traditional internet, cellular networks, and satellites are offline. 
          <strong className="text-emerald-400"> EchoNet</strong> utilizes nearby survivors' devices as autonomous routing relays, forming a secure offline tactical mesh. No towers, no backbones—just pure peer-to-peer survival.
        </div>

        {/* Action Button */}
        <button
          id="btn-initialize-terminal"
          onClick={onEnter}
          className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-lg text-base font-bold uppercase tracking-wider overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 border border-cyan-400/30"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="flex items-center gap-3">
            Initialize Tactical Terminal
            <ArrowRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        {/* Features Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-16 w-full text-left">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/50 transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-3">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm text-slate-100 font-mono">Dynamic BFS Relay</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              If node target is out of physical radio reach, EchoNet hop-routes packets automatically through intermediate peer nodes in real-time.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-emerald-500/50 transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="font-bold text-sm text-slate-100 font-mono">Local secure E2EE</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Packets are encrypted locally before broadcasting. Relay hops act as zero-knowledge pipeline transmitters. Toggle ciphertext views at will.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-red-500/50 transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            </div>
            <h3 className="font-bold text-sm text-slate-100 font-mono">SOS Distress Marquee</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Activate high-priority warning signals that flood all reachable terminals, sounding warning beacons and delivering real-time coordinates.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/50 transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-3">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm text-slate-100 font-mono">AI Emergency Relay</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Simulated Gemini agent listens to the mesh network, supplying biohazard tips, emergency coordinates, and triage checklists during crisis.
            </p>
          </div>
        </div>

        {/* Demo Credentials Cheat Sheet */}
        <div className="mt-12 p-4 border border-cyan-500/20 rounded-lg bg-slate-950/80 text-left max-w-xl w-full">
          <p className="text-xs font-mono text-cyan-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Evaluation Node Passkeys (Pre-Registered)
          </p>
          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400">
            <div>
              <p className="text-slate-200">🚩 Node Alpha (HQ Gateway):</p>
              <p className="pl-2">User: <span className="text-emerald-400">Node_Alpha</span> / Pass: <span className="text-cyan-400">alpha123</span></p>
            </div>
            <div>
              <p className="text-slate-200">📡 Node Beta (Mid Relay):</p>
              <p className="pl-2">User: <span className="text-emerald-400">Node_Beta</span> / Pass: <span className="text-cyan-400">beta123</span></p>
            </div>
            <div>
              <p className="text-slate-200">🚀 Node Gamma (South-West):</p>
              <p className="pl-2">User: <span className="text-emerald-400">Node_Gamma</span> / Pass: <span className="text-cyan-400">gamma123</span></p>
            </div>
            <div>
              <p className="text-slate-200">🛠️ Admin Dispatch Hub:</p>
              <p className="pl-2">User: <span className="text-emerald-400">AI_Dispatcher</span> / Pass: <span className="text-cyan-400">emergency123</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-slate-600 font-mono text-[10px]">
          EchoNet Hackathon Build v1.0.4. Developed for 48h emergency communications challenge.
        </div>
      </div>
    </div>
  );
}
