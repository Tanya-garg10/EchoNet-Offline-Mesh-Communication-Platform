# 🌌 EchoNet – Offline Mesh Communication Platform

EchoNet is a full-stack, offline-first communication platform built for **Build.IT '26 Hackathon**.

In a world where aliens have disabled the internet, cellular networks, satellites, and conventional communication systems, EchoNet enables secure peer-to-peer communication through a decentralized mesh network. Devices act as relay nodes, allowing messages, emergency alerts, and location updates to travel across the network without relying on centralized infrastructure.

# 🚀 Features

### 📡 Mesh Network Communication

* Peer-to-peer device connectivity
* Automatic multi-hop message routing using **Breadth-First Search (BFS)**
* Store-and-forward messaging for disconnected nodes
* Live relay path visualization

### 💬 Secure Messaging

* One-to-one messaging
* Group communication
* End-to-end encryption simulation (AES-256-GCM)
* Delivery status and message history

### 🆘 Emergency SOS System

* Broadcast emergency alerts across the mesh
* GPS coordinate sharing
* High-priority fullscreen emergency notifications
* Audio alert simulation

### 🗺️ Interactive Network Map

* Real-time network topology
* Drag-and-drop device positioning
* Dynamic signal range visualization
* Automatic route recalculation

### 🤖 AI Emergency Dispatcher

Powered by **Google Gemini**.

The AI Dispatcher analyzes:

* Active network status
* Online relay nodes
* Recent communications
* SOS requests

It provides context-aware emergency guidance and coordination recommendations.

### ⚙️ Admin Control Panel

* Simulate EMP attacks
* Adjust wireless transmission ranges
* Enable/disable network nodes
* Monitor network health and connectivity

# 🛠 Tech Stack

### Frontend

* React 19
* Vite
* Tailwind CSS
* Lucide Icons
* SVG-based Network Visualization

### Backend

* Node.js
* Express.js
* Socket.io
* JSON Storage

### AI

* Google Gemini API (`@google/genai`)

### Security

* JWT Authentication
* AES-256-GCM Encryption Simulation

# 🔑 Demo Credentials

| Callsign      | Password     |
| ------------- | ------------ |
| Node_Alpha    | alpha123     |
| Node_Beta     | beta123      |
| Node_Gamma    | gamma123     |
| AI_Dispatcher | emergency123 |

# 💻 Installation

Clone the repository:

```bash
git clone <repository-url>
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

# 🎯 Project Highlights

* Offline-first communication platform
* Decentralized mesh networking
* BFS-based shortest path routing
* Interactive network visualization
* AI-powered emergency coordination
* Emergency SOS broadcasting
* Responsive modern interface
* Scalable architecture for disaster communication

# 🌍 Future Enhancements

* Bluetooth Low Energy (BLE) support
* Wi-Fi Direct communication
* LoRa integration
* Offline maps
* Voice messaging
* File sharing
* Progressive Web App (PWA)
* Hardware mesh node support

## Made by Tanya Garg with ❤️
