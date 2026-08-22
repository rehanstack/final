# DBSense AI 🧠📊

Autonomous Database Intelligence platform leveraging Agentic RAG and Machine Learning to provide deep insights, anomaly detection, and natural language querying over your databases.

## 🚀 Architecture

DBSense AI is built using a modern 3-tier microservice architecture:

- **Frontend**: React (Vite) + TailwindCSS + Recharts. Offers 8 distinct dashboards for exploring schema, quality metrics, clustering, and data intelligence.
- **Backend**: Node.js + Express. Acts as an API gateway, securely handling database connections (PostgreSQL, MySQL, SQLite) and file uploads.
- **AI Layer**: Python FastAPI + LangGraph. A multi-agent orchestration system (Schema, Quality, Relationships, RAG, Reasoning, Visualization) powered by Groq (LLaMA 3) or local Ollama instances, with ChromaDB for semantic search.

## 📦 Prerequisites

- Node.js (v18+)
- Python (3.9+)
- Groq API Key (or local Ollama setup)

## 🛠️ Setup & Installation

1. **Install Dependencies**
   The project uses npm workspaces to install frontend and backend dependencies simultaneously.
   ```bash
   npm run install:all
   ```
   *(Note: This command installs npm packages for frontend/backend and sets up a Python virtual environment in `ai-layer/`)*

2. **Environment Variables**
   Create a `.env` file in the root directory based on `.env.example` configurations. You will need at least:
   ```env
   GROQ_API_KEY=your_groq_api_key
   PORT=5001
   AI_LAYER_URL=http://127.0.0.1:8000
   ```

3. **Start the Application**
   You can run all three services concurrently using a single command from the root directory:
   ```bash
   npm run dev
   ```

   This will spin up:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`
   - AI Layer (FastAPI): `http://localhost:8000`

## 🧩 Key Features

- **Agentic RAG Knowledge Base**: Ask natural language questions about your database schema, powered by semantic search (ChromaDB).
- **ML Clustering**: Automatic K-Means clustering and PCA visualization of numerical data, with LLM-generated profiles for each cluster.
- **Data Quality & Anomaly Detection**: Pinpoints missing values, negative values, and statistical outliers down to the exact row and column.
- **Schema & Relationship Mapping**: Auto-discovers foreign keys and suggests schema optimizations (e.g., missing indexes).

## 🗄️ Repository Structure

- `/frontend/` - React application
- `/backend/` - Node.js Express server
- `/ai-layer/` - Python AI microservice (LangGraph, FastAPI)
- `/scripts/` - Assorted helper and patch scripts
- `/tests/` - Test scripts and suites

---
*Built with ❤️ for Database Intelligence*
