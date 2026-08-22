<div align="center">
  <h1>🧠 DBSense AI</h1>
  <p><b>Autonomous Database Intelligence through Agentic RAG & Machine Learning</b></p>
  
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)](https://fastapi.tiangolo.com/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange.svg)](https://python.langchain.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br/>

DBSense AI is a next-generation business intelligence platform that connects directly to your databases and uses a **Multi-Agent AI workflow** to automatically discover schemas, detect anomalies, cluster data, and allow natural language querying over your data. 

Unlike traditional BI tools that require manual dashboard configuration, DBSense AI acts as an autonomous data scientist, instantly giving you deep insights into data quality, relationships, and business intelligence.

---

## 📑 Table of Contents
- [✨ Core Features](#-core-features)
- [🏛️ System Architecture](#️-system-architecture)
- [🧰 Technology Stack](#-technology-stack)
- [🤖 The AI Agent Workflow](#-the-ai-agent-workflow)
- [🚀 Setup & Installation](#-setup--installation)
- [⚙️ Environment Variables](#️-environment-variables)
- [📁 Repository Structure](#-repository-structure)
- [🗺️ Roadmap](#️-roadmap)

---

## ✨ Core Features

*   **Agentic RAG Knowledge Base:** Chat with your database. DBSense AI chunks your schema and metadata, embeds them via ChromaDB, and uses precise semantic retrieval to answer natural language questions about your database structure without hallucinations.
*   **Automated Data Quality & Anomaly Detection:** Scans every table and column to pinpoint missing values, negative anomalies, and statistical outliers (using mathematical variance and 3-sigma rules), pointing you to the exact row and column that needs fixing.
*   **Machine Learning Clustering:** Automatically clusters numerical business data using **K-Means** and performs dimensionality reduction using **PCA** (via `scikit-learn`). It then feeds the clustered centroids back to the LLM to automatically generate human-readable business profiles (e.g., "Premium High-Spend Customers").
*   **Auto-Schema & Relationship Discovery:** Automatically connects to your database, extracts all tables, columns, and foreign keys, and generates visual Entity-Relationship (ER) diagrams using React Flow and Mermaid.js.
*   **Dual LLM Engine Support:** Seamlessly switch between lightning-fast cloud inference via **Groq (LLaMA 3)** or local, privacy-first inference via **Ollama**.

---

## 🏛️ System Architecture

DBSense AI relies on a robust 3-tier microservice architecture to isolate heavy analytical processing from the UI and API gateway.

1.  **Frontend (React/Vite):** A highly polished, responsive Single Page Application offering 8 distinct analytical dashboards. It uses Framer Motion for cinematic UI animations and Recharts for dynamic data visualization.
2.  **Backend (Node.js/Express):** Acts as the secure API Gateway. It manages direct connections to various databases (MySQL, PostgreSQL, SQLite), parses schemas, and orchestrates proxy requests to the AI layer.
3.  **AI Layer (Python/FastAPI):** The heavy-lifting analytical engine. It runs the LangGraph multi-agent orchestration, executes Scikit-Learn machine learning algorithms, and manages the ChromaDB vector database.

---

## 🧰 Technology Stack

### Frontend
- **React 18** (via Vite)
- **TailwindCSS** (Styling)
- **Framer Motion** (Animations)
- **Recharts & React Flow** (Visualizations)
- **Mermaid.js** (Architecture / DB Diagrams)

### Backend API
- **Node.js + Express**
- **Knex.js** (Database abstraction)
- **Multer** (File uploads)

### AI & Machine Learning Layer
- **Python 3.9+ + FastAPI**
- **LangChain & LangGraph** (Agent orchestration)
- **ChromaDB** (Vector search & semantic indexing)
- **Pandas & Scikit-learn** (Data wrangling & ML Clustering)

---

## 🤖 The AI Agent Workflow

The Python AI Layer utilizes a strict **LangGraph StateGraph** to process databases sequentially through specialized agents:

1.  **Schema Agent:** Connects to the database and extracts structural metadata.
2.  **Relationship Agent:** Infers and maps primary/foreign key constraints.
3.  **Quality Agent:** Runs statistical analysis using Pandas to find anomalies and completeness metrics.
4.  **RAG Agent:** Chunks the discovered schema and builds a searchable ChromaDB index.
5.  **Reasoning Agent:** Synthesizes the findings to generate holistic schema-improvement insights (e.g., Indexing recommendations).
6.  **Visualization Agent:** Prepares chart configurations for the React frontend based on the data profile.

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Python](https://www.python.org/downloads/) (3.9 or higher)
- A [Groq API Key](https://console.groq.com/keys) (Free tier is sufficient)

### 1. Clone & Install Dependencies
The repository utilizes **npm workspaces** to handle the frontend and backend, while automatically creating a Python virtual environment for the AI layer.

```bash
git clone https://github.com/your-username/dbsense-ai.git
cd dbsense-ai

# Installs frontend, backend, and python dependencies in one command
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory.

```bash
cp backend/.env.example .env
```
*(See the [Environment Variables](#️-environment-variables) section below for required keys).*

### 3. Start the Platform
You can spin up all three microservices concurrently with a single command from the root directory:

```bash
npm run dev
```

**Services running:**
- 🖥️ **Frontend UI:** `http://localhost:5173`
- ⚙️ **Backend API Gateway:** `http://localhost:5001`
- 🧠 **AI Layer (FastAPI):** `http://localhost:8000`

---

## ⚙️ Environment Variables

Your `.env` file at the root of the project should look like this:

```env
# -----------------------------
# General Server Configuration
# -----------------------------
PORT=5001
AI_LAYER_URL=http://127.0.0.1:8000

# -----------------------------
# AI Provider Configuration
# -----------------------------
# Required: Get a free key at https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key_here

# (Optional) For Local Privacy-First Inference
USE_LOCAL_LLM=false
CUSTOM_AI_API_URL=http://localhost:11434/v1
CUSTOM_AI_API_KEY=ollama
```

---

## 📁 Repository Structure

```text
DBSense AI
├── ai-layer/                # Python FastAPI AI Microservice
│   ├── agents/              # LangGraph Specialized Agents (Schema, Quality, RAG)
│   ├── ml_router.py         # K-Means clustering & PCA algorithms
│   └── main.py              # FastAPI server entry point
├── backend/                 # Node.js API Gateway
│   ├── config/              # DB configurations
│   ├── routes/              # Express API endpoints
│   └── lib/                 # SQL parsers & DB connectors
├── frontend/                # React + Vite Application
│   ├── src/
│   │   ├── components/      # UI components (Navbar, Modals, Mermaid)
│   │   ├── pages/           # 8+ Complex BI Dashboards
│   │   └── lib/             # State management
├── scripts/                 # Maintenance and patch scripts
└── tests/                   # Test files and experimental suites
```

---

## 🗺️ Roadmap

- [ ] **Data Pipeline Integrations:** Native support for Snowflake, BigQuery, and Redshift.
- [ ] **Automated Remediation:** Allow the AI to directly execute `ALTER TABLE` and `CREATE INDEX` recommendations.
- [ ] **Advanced Timeseries ML:** Add ARIMA/Prophet models for automated forecasting on temporal database columns.

<br/>
<div align="center">
  <i>Built with ❤️ for the future of Data Intelligence</i>
</div>
