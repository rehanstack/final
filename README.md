# DBSense AI - Autonomous Database Intelligence through Agentic RAG

## 🚀 Phase 1: Hackathon Prototype (Current)

A visually stunning prototype demonstrating an Agentic RAG system for database intelligence.

### ✨ Key Features

- **Multi-Agent Architecture**: 6 specialized AI agents working collaboratively
- **RAG Pipeline**: Retrieval-augmented generation for grounded insights
- **Premium UI**: Enterprise SaaS design with glassmorphism and animations
- **Realistic Workflows**: Complete mock data and hardcoded responses
- **Beautiful Dashboards**: Data quality, relationships, and analytics views

### 📁 Project Structure

```
dbsense-ai/
├── frontend/              # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── pages/        # 8 main pages
│   │   ├── components/   # Reusable components
│   │   └── assets/       # Images and styles
│   ├── package.json
│   └── vite.config.js
│
├── backend/               # Node.js + Express API
│   ├── server.js         # Main server with endpoints
│   └── package.json
│
├── ai-layer/             # Python mock agent prototype
│   ├── agents/           # 6 Agent Definitions
│   │   ├── master_agent.py
│   │   ├── schema_agent.py
│   │   ├── relationship_agent.py
│   │   ├── quality_agent.py
│   │   ├── rag_agent.py
│   │   ├── reasoning_agent.py
│   │   └── visualization_agent.py
│   └── __init__.py
│
├── docs/                 # Documentation
└── README.md
```

### 🎨 Pages Built

1. **Landing Page** - Hero section with features, workflow, and tech stack
2. **Upload Page** - Drag-drop schema upload and sample datasets
3. **Processing Page** - Animated multi-agent workflow (⭐ PPT screenshot gold)
4. **Dashboard** - Professional analytics with charts and metrics
5. **Insights** - AI-generated insights with confidence scores
6. **RAG Knowledge** - RAG pipeline explanation and knowledge chunks
7. **Architecture** - System architecture and data flow
8. **Security** - Enterprise security features and compliance

### 🛠️ Tech Stack

**Frontend:**
- React 18 + Vite (lightning fast)
- Tailwind CSS (responsive design)
- Framer Motion (smooth animations)
- Recharts (beautiful data visualization)
- Lucide Icons (professional iconography)

**Backend:**
- Node.js + Express (RESTful API)
- CORS enabled
- Hardcoded realistic data
- Health check endpoint

**AI Layer:**
- Executable mock Python agent workflow
- Prototype-only outputs for all 6 agents
- Mock schema, relationship, quality, RAG, reasoning, and visualization data
- Ready for Phase 2 LangChain integration

### 🚀 Getting Started

#### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:3000
```

#### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### 📊 Screenshots Priority

Best pages for hackathon PPT:
1. Landing Page Hero
2. Agent Processing Workflow (animated!)
3. Dashboard with charts
4. AI Insights
5. RAG Pipeline
6. Architecture Diagram

### ✅ Phase 1 Complete

- ✓ All 8 pages built with premium UI
- ✓ Animated agent processing workflow
- ✓ Professional dashboard with Recharts
- ✓ Realistic hardcoded data
- ✓ Backend API with mock responses
- ✓ Executable AI agent prototype
- ✓ Enterprise design aesthetic

### 🔄 Next Phase (Awaiting "START PHASE 2")

Phase 2 will implement:
- Real LangChain orchestration
- ChromaDB vector database
- Google Gemini integration
- Actual database analysis
- Real embeddings and retrieval
- Persistent data storage

**⚠️ DO NOT START PHASE 2 until explicitly instructed by user**

### 🎯 Design Principles

- **Dark Mode**: Minimal eye strain, professional aesthetic
- **Glassmorphism**: Modern frosted glass cards with backdrop blur
- **Gradient Text**: Primary purple → secondary cyan → accent pink
- **Smooth Animations**: Framer Motion for delightful interactions
- **Enterprise Grade**: Similar quality to Vercel, Linear, Stripe

### 📝 Notes

- All data is mocked for Phase 1 (no real database connections)
- The Processing page has sequential agent animations
- Charts use sample data from hardcoded arrays
- Security page shows enterprise features (not all implemented)
- All endpoints return realistic JSON responses

### 🎓 For Judges

**What This Demonstrates:**
- Modern full-stack development skills
- UI/UX excellence with animations
- Professional API design
- AI agent framework architecture understanding
- RAG system knowledge

**Screenshot Ready:**
Every page is production-quality for PPT slides.

---

**Built for**: Hackathon Phase 1  
**Status**: 🟢 Complete and Ready for Presentation
