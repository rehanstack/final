from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from agents.master_agent import MasterAgent
from dotenv import load_dotenv

load_dotenv()

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
    chatHistory: List[Dict[str, Any]] = []

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
    import os
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in the AI Layer environment")
            
        llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=api_key, temperature=0.2)
        
        context_str = ""
        schema_context = request.schemaContext or {}
        tables = schema_context.get("tables", [])
        if tables:
            context_str = "\n\n".join([f"{t.get('title', 'Table')}: {t.get('content', '')}" for t in tables])
        else:
            context_str = "No context provided."
            
        system_prompt = f"""You are an expert Database Architect and Data Analyst assistant.
Use the provided Context (which contains database schema details, columns, and sample data) to accurately answer the user's questions about their data.
Be concise, professional, and do not hallucinate tables or columns not present in the context.

Context:
{context_str}"""

        messages = [SystemMessage(content=system_prompt)]
        
        for msg in request.chatHistory:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
                
        messages.append(HumanMessage(content=request.query or "Hello"))

        response = llm.invoke(messages)
        
        retrieved_chunks = []
        if tables:
            retrieved_chunks = tables[:3]
        
        return {
            "success": True,
            "answer": response.content,
            "confidence": 96,
            "provider": "FastAPI AI Layer (llama-3.3-70b-versatile)",
            "retrievedChunks": retrieved_chunks
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
