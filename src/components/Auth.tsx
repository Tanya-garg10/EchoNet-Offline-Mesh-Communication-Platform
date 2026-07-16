import React, { useState } from "react";
import { Key, User as UserIcon, ShieldAlert, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface AuthProps {
  onAuthSuccess: (token: string, user: any) => void;
  onBack: () => void;
}

export default function Auth({ onAuthSuccess, onBack }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("Username and passcode are mandatory.");
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setSuccess(isLogin ? "Keyring unlocked. Initializing terminal..." : "Node registered successfully. Initializing...");
      
      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 1200);

    } catch (err: any) {
      setError(err.message || "Could not link node to the local mesh.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setIsLogin(true);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Back to landing */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Exit Terminal</span>
      </button>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 relative">
        {/* Sleek neon scanlines or header border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 rounded-t-2xl" />

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-sans uppercase tracking-wider text-slate-100">
            {isLogin ? "Local Keyring Authentication" : "Register Node Identity"}
          </h2>
          <p className="text-xs text-cyan-400 font-mono uppercase mt-1">
            {isLogin ? "Securing Peer-to-Peer Portals" : "Join Autonomous Mesh Network"}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-200 text-xs font-mono flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="mb-5 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-200 text-xs font-mono flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Node Callsign / Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="input-username"
                type="text"
                placeholder="e.g. Node_Delta"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Secured Passphrase / Key
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-500">
                <Key className="w-4 h-4" />
              </span>
              <input
                id="input-password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 rounded-lg font-bold uppercase text-xs tracking-wider border border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            <span>{loading ? "Authenticating..." : isLogin ? "Decrypt & Connect" : "Provision Node Identity"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Form toggle */}
        <div className="mt-6 text-center text-xs">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-slate-400 hover:text-cyan-400 transition-colors font-mono uppercase underline underline-offset-4"
          >
            {isLogin ? "provision a new mesh identifier" : "unlock existing terminal keyring"}
          </button>
        </div>

        {/* Quick evaluation shortcuts */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3 text-center">
            🚀 Quick access evaluation nodes (Click to fill)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin("Node_Alpha", "alpha123")}
              className="py-2 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition-all duration-200"
            >
              <div className="text-[11px] font-mono font-bold text-slate-300">Node Alpha</div>
              <div className="text-[9px] font-mono text-slate-500">Gateway Station</div>
            </button>
            <button
              onClick={() => handleQuickLogin("Node_Beta", "beta123")}
              className="py-2 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition-all duration-200"
            >
              <div className="text-[11px] font-mono font-bold text-slate-300">Node Beta</div>
              <div className="text-[9px] font-mono text-slate-500">Central Relay</div>
            </button>
            <button
              onClick={() => handleQuickLogin("Node_Gamma", "gamma123")}
              className="py-2 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition-all duration-200"
            >
              <div className="text-[11px] font-mono font-bold text-slate-300">Node Gamma</div>
              <div className="text-[9px] font-mono text-slate-500">Active Beacon</div>
            </button>
            <button
              onClick={() => handleQuickLogin("AI_Dispatcher", "emergency123")}
              className="py-2 px-3 bg-slate-950 border border-emerald-900/60 hover:border-emerald-500/50 rounded-lg text-left transition-all duration-200"
            >
              <div className="text-[11px] font-mono font-bold text-emerald-400">AI Dispatcher</div>
              <div className="text-[9px] font-mono text-slate-500">Admin Console</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
