from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from agents.master_agent import MasterAgent
from dotenv import load_dotenv
import os

env_path = os.path.join(os.path.dirname(__file__), '../.env')
load_dotenv(env_path)

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
        from agents.rag_agent import RAGKnowledgeAgent

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in the AI Layer environment")

        llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=api_key, temperature=0.2)

        # ── Step 1: Real ChromaDB semantic retrieval ──────────────────────────
        rag_agent = RAGKnowledgeAgent()
        retrieved_chunks = rag_agent.query_knowledge_base(request.query or "database schema", top_k=5)

        # ── Step 2: Build context string ──────────────────────────────────────
        # Prefer semantically retrieved chunks; fall back to request-provided schema
        if retrieved_chunks:
            context_str = "\n\n".join(
                [f"{chunk.get('title', 'Chunk')}: {chunk.get('content', '')}" for chunk in retrieved_chunks]
            )
            context_source = "ChromaDB vector search"
        else:
            # ChromaDB is empty (not yet indexed) — fall back to schema context in request body
            schema_context = request.schemaContext or {}
            fallback_tables = schema_context.get("tables", [])
            if fallback_tables:
                context_str = "\n\n".join(
                    [f"{t.get('title', 'Table')}: {t.get('content', '')}" for t in fallback_tables]
                )
                retrieved_chunks = fallback_tables[:5]  # Return up to 5 fallback chunks to frontend
                context_source = "request schema context (vector store not yet indexed)"
            else:
                context_str = "No schema context available."
                context_source = "none"

        # ── Step 3: Build prompt with retrieved context ───────────────────────
        system_prompt = f"""You are an expert Database Architect and Data Analyst assistant.
Use the provided Context (retrieved via {context_source}) to accurately answer the user's questions about their database schema and data.
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

        # ── Step 4: LLM synthesis ─────────────────────────────────────────────
        response = llm.invoke(messages)

        return {
            "success": True,
            "answer": response.content,
            "confidence": 98 if retrieved_chunks and context_source.startswith("ChromaDB") else 90,
            "provider": "FastAPI AI Layer — ChromaDB RAG + llama-3.3-70b-versatile",
            "retrievedChunks": retrieved_chunks,
            "contextSource": context_source,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def chat(request: ChatRequest):
    import os
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, AIMessage

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in the AI Layer environment")

        llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=api_key, temperature=0.3)

        lc_messages = []
        for msg in request.messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))

        if not lc_messages:
            raise HTTPException(status_code=400, detail="No messages provided")

        response = llm.invoke(lc_messages)
        return {
            "success": True,
            "response": response.content,
            "provider": "llama-3.3-70b-versatile",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
