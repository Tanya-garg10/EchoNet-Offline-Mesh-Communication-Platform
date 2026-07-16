import React, { useState, useRef, useEffect } from "react";
import { Message, User } from "../types";
import { Shield, Send, Lock, Unlock, Server, Radio, ArrowRight, Zap, Info } from "lucide-react";

interface ChatPanelProps {
  messages: Message[];
  users: User[];
  currentUser: any;
  onSendMessage: (receiverId: string, receiverName: string, text: string, isEncrypted: boolean) => void;
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  activePathCallback: (path: string[]) => void;
  theme?: "light" | "dark";
}

export default function ChatPanel({
  messages,
  users,
  currentUser,
  onSendMessage,
  selectedUser,
  setSelectedUser,
  activePathCallback,
  theme = "light",
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [revealCipher, setRevealCipher] = useState(false); // Toggle viewing ciphertext
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages for current chat view
  const currentChatMessages = messages.filter((m) => {
    if (!selectedUser) {
      // Global Group Channel
      return m.receiverId === "group_all";
    } else {
      // Direct message: sent by me to selectedUser, OR sent by selectedUser to me
      const isSentByMe = m.senderId === currentUser?.id && m.receiverId === selectedUser.id;
      const isSentToMe = m.senderId === selectedUser.id && m.receiverId === currentUser?.id;
      // Also, include AI Dispatcher messages
      const isAISentByMe = selectedUser.username === "AI_Dispatcher" && m.senderId === currentUser?.id && m.receiverId === "system_ai";
      const isAISentToMe = selectedUser.username === "AI_Dispatcher" && m.senderId === "system_ai" && m.receiverId === currentUser?.id;

      return isSentByMe || isSentToMe || isAISentByMe || isAISentToMe;
    }
  });

  // Calculate and bubble up the active relay path for the last message in current view
  useEffect(() => {
    if (currentChatMessages.length > 0) {
      const lastMsg = currentChatMessages[currentChatMessages.length - 1];
      if (lastMsg.status === "delivered" && lastMsg.relayPath) {
        activePathCallback(lastMsg.relayPath);
      } else {
        activePathCallback([]);
      }
    } else {
      activePathCallback([]);
    }
  }, [messages, selectedUser, currentUser]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (!selectedUser) {
      onSendMessage("group_all", "group_all", text.trim(), isEncrypted);
    } else {
      onSendMessage(selectedUser.id, selectedUser.username, text.trim(), isEncrypted);
    }
    setText("");
  };

  const getFakeCiphertext = (txt: string) => {
    // Return simulated AES hex string
    let out = "";
    const prefix = "AES256_GCM::";
    for (let i = 0; i < txt.length; i++) {
      out += txt.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return prefix + out.toUpperCase().substring(0, 32) + "...";
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  const isLight = theme === "light";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 border rounded-xl overflow-hidden h-[600px] backdrop-blur ${
      isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-100"
    }`}>
      
      {/* 1. Left Channel Selector Sidebar */}
      <div className={`border-r flex flex-col h-full ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/45"}`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? "border-slate-200 bg-slate-100/50" : "border-slate-800/80 bg-slate-950/60"
        }`}>
          <span className={`text-xs font-bold font-mono uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            Active Mesh Links
          </span>
          <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${
            isLight ? "bg-slate-200 text-slate-700 border-slate-300" : "bg-cyan-950 text-cyan-400 border-cyan-800/60"
          }`}>
            {users.filter((u) => u.status === "online").length} Nodes
          </span>
        </div>

        {/* Channels/User list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Global Broadcast Option */}
          <button
            onClick={() => setSelectedUser(null)}
            className={`w-full text-left p-3 rounded-lg flex flex-col transition-all duration-200 border ${
              selectedUser === null
                ? isLight
                  ? "bg-cyan-50 border-cyan-200 text-cyan-800 font-bold shadow-sm"
                  : "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
                : isLight
                ? "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold font-mono text-xs uppercase tracking-wide">
                [📡] Global broadcast
              </span>
            </div>
            <span className={`text-[10px] pl-4 mt-1 font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              Emergency distress flood
            </span>
          </button>

          {/* Peer Nodes Direct options */}
          <p className={`text-[10px] font-mono uppercase tracking-widest pl-3 pt-4 pb-1 ${isLight ? "text-slate-400" : "text-slate-600"}`}>
            Direct Peer Keys
          </p>

          {users
            .filter((u) => u.username !== currentUser?.username)
            .map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const isAI = u.username === "AI_Dispatcher";
              const isOnline = u.status === "online";

              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-all duration-200 border ${
                    isSelected
                      ? isAI
                        ? isLight
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-sm"
                          : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                        : isLight
                        ? "bg-cyan-50 border-cyan-200 text-cyan-800 font-bold shadow-sm"
                        : "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
                      : isLight
                      ? "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? (isAI ? "bg-emerald-400" : "bg-cyan-400") : "bg-slate-700"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold">{u.username}</span>
                      <span className={`text-[9px] font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        {isAI ? "Emergency Coordinator" : isOnline ? `Bat: ${u.batteryLevel}%` : "Offline"}
                      </span>
                    </div>
                  </div>

                  {isAI && (
                    <span className={`text-[8px] px-1 py-0.2 border rounded font-mono uppercase ${
                      isLight 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                        : "bg-emerald-950 text-emerald-400 border-emerald-900"
                    }`}>
                      Gemini
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* 2. Main Chat Engine Stage */}
      <div className={`col-span-3 flex flex-col h-full ${isLight ? "bg-slate-50/50" : "bg-slate-950/10"}`}>
        
        {/* Chat Header console panel */}
        <div className={`p-4 border-b flex items-center justify-between flex-wrap gap-2 ${
          isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/60"
        }`}>
          <div>
            <h4 className={`text-sm font-bold font-mono uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              {selectedUser ? `@${selectedUser.username}` : "📡 Global Emergency Net"}
            </h4>
            <p className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {selectedUser
                ? selectedUser.username === "AI_Dispatcher"
                  ? "🧠 Active neural network core dispatcher online."
                  : `Secure direct tunnel to callsign node.`
                : "📢 Flood broadcast relaying message across all online physical transceivers."}
            </p>
          </div>

          {/* Cryptography Config Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRevealCipher(!revealCipher)}
              className={`text-[10px] font-mono uppercase border px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                isLight 
                  ? "bg-slate-100 border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-300" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400"
              }`}
            >
              {revealCipher ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-cyan-500" />}
              <span>{revealCipher ? "Show decrypted" : "view ciphertext"}</span>
            </button>
          </div>
        </div>

        {/* Messages Stream display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-2">
              <Radio className="w-8 h-8 opacity-40 animate-pulse text-cyan-400" />
              <p className="uppercase tracking-widest text-[10px]">Transceiver Idle</p>
              <p className="text-[9px] text-slate-600 max-w-[280px] text-center leading-relaxed">
                Transmit a packet. If your direct peer is too far, EchoNet automatically computes intermediate hops!
              </p>
            </div>
          ) : (
            currentChatMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const isAI = msg.senderName === "AI_Dispatcher";
              const dateStr = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div className={`flex items-center gap-1.5 mb-1 text-[9px] font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    <span className={isMe ? (isLight ? "text-cyan-600 font-bold" : "text-cyan-400") : isAI ? (isLight ? "text-emerald-600 font-bold" : "text-emerald-400") : (isLight ? "text-slate-650" : "text-slate-300")}>
                      {msg.senderName}
                    </span>
                    <span>•</span>
                    <span>{dateStr}</span>
                    {msg.isEncrypted && (
                      <span className="flex items-center text-cyan-500 text-[8px] gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        E2EE
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed font-mono relative ${
                      isMe
                        ? isLight
                          ? "bg-cyan-50 text-cyan-800 border border-cyan-200/60 shadow-sm"
                          : "bg-cyan-950/45 text-cyan-200 border border-cyan-500/20"
                        : isAI
                        ? isLight
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-sm"
                          : "bg-emerald-950/45 text-emerald-200 border border-emerald-500/20"
                        : isLight
                        ? "bg-slate-100 text-slate-800 border border-slate-200"
                        : "bg-slate-900 text-slate-100 border border-slate-800"
                    }`}
                  >
                    {/* Render Ciphertext vs Decrypted view */}
                    {msg.isEncrypted && revealCipher ? (
                      <span className="text-red-500 font-mono break-all font-bold tracking-widest">
                        {getFakeCiphertext(msg.text)}
                      </span>
                    ) : (
                      <span>{msg.text}</span>
                    )}

                    {/* Relay status tags on card */}
                    {msg.status && (
                      <div className={`mt-1.5 border-t pt-1 flex items-center gap-1.5 text-[8px] uppercase font-mono ${
                        isLight ? "border-slate-200/60 text-slate-400" : "border-slate-800/80 text-slate-500"
                      }`}>
                        <span>Hop count: {msg.hopCount}</span>
                        <span>•</span>
                        <span
                          className={
                            msg.status === "delivered"
                              ? isLight ? "text-emerald-600 font-bold" : "text-emerald-400"
                              : msg.status === "queued"
                              ? "text-amber-500 font-bold"
                              : "text-red-500 font-bold"
                          }
                        >
                          {msg.status === "queued" ? "Store-&-Forward Queue" : msg.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. Tactical Routing Log (Shows hops details for the last packet) */}
        {currentChatMessages.length > 0 && currentChatMessages[currentChatMessages.length - 1].status === "delivered" && (
          <div className={`border-t px-4 py-2.5 text-[10px] font-mono flex items-center gap-3 flex-wrap ${
            isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-slate-950/90 border-t border-slate-800 text-slate-400"
          }`}>
            <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span className="uppercase font-bold">Mesh Relay Hops:</span>
            </div>
            <div className={`flex items-center gap-2 flex-wrap ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              {currentChatMessages[currentChatMessages.length - 1].relayPath.map((nodeName, idx, arr) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      idx === 0
                        ? "text-cyan-600"
                        : idx === arr.length - 1
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {nodeName}
                  </span>
                  {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3 text-slate-400 text-[9px]">
              <span>Delivery: ~{currentChatMessages[currentChatMessages.length - 1].hopCount * 45}ms</span>
              <span>•</span>
              <span>Loss Rate: 0.00%</span>
            </div>
          </div>
        )}

        {/* Quick Responses Row */}
        <div className={`px-4 py-2 border-t flex items-center gap-2 flex-wrap text-xs font-mono select-none ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-slate-800"
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider mr-1 ${
            isLight ? "text-slate-500" : "text-slate-400"
          }`}>
            Quick Send:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              "Need power",
              "Safe here",
              "Moving to shelter",
              "Signal low",
              "Need assistance",
              "Requesting backup"
            ].map((msgText) => (
              <button
                key={msgText}
                type="button"
                onClick={() => {
                  if (!selectedUser) {
                    onSendMessage("group_all", "group_all", msgText, isEncrypted);
                  } else {
                    onSendMessage(selectedUser.id, selectedUser.username, msgText, isEncrypted);
                  }
                }}
                className={`text-[10px] px-2.5 py-1 rounded-md border font-medium transition-all hover:scale-105 active:scale-95 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-sm cursor-pointer"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700 cursor-pointer"
                }`}
              >
                {msgText}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input box */}
        <form onSubmit={handleSend} className={`p-3 border-t flex items-center gap-2 ${
          isLight ? "border-slate-200 bg-white" : "p-3 border-t border-slate-800 bg-slate-950/60"
        }`}>
          {/* E2EE Lock Toggle Button */}
          <button
            type="button"
            onClick={() => setIsEncrypted(!isEncrypted)}
            className={`p-2 rounded-lg border transition-all ${
              isEncrypted
                ? isLight
                  ? "bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100/55"
                  : "bg-cyan-950/30 border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/25"
                : isLight
                ? "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={isEncrypted ? "E2EE encryption active" : "Warning: sending unencrypted plaintext"}
          >
            {isEncrypted ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          <input
            id="input-chat-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              selectedUser
                ? `Secure packet transmission to @${selectedUser.username}...`
                : "Broadcast urgent distress packet to all online nodes..."
            }
            className={`flex-1 border rounded-lg py-2.5 px-4 text-xs font-mono outline-none transition-colors ${
              isLight 
                ? "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400" 
                : "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            }`}
          />

          <button
            id="btn-chat-send"
            type="submit"
            className="p-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 rounded-lg text-slate-100 transition-colors border border-cyan-400/20 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
