<div align="center">

# 🚀 DBSense AI
**Autonomous Database Intelligence & Agentic Data Engineering**

[![Built for Hackathon](https://img.shields.io/badge/Built_for-Hackathon-ff69b4.svg?style=for-the-badge)]()
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg?style=for-the-badge&logo=react)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?style=for-the-badge&logo=fastapi)]()
[![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange.svg?style=for-the-badge)]()
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-blueviolet.svg?style=for-the-badge)]()

<br/>

### [✨ View Live Demo ✨](https://dbsense-ai-demo.example.com)

</div>

<br/>

> ⚖️ **Note to Judges:** This repository represents our **Hackathon Proof of Concept (PoC) Demo**. Our ultimate vision for DBSense AI is a highly secure, air-gapped deployment utilizing local, privacy-first LLMs (via Ollama). However, to ensure a seamless, high-speed demonstration during the hackathon judging, the current default configuration utilizes **Groq (LLaMA 3 70B)** for cloud inference. The architecture fully supports toggling to local LLMs (and we have built the integration for it) when deployed in a true enterprise production environment.

---

## 🏆 The Inspiration

Modern enterprises sit on mountains of data, but extracting actionable intelligence requires a tedious, multi-step pipeline: Data Engineers define schemas, Analysts write complex SQL queries, and Data Scientists train clustering models. It’s a slow, expensive process that bottlenecks critical business decision-making. 

We asked ourselves: ***What if an AI could connect to a raw database and autonomously act as the Data Engineer, the Data Analyst, and the Data Scientist all at once?***

---

## 💡 Core Capabilities

DBSense AI is a fully autonomous data intelligence platform. Once connected to a database (MySQL, PostgreSQL, or SQLite), it autonomously executes a multi-step analytical pipeline:

| Feature | Technical Implementation | Value Delivered |
| :--- | :--- | :--- |
| **🔍 Auto-Discovery** | Extracts structural DDL and infers missing primary/foreign keys using heuristics. | Generates visual Entity-Relationship (ER) diagrams automatically on the frontend using React Flow & Mermaid.js. |
| **📉 Quality Audits** | Utilizes `pandas` to calculate standard deviations (σ) and applies a **3-sigma variance rule**. | Pinpoints statistical outliers, negative anomalies, and missing values down to the exact row index *without* relying on expensive/hallucinating LLM math. |
| **🤖 ML Clustering** | Identifies high-variance columns and executes unsupervised **K-Means Clustering** & **PCA** via `scikit-learn`. | Feeds cluster centroids back to the LLM to auto-generate human-readable business profiles (e.g., "High-Spend Premium Customers"). |
| **💬 Agentic RAG** | Chunks your database schema into semantic embeddings using **ChromaDB**. | Allows users to chat with their database in natural language with high-fidelity SQL generation, completely eliminating schema hallucination. |

---

## ⚙️ System Architecture

We built a highly decoupled 3-tier microservice architecture to isolate the heavy analytical processing from the UI.

| Tier | Tech Stack | Role in the System |
| :--- | :--- | :--- |
| **📱 Frontend UI** | `React`, `Vite`, `TailwindCSS`, `Framer Motion`, `Recharts` | A massive Single Page Application featuring 8 distinct BI dashboards (Insights, Schema Explorer, ML Clustering, Quality Metrics). Provides cinematic UI animations and dynamic data plotting. |
| **🛡️ API Gateway** | `Node.js`, `Express.js`, `Knex.js` | Acts as a secure middleware layer. Terminates database drivers securely, parses incoming SQL/CSV uploads, and proxies heavy analytical requests to the Python engine. |
| **🧠 AI Brain** | `Python`, `FastAPI`, `LangGraph`, `Scikit-learn` | The core intelligence. Executes deterministic data processing, vector embeddings, and multi-agent LLM orchestration. |

---

## 🕸️ The LangGraph Agent Topology

