<div align="center">
  <h1>🚀 DBSense AI</h1>
  <p><b>Autonomous Database Intelligence & Agentic Data Engineering</b></p>
  
  [![Built for Hackathon](https://img.shields.io/badge/Built_for-Hackathon-ff69b4.svg)]()
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)]()
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)]()
  [![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange.svg)]()
</div>

<br/>

> **Note to Judges:** This repository represents our **Hackathon Proof of Concept (PoC) Demo**. Our ultimate vision for DBSense AI is a highly secure, on-premise deployment utilizing local, privacy-first LLMs (via Ollama). However, for the purpose of a seamless and fast hackathon demonstration, the current default configuration utilizes **Groq (LLaMA 3)** for cloud inference. The architecture fully supports toggling to local LLMs when deployed in a production environment.

---

## 🏆 The Inspiration

Modern enterprises sit on mountains of data, but extracting actionable intelligence requires a tedious pipeline: Data Engineers define schemas, Analysts write complex SQL, and Data Scientists train clustering models. It’s slow, expensive, and bottlenecks decision-making. 

We asked ourselves: *What if an AI could connect to a raw database and autonomously act as the Data Engineer, Analyst, and Scientist all at once?*

## 💡 What it Does

**DBSense AI** is a fully autonomous data intelligence platform. Give it a database connection, and it will:

1. **Auto-Discover Schemas:** Maps out tables, columns, and infers missing primary/foreign keys.
2. **Audit Data Quality:** Scans the entire database using native math (pandas) to pinpoint missing values, negative anomalies, and statistical outliers (3-sigma) down to the exact row.
3. **Cluster Data with ML:** Runs K-Means clustering and PCA (via scikit-learn) on your numerical data, then uses the LLM to automatically generate human-readable business profiles (e.g., "High-Spend Premium Customers") for each cluster.
4. **Chat with your Database:** We built a local **Agentic RAG pipeline** using ChromaDB. You can ask natural language questions about your database structure, and the AI answers with high fidelity by referencing the embedded schema context.

## ⚙️ How We Built It (The Architecture)

We built a 3-tier microservice architecture to isolate the heavy analytical processing from the UI.

| Tier | Tech Stack | Role in the Project |
| :--- | :--- | :--- |
| **Frontend UI** | React, Vite, Tailwind, Recharts | Provides 8 interactive dashboards. Uses Framer Motion for a polished demo experience and React Flow for dynamic ER diagrams. |
| **API Gateway** | Node.js, Express | Safely manages database drivers (MySQL, Postgres, SQLite) and proxies requests. |
| **AI Brain** | Python, FastAPI, LangGraph | The core intelligence. We used **LangGraph** to orchestrate 5 specialized AI Agents (Schema, Quality, RAG, Reasoning, Visualization) in a deterministic pipeline. |

## 🔒 Security & The "Local-First" Vision

A major concern with AI in data engineering is sending sensitive database schemas to third-party APIs. 

While this hackathon demo uses **Groq** for high-speed inference, we built the AI Layer with a **Dual LLM Engine**. By simply flipping a switch in the `.env` file (`USE_LOCAL_LLM=true`), DBSense AI routes all inference to a local **Ollama** instance. Combined with our local **ChromaDB** vector store, this ensures that *zero bytes of data* ever leave the host machine in a production enterprise setup.

## 🛠️ How to Run the Demo

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A [Groq API Key](https://console.groq.com/keys)

### 1. Install Everything
We set up **npm workspaces** so a single command installs dependencies for the Frontend, Backend, and automatically provisions a Python virtual environment for the AI layer.

```bash
git clone https://github.com/your-username/dbsense-ai.git
cd dbsense-ai

npm run install:all
```

### 2. Environment Setup
Create a `.env` file at the root.

```env
PORT=5001
AI_LAYER_URL=http://127.0.0.1:8000
GROQ_API_KEY=your_groq_api_key_here

# To test our Local LLM architecture (requires local Ollama):
# USE_LOCAL_LLM=true
# CUSTOM_AI_API_URL=http://localhost:11434/v1
```

### 3. Launch the Platform
Start all three microservices simultaneously:

```bash
npm run dev
```
- **UI:** `http://localhost:5173`
- **Backend:** `http://localhost:5001`
- **AI Server:** `http://localhost:8000`

## 🔮 What's Next?
If we had more time, we would implement **Automated Remediation** (allowing the AI to execute `CREATE INDEX` or `ALTER TABLE` commands safely) and add native integrations for data warehouses like Snowflake and BigQuery.

---
*Built with ❤️ and way too much coffee during the hackathon.*
