# DBSense AI Setup Instructions

## Quick Start

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```
Runs on `http://localhost:3000`

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```
Runs on `http://localhost:5000`

### 4. Access the Application

Open browser and navigate to: **http://localhost:3000**

## Project Structure

```
dbsense-ai/
├── frontend/           # React + Vite application
├── backend/            # Node.js Express API
├── ai-layer/          # Python mock agent prototype
└── docs/              # Documentation
```

## Pages Available

- **Home** (`/`) - Landing page with features and workflow
- **Upload** (`/upload`) - Database upload interface
- **Processing** (`/processing`) - Animated agent workflow
- **Dashboard** (`/dashboard`) - Analytics and metrics
- **Insights** (`/insights`) - AI-generated insights
- **RAG Knowledge** (`/rag-knowledge`) - RAG pipeline explanation
- **Architecture** (`/architecture`) - System architecture
- **Security** (`/security`) - Enterprise security features

## Backend API Endpoints

- `GET /health` - Health check
- `POST /analyze` - Start database analysis
- `GET /dashboard` - Dashboard data
- `GET /insights` - Insights data
- `GET /rag-knowledge` - RAG knowledge base data
- `GET /status/:jobId` - Processing status

## Technologies

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend:** Node.js, Express, CORS
- **AI:** Python mock agents (Phase 2: LangChain, ChromaDB, Gemini)

## Screenshots for Presentation

Best pages for hackathon PPT:
1. Landing Page - Hero with gradient text
2. Processing Page - Animated 7-agent workflow ⭐
3. Dashboard - Professional charts
4. Architecture - System design
5. Security - Enterprise features

## Important Notes

- **Phase 1 Only**: All data is mocked, no real connections
- **UI Quality**: Production-ready styling throughout
- **Animations**: Smooth Framer Motion animations
- **Responsive**: Mobile-friendly design with Tailwind
- **Professional**: Enterprise SaaS aesthetic

## Next Steps (Phase 2)

When instructed to "START PHASE 2", we will implement:
- Real database connections
- LangChain orchestration
- ChromaDB integration
- Google Gemini API
- Actual data analysis
- Production deployment

**DO NOT implement Phase 2 until explicitly instructed.**

---

For questions or issues, refer to the main README.md
