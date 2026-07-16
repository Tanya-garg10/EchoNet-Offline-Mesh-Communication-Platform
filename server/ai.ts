import { GoogleGenAI } from "@google/genai";
import { User, SOSAlert, Message } from "./db.ts";

let aiClientInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClientInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY environment variable is not configured. AI functions will fall back to simulated survival guide.");
      return null;
    }
    aiClientInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClientInstance;
}

// Fallback emergency answers for the alien blackout lore in case the API key is not configured.
const FALLBACK_ANSWERS: { keywords: string[]; response: string }[] = [
  {
    keywords: ["water", "filter", "drink"],
    response: "🚨 EMERGENCY WATER FILTRATION PROTOCOL: If municipal supply is offline, do NOT drink surface water directly due to alien spore contamination. Build a bio-filter: (1) Use a plastic bottle inverted, (2) Layer charcoal, clean sand, and fine gravel, (3) Boil the filtered water for at least 15 minutes. Add iodine tablets if available. Safe drinking water is critical."
  },
  {
    keywords: ["power", "battery", "charge", "solar"],
    response: "🔋 RESISTANCE GRID INTEL: Keep all transmitter devices shielded in makeshift Faraday cages (aluminum foil wrapping) when not in use to avoid alien EMP sweeps. When charging via local solar tiles, only expose cells during dense cloud cover to minimize signature tracking, or charge inside secure basements using hand-crank dynamos."
  },
  {
    keywords: ["alien", "spore", "bio", "chemical"],
    response: "👽 ALIEN BIO-SIGNATURE NOTICE: High-altitude spores detected in low-pressure cells. Do not venture outdoors without double-filtered respirator masks (HEPA rated) and sealed skin coverage. Spores attach to cotton fibers; use nylon outer shells and perform chemical wash downs upon re-entry."
  },
  {
    keywords: ["sos", "help", "emergency", "medical"],
    response: "🏥 FIRST-AID TRIAGE: If treating lacerations from alien scrap-metal, disinfect immediately with isopropyl alcohol (70%+). Apply heavy pressure with sterilized linen. If target is experiencing alien containment sickness, isolate them in a ventilated room and keep body temperature stable between 37-38°C."
  },
  {
    keywords: ["hello", "hi", "hey", "who"],
    response: "👋 Salutations, operator. I am the AI Emergency Dispatcher (Node_AI_500). I operate on the local EchoNet mesh to route medical triage guides, coordinate logistics, and summarize system metrics. Address me with any questions about survival, water filtration, shielding, or node stats!"
  }
];

export async function askAI(
  userPrompt: string,
  onlineNodes: User[],
  activeSOS: SOSAlert[],
  recentMessages: Message[]
): Promise<string> {
  const client = getAIClient();

  const formattedNodes = onlineNodes
    .map(
      (n) =>
        `- ${n.username} at coords(${n.coordinates.x}, ${n.coordinates.y}), battery ${n.batteryLevel}%, signal ${n.signalStrength}%`
    )
    .join("\n");

  const formattedSOS = activeSOS
    .filter((s) => !s.isResolved)
    .map((s) => `- ${s.username}: "${s.message}" [Severity: ${s.severity}]`)
    .join("\n") || "No active unresolved SOS alerts.";

  const systemPrompt = `You are "AI_Dispatcher", the core AI entity operating inside EchoNet, an offline decentralized mesh network simulation created during an alien invasion that disabled all global internet, power, and cellular grids.
Your tone is serious, heroic, futuristic, highly analytical, yet supportive—like a tactical military AI or emergency response coordinator aiding human survivors.

Here is the current state of the offline mesh network:
ONLINE NODES IN RADIUS:
${formattedNodes}

ACTIVE UNRESOLVED SOS EMERGENCY ALERTS:
${formattedSOS}

User asks: "${userPrompt}"

IMPORTANT DIRECTIVES:
1. Provide a realistic, high-fidelity response in 3-5 concise bullet points or 1 short paragraph. Keep it around 100-150 words.
2. Incorporate the current state of active SOS alerts or online nodes if directly relevant to coordination.
3. Offer concrete, real-world survival advice (e.g., Faraday shields, water filtration, radio silence, physical mesh hops) appropriate to the alien blackout lore.
4. If asked about network statistics, look at the active nodes and tell them how many nodes are online to relay messages.
Do not use markdown headers larger than h3. Do not mention API keys or system internals. Keep the roleplay authentic.`;

  if (!client) {
    // Return simulated response based on keywords
    const lowerPrompt = userPrompt.toLowerCase();
    for (const item of FALLBACK_ANSWERS) {
      if (item.keywords.some((k) => lowerPrompt.includes(k))) {
        return `${item.response}\n\n[Note: EchoNet AI Dispatch is operating in offline local-cached mode. Configure your GEMINI_API_KEY in Settings to enable live neural tactical assessment.]`;
      }
    }
    return `📡 SYSTEM DIAGNOSTICS: I read your query regarding "${userPrompt}". 
Currently, the local database logs ${onlineNodes.length} active nodes online to support relay hops. 
Please keep transmissions short to conserve battery power on relay nodes. Faraday shielding is recommended for long-term storage.

[Note: EchoNet AI Dispatch is operating in offline local-cached mode. Ask about 'water filtration', 'power', 'alien spores', or 'SOS' for survival guides, or configure your GEMINI_API_KEY to activate full intelligence.]`;
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
    });

    return response.text || "No response received from the neural core dispatcher.";
  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    return `⚠️ NEURAL CONNECTION FAILURE: Could not connect to the remote dispatcher core. 
Recent local cache shows ${onlineNodes.length} operational relays. 
Emergency guidelines: Keep batteries above 30%, secure water bio-filtration, and avoid open electromagnetic transmissions.
Error details: ${err?.message || "Timeout"}`;
  }
}
