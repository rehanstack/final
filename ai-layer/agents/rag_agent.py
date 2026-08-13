"""
RAG Knowledge Agent for DBSense AI
Responsible for building the knowledge base for retrieval-augmented generation.
"""

class RAGKnowledgeAgent:
    """
    Builds and manages a mock knowledge base for RAG.
    Phase 2 can replace the in-memory prototype with ChromaDB.
    """
    
    def __init__(self, embedding_model=None, vector_db=None):
        """
        Initialize the RAG knowledge agent.
        
        Args:
            embedding_model: Model for generating embeddings
            vector_db: Optional future ChromaDB or similar vector database
        """
        self.embedding_model = embedding_model
        self.vector_db = vector_db
        self.chunks = []
        
    def chunk_schema_metadata(self, schema_data):
        """
        Split schema metadata into chunks for embedding.
        
        Args:
            schema_data: Complete schema information
            
        Returns:
            list: Text chunks with metadata
        """
        self.chunks = []
        for table_name, table in schema_data.get("tables", {}).items():
            columns = ", ".join(column["name"] for column in table.get("columns", []))
            self.chunks.append({
                "id": f"schema-{table_name}",
                "title": f"{table_name} schema",
                "content": f"Table {table_name} has columns {columns}.",
                "metadata": {"table": table_name, "kind": "schema"},
            })
            for foreign_key in table.get("foreign_keys", []):
                self.chunks.append({
                    "id": f"relationship-{table_name}-{foreign_key.get('column')}",
                    "title": f"{table_name} relationship",
                    "content": (
                        f"{table_name}.{foreign_key.get('column')} references "
                        f"{foreign_key.get('references_table')}.{foreign_key.get('references_column')}."
                    ),
                    "metadata": {"table": table_name, "kind": "relationship"},
                })
        return self.chunks
    
    def generate_embeddings(self, chunks):
        """
        Generate embeddings for each chunk.
        
        Args:
            chunks: List of text chunks
            
        Returns:
            list: Chunks with embedding vectors
        """
        enriched = []
        for chunk in chunks:
            vector = self._hash_embedding(chunk["content"])
            enriched.append({**chunk, "embedding": vector})
        return enriched
    
    def index_in_chromadb(self, chunks_with_embeddings):
        """Index chunks and embeddings in ChromaDB."""
        self.chunks = chunks_with_embeddings
        if self.vector_db and hasattr(self.vector_db, "add"):
            self.vector_db.add(chunks_with_embeddings)
        return {"indexed": len(chunks_with_embeddings), "backend": "memory"}
    
    def retrieve_similar_chunks(self, query, top_k=5):
        """
        Retrieve most similar chunks for a query.
        
        Args:
            query: User query or question
            top_k: Number of results to return
            
        Returns:
            list: Top-K similar chunks with scores
        """
        query_terms = set(query.lower().split())
        scored = []
        for chunk in self.chunks:
            content_terms = set(chunk["content"].lower().replace(".", "").split())
            overlap = len(query_terms & content_terms)
            score = round(overlap / max(len(query_terms), 1), 2)
            scored.append({**chunk, "score": score})
        return sorted(scored, key=lambda item: item["score"], reverse=True)[:top_k]
    
    def update_knowledge_base(self, new_data):
        """Update the knowledge base with new information."""
        chunks = self.chunk_schema_metadata(new_data)
        enriched = self.generate_embeddings(chunks)
        return self.index_in_chromadb(enriched)
    
    def get_knowledge_base_stats(self):
        """Get statistics about the knowledge base."""
        return {
            "chunks": len(self.chunks),
            "embedding_dimensions": len(self.chunks[0]["embedding"]) if self.chunks else 0,
            "backend": "memory",
        }

    def _hash_embedding(self, text, dimensions=16):
        values = [0.0] * dimensions
        for index, character in enumerate(text.encode("utf-8")):
            values[index % dimensions] += character / 255
        magnitude = sum(value * value for value in values) ** 0.5 or 1
        return [round(value / magnitude, 4) for value in values]