Inside the **AI Brain**, we used **LangGraph** to build a deterministic, cyclical `StateGraph`. The database context is passed through 5 specialized AI Agents:

| Agent Node | Primary Function | Output |
| :--- | :--- | :--- |
| **`SchemaAgent`** | Connects directly to the DB, extracts and sanitizes the raw DDL. | Structured JSON schema map. |
| **`RelationshipAgent`** | Infers hidden relationships and maps the topological layout. | ER mapping metadata. |
| **`QualityAgent`** | Runs the deterministic Pandas anomaly detection algorithms. | Statistical outlier metrics & row indices. |
| **`RAGAgent`** | Generates embeddings and populates the local ChromaDB vector store. | Populated Vector Index. |
| **`ReasoningAgent`** | Synthesizes the output of all previous agents to generate actionable insights. | Actionable SQL DDL fixes (e.g., *"Add a B-Tree index to Column X"*). |

---

## 🚧 Challenges We Conquered

Building an autonomous AI data platform in a hackathon weekend came with significant hurdles:

| Challenge | Our Solution |
| :--- | :--- |
| **LLM Math Hallucinations** <br/> *The LLM failed miserably at basic math when asked to find outliers, hallucinating non-existent rows.* | We **decoupled the math**. We wrote deterministic Python scripts (`pandas`, `scikit-learn`) to do the heavy mathematical lifting, and only use the LLM to synthesize and explain the results. |
| **Context Window Limits** <br/> *Feeding an entire enterprise database schema into a prompt exceeds token limits and causes massive latency.* | We implemented **ChromaDB** to chunk the schema and only inject the Top-K relevant tables into the prompt based on cosine similarity search. |
| **Logic Leakage & Freezing** <br/> *We initially calculated outliers in the browser, causing the React UI to freeze on large datasets.* | We refactored our Python `QualityAgent` to return highly precise **cell-level anomaly data**, so the React frontend simply renders the results instantly. |

---

## 🔒 Security & The "Local-First" Vision

A major concern with AI in data engineering is sending sensitive database schemas and PII to third-party APIs. 

While this hackathon demo uses **Groq** for high-speed presentation inference, we built the AI Layer with a **Dual LLM Engine**. By simply flipping a switch in our configuration (`USE_LOCAL_LLM=true`), DBSense AI routes all inference to a local **Ollama** instance. Combined with our local ChromaDB vector store, this architecture ensures that **zero bytes of data ever leave the host machine** in a true production enterprise setup.

---

## 🛠️ How to Run the Demo

### Prerequisites
- `Node.js` (v18+)
- `Python` (3.9+)
- `C++ Build Tools` (Required for compiling ChromaDB locally)
- A [Groq API Key](https://console.groq.com/keys)

### 1. Install Dependencies
We set up **npm workspaces** so a single command installs dependencies for the Frontend, Backend, and automatically provisions a Python virtual environment for the AI layer.

```bash
git clone https://github.com/your-username/dbsense-ai.git
cd dbsense-ai

# For Mac/Linux:
npm run install:all

# For Windows:
npm run install:all:win
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
# For Mac/Linux:
npm run dev

# For Windows:
npm run dev:win
```

| Service | Local URL |
| :--- | :--- |
| **📱 Frontend UI** | `http://localhost:5173` |
| **🛡️ Backend API** | `http://localhost:5001` |
| **🧠 AI Swagger Docs** | `http://localhost:8000/docs` |

---

## 🔮 What's Next?
- **Automated Remediation:** Allowing the AI to safely execute the `CREATE INDEX` or `ALTER TABLE` commands it recommends directly on the database.
- **Native Data Warehouse Integrations:** Adding direct connectors for Snowflake, BigQuery, and AWS Redshift.
- **Time-Series Forecasting:** Implementing ARIMA/Prophet models to automatically forecast temporal database columns.

<br/>
<div align="center">
  <i>Built with ❤️ and way too much coffee during the hackathon.</i>
</div>
