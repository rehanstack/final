"""
Master Agent for DBSense AI
Orchestrates the multi-agent workflow for database analysis.
"""

class MasterAgent:
    """
    The master agent coordinates all other agents in the system.
    It manages the workflow, error handling, and result aggregation.
    """
    
    def __init__(self, config=None):
        """Initialize the master agent with configuration."""
        self.config = config or {}
        self.agents = []
        self.workflow_state = {}
        
    def initialize_agents(self):
        """Initialize and register all specialized agents."""
        from .schema_agent import SchemaAgent
        from .relationship_agent import RelationshipAgent
        from .quality_agent import DataQualityAgent
        from .rag_agent import RAGKnowledgeAgent
        from .reasoning_agent import ReasoningAgent
        from .visualization_agent import VisualizationAgent

        rag_agent = RAGKnowledgeAgent()
        self.agents = {
            "schema": SchemaAgent(),
            "relationship": RelationshipAgent(),
            "quality": DataQualityAgent(),
            "rag": rag_agent,
            "reasoning": ReasoningAgent(rag_agent=rag_agent),
            "visualization": VisualizationAgent(),
        }
        self.workflow_state = {"status": "ready", "completed": [], "errors": []}
        return self.agents
    
    def execute_workflow(self, database_connection):
        """
        Execute the complete analysis workflow.
        
        Args:
            database_connection: Connection details to analyze
            
        Returns:
            dict: Aggregated results from all agents
        """
        if not self.agents:
            self.initialize_agents()

        try:
            schema = self.agents["schema"].extract_schema(database_connection)
            self.workflow_state["completed"].append("schema")

            relationships = self.agents["relationship"].discover_foreign_keys(schema)
            relationship_metadata = self.agents["relationship"].generate_relationship_metadata()
            self.workflow_state["completed"].append("relationship")

            self.agents["quality"].schema = schema
            quality = self.agents["quality"].generate_quality_report()
            self.workflow_state["completed"].append("quality")

            chunks = self.agents["rag"].chunk_schema_metadata(schema)
            embedded_chunks = self.agents["rag"].generate_embeddings(chunks)
            rag_index = self.agents["rag"].index_in_chromadb(embedded_chunks)
            self.workflow_state["completed"].append("rag")

            stats = {"schema": schema, "relationships": relationship_metadata, "quality": quality}
            patterns = self.agents["reasoning"].analyze_data_patterns(stats)
            anomaly_insights = self.agents["reasoning"].generate_anomaly_insights(quality["anomalies"])
            self.agents["reasoning"].insights = patterns + anomaly_insights
            report = self.agents["reasoning"].generate_comprehensive_report()
            self.workflow_state["completed"].append("reasoning")

            charts = self.agents["visualization"].generate_chart_configs({
                "schema": schema,
                "relationships": relationship_metadata,
                "quality": quality,
                "insights": report,
            })
            dashboard = self.agents["visualization"].build_dashboard_layout(charts)
            self.workflow_state["completed"].append("visualization")

            self.workflow_state["status"] = "completed"
            return self.aggregate_results({
                "schema": schema,
                "relationships": relationship_metadata,
                "quality": quality,
                "rag": {
                    "index": rag_index,
                    "stats": self.agents["rag"].get_knowledge_base_stats(),
                },
                "insights": report,
                "visualizations": dashboard,
            })
        except Exception as error:
            self.handle_agent_error("workflow", error)
            raise
    
    def handle_agent_error(self, agent_name, error):
        """Handle errors from individual agents gracefully."""
        self.workflow_state.setdefault("errors", []).append({
            "agent": agent_name,
            "error": str(error),
        })
        self.workflow_state["status"] = "failed"
        return self.workflow_state
    
    def aggregate_results(self, results=None):
        """Aggregate and structure results from all agents."""
        results = results or {}
        return {
            "status": self.workflow_state.get("status", "completed"),
            "completed_agents": self.workflow_state.get("completed", []),
            "errors": self.workflow_state.get("errors", []),
            "results": results,
        }
