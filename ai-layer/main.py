from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from agents.master_agent import MasterAgent

app = FastAPI(title="DBSense AI Layer API")

class ConnectionConfig(BaseModel):
    dbType: str
    host: str
    dbName: str
    username: str
    password: str
    filename: str = ""

class QueryRequest(BaseModel):
    query: str
    schemaContext: Dict[str, Any] = {}

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AI Layer"}

@app.post("/api/analyze")
def analyze_database(config: ConnectionConfig):
    try:
        agent = MasterAgent()
        results = agent.execute_workflow(config.dict())
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag-query")
def rag_query(request: QueryRequest):
    try:
        from agents.rag_agent import RAGKnowledgeAgent
        rag_agent = RAGKnowledgeAgent()
        # Mock logic, to be updated
        return {
            "success": True,
            "answer": f"RAG analysis for query '{request.query}' based on provided context.",
            "confidence": 95,
            "provider": "FastAPI AI Layer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        # Mock logic, to be updated with Langchain Groq
        return {
            "success": True,
            "response": f"AI Layer Chat Mock Response. Received {len(request.messages)} messages."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
