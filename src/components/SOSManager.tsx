import React, { useState } from "react";
import { SOSAlert } from "../types";
import { AlertOctagon, HelpCircle, Flame, CheckCircle, Clock, Navigation } from "lucide-react";

interface SOSManagerProps {
  alerts: SOSAlert[];
  currentUser: any;
  onTriggerSOS: (message: string, severity: "critical" | "warning") => void;
  onResolveSOS: (sosId: string) => void;
  theme?: "light" | "dark";
}

export default function SOSManager({
  alerts = [],
  currentUser,
  onTriggerSOS,
  onResolveSOS,
  theme = "light",
}: SOSManagerProps) {
  const [sosText, setSosText] = useState("");
  const [severity, setSeverity] = useState<"critical" | "warning">("critical");
  const [submitting, setSubmitting] = useState(false);

  const isLight = theme === "light";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosText.trim()) return;

    setSubmitting(true);
    onTriggerSOS(sosText.trim(), severity);
    setSosText("");
    
    setTimeout(() => {
      setSubmitting(false);
    }, 800);
  };

  const activeAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  return (
    <div className="space-y-6">
      
      {/* 1. SOS Broadcast Transmitter */}
      <div className={`border rounded-xl p-5 backdrop-blur relative overflow-hidden ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-red-500">
          <AlertOctagon className="w-48 h-48 animate-pulse" />
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-red-500 flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-red-500 animate-bounce" />
          Distress Beacon Transmitter (SOS)
        </h3>
        <p className={`text-xs font-mono mb-4 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          🚨 WARNING: Triggering an SOS floods all active terminals inside the mesh with an immediate high-priority alert and broadcast coordinates.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              id="sos-message-input"
              rows={3}
              value={sosText}
              onChange={(e) => setSosText(e.target.value)}
              placeholder="Describe your emergency situation (e.g., medical support required, fuel depleted, radiation shielding leak...)"
              className={`w-full border rounded-lg p-3 text-xs font-mono placeholder-slate-400 outline-none transition-colors ${
                isLight 
                  ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-red-400 focus:ring-1 focus:ring-red-400" 
                  : "bg-slate-950 border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-100"
              }`}
            />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Severity:</span>
              
              <button
                type="button"
                onClick={() => setSeverity("critical")}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono font-bold uppercase transition-all ${
                  severity === "critical"
                    ? "bg-red-50 border-red-500 text-red-600 shadow-sm"
                    : isLight
                    ? "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                CRITICAL EMERGENCY
              </button>

              <button
                type="button"
                onClick={() => setSeverity("warning")}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono font-bold uppercase transition-all ${
                  severity === "warning"
                    ? "bg-amber-50 border-amber-500 text-amber-600 shadow-sm"
                    : isLight
                    ? "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                WARNING ALERT
              </button>
            </div>

            <button
              id="btn-broadcast-sos"
              type="submit"
              disabled={submitting || !sosText.trim()}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-slate-100 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95 transition-all"
            >
              {submitting ? "Transmitting..." : "Broadcast Beacon"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Active Distress Beacons Log */}
      <div className={`border rounded-xl p-5 backdrop-blur ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
      }`}>
        <h3 className={`text-sm font-bold font-mono uppercase tracking-wider mb-4 flex items-center justify-between ${
          isLight ? "text-slate-800" : "text-slate-100"
        }`}>
          <span>Active distress beacons ({activeAlerts.length})</span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        </h3>

        {activeAlerts.length === 0 ? (
          <div className={`text-center py-8 border border-dashed rounded-lg font-mono text-xs ${
            isLight ? "border-slate-200 text-slate-400" : "border-slate-800 text-slate-500"
          }`}>
            ✨ All mesh components report nominal status. No active SOS alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((sos) => {
              const dateStr = new Date(sos.timestamp).toLocaleTimeString();
              const isCrit = sos.severity === "critical";

              return (
                <div
                  key={sos.id}
                  className={`p-4 rounded-lg border ${
                    isCrit 
                      ? isLight ? "bg-red-50/50 border-red-200" : "bg-red-950/20 border-red-500/30" 
                      : isLight ? "bg-amber-50/50 border-amber-200" : "bg-amber-950/20 border-amber-500/30"
                  } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isCrit 
                          ? isLight ? "bg-red-100 text-red-600" : "bg-red-950 text-red-400"
                          : isLight ? "bg-amber-100 text-amber-600" : "bg-amber-950 text-amber-400"
                      }`}>
                        {sos.severity}
                      </span>
                      <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>@{sos.username}</span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {dateStr}
                      </span>
                    </div>

                    <p className={`text-xs font-mono leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>{sos.message}</p>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Distress Coords: x={sos.coordinates.x}, y={sos.coordinates.y}</span>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => onResolveSOS(sos.id)}
                      className={`px-4 py-2 border rounded-lg text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-1 ${
                        isLight 
                          ? "bg-slate-50 border-slate-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50" 
                          : "bg-slate-900 border-slate-800 text-emerald-400 hover:text-emerald-300"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve Alert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Resolved Logs */}
      {resolvedAlerts.length > 0 && (
        <div className={`border rounded-xl p-5 backdrop-blur ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/20 border-slate-800/60"
        }`}>
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-3">
            Recently Resolved Beacons ({resolvedAlerts.length})
          </h3>
          <div className="space-y-2 opacity-70">
            {resolvedAlerts.map((sos) => (
              <div key={sos.id} className={`p-3 border rounded-lg text-xs font-mono flex justify-between items-center ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/60 border-slate-800/40 text-slate-400"
              }`}>
                <div>
                  <span className="font-bold">@{sos.username}: </span>
                  <span>{sos.message}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold uppercase">RESOLVED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
