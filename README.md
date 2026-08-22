<div align="center">
  <h1>🚀 DBSense AI</h1>
  <p><b>Autonomous Database Intelligence & Agentic Data Engineering</b></p>
  
  [![Built for Hackathon](https://img.shields.io/badge/Built_for-Hackathon-ff69b4.svg)]()
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)]()
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)]()
  [![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange.svg)]()
  [![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-blueviolet.svg)]()
</div>

<br/>

> **Note to Judges:** This repository represents our **Hackathon Proof of Concept (PoC) Demo**. Our ultimate vision for DBSense AI is a highly secure, air-gapped deployment utilizing local, privacy-first LLMs (via Ollama). However, to ensure a seamless, high-speed demonstration during the hackathon judging, the current default configuration utilizes **Groq (LLaMA 3 70B)** for cloud inference. The architecture fully supports toggling to local LLMs (and we have built the integration for it) when deployed in a true enterprise production environment.

---

## 🏆 The Inspiration

Modern enterprises sit on mountains of data, but extracting actionable intelligence requires a tedious, multi-step pipeline: Data Engineers define schemas, Analysts write complex SQL queries, and Data Scientists train clustering models. It’s a slow, expensive process that bottlenecks critical business decision-making. 

We asked ourselves: *What if an AI could connect to a raw database and autonomously act as the Data Engineer, the Data Analyst, and the Data Scientist all at once?* 

## 💡 What it Does (Core Features)

**DBSense AI** is a fully autonomous data intelligence platform. Once connected to a database (MySQL, PostgreSQL, or SQLite), it autonomously executes a multi-step analytical pipeline:

1. **Auto-Discovery & ER Mapping:** It extracts structural DDL, infers missing primary and foreign keys using heuristics, and generates visual Entity-Relationship (ER) diagrams on the frontend using React Flow and Mermaid.js.
2. **Mathematical Data Quality Audits:** Instead of relying on expensive LLM tokens to do math, our Python backend utilizes `pandas` to scan every column. It calculates standard deviations (σ) and uses a **3-sigma variance rule** to pinpoint statistical outliers, negative anomalies, and missing values down to the exact row index.
3. **Machine Learning Cohort Clustering:** The system identifies high-variance numerical columns and executes unsupervised **K-Means Clustering** and **PCA (Principal Component Analysis)** via `scikit-learn`. The resulting cluster centroids are then fed back into the LLM to automatically generate human-readable business profiles (e.g., "High-Spend Premium Customers").
4. **Agentic RAG (Chat with your DB):** We built a local Retrieval-Augmented Generation (RAG) pipeline using **ChromaDB**. The AI chunks your database schema into semantic embeddings. When a user asks a question, it retrieves only the relevant tables to inject into the prompt, ensuring high-fidelity SQL generation without hallucinating non-existent columns.

## ⚙️ How We Built It (The Architecture)

We built a highly decoupled 3-tier microservice architecture to isolate the heavy analytical processing from the UI.

### 1. The Frontend UI (React + Vite)
- Built a massive Single Page Application featuring 8 distinct BI dashboards (Insights, Schema Explorer, ML Clustering, Quality Metrics).
- Utilized **TailwindCSS** for styling, **Framer Motion** for cinematic UI animations, and **Recharts** for rendering the PCA machine learning plots.

### 2. The API Gateway (Node.js + Express)
- Acts as a secure middleware layer. It terminates the database drivers securely, parses incoming SQL/CSV uploads, and proxies the heavy analytical requests to the Python AI engine.

### 3. The AI Brain (Python + FastAPI + LangGraph)
This is where the magic happens. We used **LangGraph** to build a deterministic, cyclical `StateGraph` that passes the database context through 5 specialized AI Agents:
- **`SchemaAgent`**: Extracts and sanitizes the DDL.
- **`RelationshipAgent`**: Infers relationships and maps topology.
- **`QualityAgent`**: Runs the Pandas anomaly detection.
- **`RAGAgent`**: Generates embeddings and populates the local ChromaDB vector store.
- **`ReasoningAgent`**: Synthesizes the output of all previous agents to generate actionable SQL DDL fixes (e.g., "Add a B-Tree index to Column X to reduce scan overhead by 85%").

## 🚧 Challenges We Ran Into

1. **LLM Math Hallucinations:** We initially tried asking the LLM to find outliers in the data. It failed miserably at basic math and hallucinated rows. *Solution:* We completely decoupled the math. We wrote deterministic Python scripts (`pandas`, `scikit-learn`) to do the heavy mathematical lifting, and only use the LLM to synthesize and explain the results.
2. **Context Window Limits:** Feeding an entire enterprise database schema into a prompt exceeds token limits and confuses the model. *Solution:* We implemented ChromaDB to chunk the schema and only inject the top-K relevant tables based on cosine similarity search.
3. **Logic Leakage:** We struggled with balancing processing between the frontend and backend. We ultimately refactored our `QualityAgent` to return highly precise cell-level anomaly data so the React frontend simply renders the results without doing heavy lifting in the browser.

## 🔒 Security & The "Local-First" Vision

A major concern with AI in data engineering is sending sensitive database schemas and PII to third-party APIs. 

While this hackathon demo uses **Groq** for high-speed presentation inference, we built the AI Layer with a **Dual LLM Engine**. By simply flipping a switch in our configuration (`USE_LOCAL_LLM=true`), DBSense AI routes all inference to a local **Ollama** instance. Combined with our local ChromaDB vector store, this architecture ensures that *zero bytes of data* ever leave the host machine in a true production enterprise setup.

## 🛠️ How to Run the Demo

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- C++ Build Tools (Required for compiling ChromaDB locally)
- A [Groq API Key](https://console.groq.com/keys)

### 1. Install Dependencies
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
- **AI Server:** `http://localhost:8000/docs` (Swagger UI available)

## 🔮 What's Next?
- **Automated Remediation:** Allowing the AI to safely execute the `CREATE INDEX` or `ALTER TABLE` commands it recommends.
- **Native Data Warehouse Integrations:** Adding direct connectors for Snowflake, BigQuery, and AWS Redshift.
- **Time-Series Forecasting:** Implementing ARIMA/Prophet models to automatically forecast temporal database columns.

---
*Built with ❤️ and way too much coffee during the hackathon.*
