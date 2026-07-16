# 🌌 EchoNet: Offline Mesh Communication Platform

EchoNet is a fully functional, production-quality full-stack web application designed for a 48-hour emergency hackathon. It simulates an offline decentralized mesh network in a post-cataclysmic world where global internet, power grids, and cellular backbones have been rendered completely inoperable. 

With EchoNet, nearby devices establish peer-to-peer radio connections, working as autonomous relays to route encrypted messages, synchronize coordinates, and broadcast emergency alerts without central infrastructure.

---

## 🚀 Key Features

### 1. Dynamic BFS Mesh Pathfinder & Relay
* **Physical Distance Simulation**: Devices have coordinate-based positions on a $1000 \times 600$ grid. Nodes with overlapping circular wireless waves (Euclidean distance $\le 250$ units) establish direct peer links.
* **Multi-Hop Routing**: If Node A is out of physical range of Node C, EchoNet calculates the shortest path using a **Breadth-First Search (BFS)** algorithm across active online nodes (e.g., `Node_Alpha ➔ Node_Beta ➔ Node_Gamma`).
* **Visual Relay Animation**: Active message routes animate glowing red data pulses traveling hop-by-hop along vector lines in real-time.
* **Store-and-Forward (DTN)**: If a destination is offline or disconnected from the mesh segment, messages are automatically queued inside a delay-tolerant pipeline, transmitting once a path re-aligns.

### 2. End-to-End Cryptography Simulator
* **AES-GCM-256 Representation**: All messages are signed and encrypted locally at the device level.
* **Ciphertext View Toggle**: Operators can toggle the terminal between **Decrypted Text** and **Encrypted Ciphertext** (`AES256_GCM::A9F4...`) to view real-time vector transformations of messages floating through the mesh network.

### 3. Gemini-Powered AI Dispatcher Node (`@AI_Dispatcher`)
* **Tactical Neural Responder**: Integrates the server-side `@google/genai` SDK using a lazy initialization pattern.
* **Situational Awareness**: The AI dispatcher operates on local batteries at coordinates `(500, 500)`. When queried, it assesses current active SOS beacons, online nodes, and recent transceiver messages to offer tactical, context-aware survival strategies and triage manuals.

### 4. Interactive Signal Grid Map
* **Responsive SVG Canvas**: Completely interactive with seamless React state updates.
* **Dynamic Geolocation**: Drag-and-drop any active node to realign transmission radii, dynamically recalculating the network topology and active shortest-paths in real-time.

### 5. Critical SOS Distress System
* **Emergency Broadcast Consoles**: Operators can broadcast a warning or critical distress beacon containing GPS coordinates and triage logs.
* **Fullscreen Flash Intrusion Alert**: A critical SOS alert triggers an immediate, full-screen red warning override with audio alerts across all active terminals in the mesh.

### 6. Admin Blackout Control Console
* **Physical Range Decay**: Operators can slider-decay transceiver ranges from $400\text{m}$ down to $100\text{m}$ to simulate storms, signal barriers, or subterranean blockades.
* **EMP Solar Flare Wave**: Triggers a simulated space solar disaster that drastically degrades network ranges, severing multi-hop channels.
* **Forced Killswitches**: Individually disrupt any node's battery supply to simulate device failure or physical capture.

---

## 🛠️ Technical Architecture & Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, and responsive SVG vectors.
* **Backend**: Node.js, Express, Socket.io (WebSocket event routing engine), JSON transactional storage database.
* **AI Core**: `@google/genai` SDK querying `gemini-3.5-flash`.
* **Security**: JWT Token Authentication, cryptographic hash keyrings.

---

## 🔑 Quick Evaluation Credentials (Pre-Registered)

To evaluate the platform instantly as a hackathon judge, utilize these pre-configured keyrings on the **Unlock Keyring** panel:

1. **Node Alpha (Gateway Base)**: 
   * **Callsign**: `Node_Alpha`
   * **Passphrase**: `alpha123`
2. **Node Beta (Central Relay)**: 
   * **Callsign**: `Node_Beta`
   * **Passphrase**: `beta123`
3. **Node Gamma (Active Beacon)**: 
   * **Callsign**: `Node_Gamma`
   * **Passphrase**: `gamma123`
4. **AI Emergency Coordinator Node**: 
   * **Callsign**: `AI_Dispatcher`
   * **Passphrase**: `emergency123`

---

## 💻 Local Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Set Environment Keys** (Configure in `.env`):
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```
3. **Boot Development Mesh**:
   ```bash
   npm run dev
   ```
4. **Build Production Application**:
   ```bash
   npm run build
   ```
5. **Start Production Server**:
   ```bash
   npm run start
   ```
