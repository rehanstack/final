<div align="center">
  <h1>DBSense AI</h1>
  <p><b>Autonomous Database Intelligence & Agentic Data Engineering Platform</b></p>
  
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)](https://fastapi.tiangolo.com/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange.svg)](https://python.langchain.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  <br/>
  
  ### [View Live Demo](https://dbsense-ai-demo.example.com)
</div>

<br/>

**DBSense AI** is an enterprise-grade, autonomous database intelligence platform. It bridges the gap between raw database schemas and actionable business intelligence by utilizing a deterministic Multi-Agent Large Language Model (LLM) orchestration layer combined with deterministic machine learning pipelines.

---

## 🏛️ System Architecture

DBSense AI implements a scalable, decoupled 3-tier microservice architecture to separate stateful data ingestion, analytical processing, and client-side visualization.

| Tier | Component | Core Responsibility |
| :--- | :--- | :--- |
| **Presentation** | React / Vite SPA | Stateful client rendering, DAG visualization (React Flow), charting (Recharts). |
| **API Gateway** | Node.js / Express | Secure database driver termination (MySQL, PostgreSQL, SQLite), routing, and auth. |
| **Intelligence** | Python / FastAPI | LangGraph agent orchestration, ChromaDB vector search, Scikit-learn modeling. |

---

## 🧠 LangGraph Agent Topology

The Intelligence Layer utilizes a stateful `StateGraph` (via LangGraph) to process database connections sequentially. The workflow guarantees deterministic analytical execution before handing control over to the LLM reasoning engine.

| Agent Node | Execution Role | Primary Output |
| :--- | :--- | :--- |
| **`SchemaAgent`** | Connects to the database and extracts structural DDL. | Structured JSON schema map. |
| **`RelationshipAgent`** | Infers missing primary and foreign key constraints via heuristics. | ER mapping metadata. |
| **`QualityAgent`** | Executes Pandas-based variance calculations (3-sigma) for anomalies. | Statistical outlier metrics. |
| **`RAGAgent`** | Chunks schema DDL and executes local embedding generation. | Populated ChromaDB index. |
| **`ReasoningAgent`** | Synthesizes topological and statistical data to generate SQL DDL fixes. | Actionable schema optimizations. |

---

## 📊 Core Capabilities

### 1. Vectorized Semantic Search (Agentic RAG)
DBSense AI abstracts the complexity of SQL generation by converting raw schema structures into dense vector embeddings using **ChromaDB**. When a natural language query is executed, the system performs a cosine similarity search against the schema embeddings to inject high-fidelity context into the LLM prompt, effectively eliminating hallucinated table or column references.

### 2. Algorithmic Data Clustering
The platform executes unsupervised machine learning via `scikit-learn`. 
- **K-Means Clustering:** Dynamically groups high-variance numerical data into business cohorts.
- **PCA (Principal Component Analysis):** Reduces high-dimensional datasets into a 2D matrix for UI rendering.
- **LLM Synthesis:** Cluster centroids are fed into the LLM to auto-generate semantic labels for the numerical cohorts.

### 3. Automated Anomaly Detection
DBSense AI bypasses heavy LLM token usage for basic math by utilizing native mathematical variance checks. It calculates the standard deviation (σ) for all numerical columns and flags exact row indices that fall outside the 3σ threshold, effectively detecting data drift and corruption.

---

## 🧰 Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite | High-performance Virtual DOM rendering. |
| **State Management** | Custom React Context | Managing websocket streams and analytical state. |
| **Data Visualization** | Recharts, Mermaid.js | Time-series charting and architecture diagram generation. |
| **Backend API** | Express.js, Knex.js | Asynchronous request handling and generic SQL querying. |
| **AI Microservice** | FastAPI, Uvicorn | High-throughput asynchronous Python API. |
| **Machine Learning** | Pandas, Scikit-learn | DataFrame manipulation and unsupervised clustering. |
| **LLM Orchestration** | LangChain, LangGraph | Stateful multi-agent cyclical graphs. |
| **Vector Database** | ChromaDB | Local, transient vector store for RAG implementation. |

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js (v18.x LTS or higher)
- Python (3.9.x or higher)
- C++ Build Tools (required for ChromaDB compilation)

### 1. Initialization
The repository utilizes **NPM Workspaces** to streamline dependency resolution across the stack.

```bash
# Clone the repository
git clone https://github.com/your-username/dbsense-ai.git
cd dbsense-ai

# Installs Node dependencies and initializes the Python venv automatically
npm run install:all
```

### 2. Configuration
Create a `.env` file at the root of the repository.

```env
# API Gateway Configuration
PORT=5001
AI_LAYER_URL=http://127.0.0.1:8000

# LLM Provider Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: Local Inference via Ollama
USE_LOCAL_LLM=false
CUSTOM_AI_API_URL=http://localhost:11434/v1
CUSTOM_AI_API_KEY=ollama
```

### 3. Execution
Launch all three microservices concurrently.

```bash
npm run dev
```

- **Client SPA:** `http://localhost:5173`
- **Gateway API:** `http://localhost:5001`
- **AI Microservice:** `http://localhost:8000/docs` (Swagger UI)

---
*Maintained by the DBSense AI Core Team.*
