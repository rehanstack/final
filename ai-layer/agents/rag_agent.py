"""
RAG Knowledge Agent for DBSense AI
Responsible for building the knowledge base for retrieval-augmented generation.
"""

import os
from langchain_chroma import Chroma
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_core.documents import Document

class RAGKnowledgeAgent:
    """
    Builds and manages a knowledge base for RAG using ChromaDB and LangChain.
    """
    
    def __init__(self, persist_directory="./chroma_db"):
        self.persist_directory = persist_directory
        self.embeddings = FastEmbedEmbeddings()
        self.vector_store = Chroma(
            collection_name="dbsense_schema",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )
        self.chunks = []
        
    def chunk_schema_metadata(self, schema_data):
        """
        Split schema metadata into chunks for embedding.
        """
        self.chunks = []
        for table_name, table in schema_data.get("tables", {}).items():
            columns = ", ".join(column["name"] for column in table.get("columns", []))
            self.chunks.append(Document(
                page_content=f"Table {table_name} has columns {columns}.",
                metadata={"table": table_name, "kind": "schema", "id": f"schema-{table_name}"}
            ))
            for foreign_key in table.get("foreign_keys", []):
                self.chunks.append(Document(
                    page_content=(
                        f"{table_name}.{foreign_key.get('column')} references "
                        f"{foreign_key.get('references_table')}.{foreign_key.get('references_column')}."
                    ),
                    metadata={"table": table_name, "kind": "relationship", "id": f"relationship-{table_name}-{foreign_key.get('column')}"}
                ))
        return self.chunks
    
    def generate_embeddings(self, chunks):
        # ChromaDB handles this automatically
        return chunks
    
    def index_in_chromadb(self, chunks):
        if chunks:
            self.vector_store.add_documents(chunks)
        return {"indexed": len(chunks), "backend": "chromadb"}
    
    def retrieve_similar_chunks(self, query, top_k=5):
        docs = self.vector_store.similarity_search(query, k=top_k)
        return [{"content": d.page_content, "metadata": d.metadata} for d in docs]
    
    def update_knowledge_base(self, new_data):
        chunks = self.chunk_schema_metadata(new_data)
        return self.index_in_chromadb(chunks)
    
    def get_knowledge_base_stats(self):
        try:
            count = len(self.vector_store.get()["ids"])
        except Exception:
            count = 0
        return {
            "chunks": count,
            "backend": "chromadb"
        }
