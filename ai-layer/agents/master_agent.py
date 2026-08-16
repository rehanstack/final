"""
Master Agent for DBSense AI
Orchestrates the multi-agent workflow for database analysis using LangGraph.
"""

from typing import TypedDict, Dict, Any, List, Optional
from langgraph.graph import StateGraph, START, END

class WorkflowState(TypedDict):
    database_connection: Dict[str, Any]
    schema: Optional[Dict[str, Any]]
    relationship_metadata: Optional[Dict[str, Any]]
    quality: Optional[Dict[str, Any]]
    rag_index: Optional[List[Dict[str, Any]]]
    insights: Optional[Dict[str, Any]]
    visualizations: Optional[Dict[str, Any]]
    completed: List[str]
    errors: List[Dict[str, str]]

class MasterAgent:
    """
    The master agent coordinates all other agents in the system using LangGraph.
    It manages the workflow state, error handling, and result aggregation.
    """
    
    def __init__(self, config=None):
        """Initialize the master agent with configuration."""
        self.config = config or {}
        self.agents = {}
        self.graph = None
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
        
        # Build LangGraph
        workflow = StateGraph(WorkflowState)
        
        # Define Nodes
        workflow.add_node("schema_node", self._schema_step)
        workflow.add_node("relationship_node", self._relationship_step)
        workflow.add_node("quality_node", self._quality_step)
        workflow.add_node("rag_node", self._rag_step)
        workflow.add_node("reasoning_node", self._reasoning_step)
        workflow.add_node("visualization_node", self._visualization_step)
        
        # Define Edges
        workflow.add_edge(START, "schema_node")
        workflow.add_edge("schema_node", "relationship_node")
        workflow.add_edge("relationship_node", "quality_node")
        workflow.add_edge("quality_node", "rag_node")
        workflow.add_edge("rag_node", "reasoning_node")
        workflow.add_edge("reasoning_node", "visualization_node")
        workflow.add_edge("visualization_node", END)
        
        self.graph = workflow.compile()
        return self.agents
        
    def _schema_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(1.5) # Hackathon cinematic pacing
            schema = self.agents["schema"].extract_schema(state["database_connection"])
            state["schema"] = schema
            state["completed"].append("schema")
        except Exception as e:
            state["errors"].append({"agent": "schema", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["schema"] = round(time.time() - start_time, 2)
        return state

    def _relationship_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(1.2) # Hackathon cinematic pacing
            if state.get("schema"):
                self.agents["relationship"].discover_foreign_keys(state["schema"])
                state["relationship_metadata"] = self.agents["relationship"].generate_relationship_metadata()
                state["completed"].append("relationship")
        except Exception as e:
            state["errors"].append({"agent": "relationship", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["relationship"] = round(time.time() - start_time, 2)
        return state

    def _quality_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(2.1) # Hackathon cinematic pacing
            if state.get("schema"):
                self.agents["quality"].schema = state["schema"]
                state["quality"] = self.agents["quality"].generate_quality_report()
                state["completed"].append("quality")
        except Exception as e:
            state["errors"].append({"agent": "quality", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["quality"] = round(time.time() - start_time, 2)
        return state

    def _rag_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(1.8) # Hackathon cinematic pacing
            if state.get("schema"):
                chunks = self.agents["rag"].chunk_schema_metadata(state["schema"])
                embedded_chunks = self.agents["rag"].generate_embeddings(chunks)
                state["rag_index"] = self.agents["rag"].index_in_chromadb(embedded_chunks)
                state["completed"].append("rag")
        except Exception as e:
            state["errors"].append({"agent": "rag", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["rag"] = round(time.time() - start_time, 2)
        return state

    def _reasoning_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(2.5) # Hackathon cinematic pacing
            if state.get("schema"):
                stats = {
                    "schema": state.get("schema", {}), 
                    "relationships": state.get("relationship_metadata", {}), 
                    "quality": state.get("quality", {})
                }
                patterns = self.agents["reasoning"].analyze_data_patterns(stats)
                quality = state.get("quality", {})
                anomaly_insights = self.agents["reasoning"].generate_anomaly_insights(quality.get("anomalies", []))
                self.agents["reasoning"].insights = patterns + anomaly_insights
                state["insights"] = self.agents["reasoning"].generate_comprehensive_report(data_stats=stats)
                state["completed"].append("reasoning")
        except Exception as e:
            state["errors"].append({"agent": "reasoning", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["reasoning"] = round(time.time() - start_time, 2)
        return state

    def _visualization_step(self, state: WorkflowState) -> WorkflowState:
        import time
        start_time = time.time()
        try:
            time.sleep(1.4) # Hackathon cinematic pacing
            if state.get("schema"):
                charts = self.agents["visualization"].generate_chart_configs({
                    "schema": state.get("schema"),
                    "relationships": state.get("relationship_metadata"),
                    "quality": state.get("quality"),
                    "insights": state.get("insights"),
                })
                state["visualizations"] = self.agents["visualization"].build_dashboard_layout(charts)
                state["completed"].append("visualization")
        except Exception as e:
            state["errors"].append({"agent": "visualization", "error": str(e)})
        self.workflow_state.setdefault("agent_times", {})["visualization"] = round(time.time() - start_time, 2)
        return state

    def execute_workflow(self, database_connection):
        """
        Execute the complete analysis workflow using LangGraph.
        """
        if not self.agents:
            self.initialize_agents()

        initial_state = WorkflowState(
            database_connection=database_connection,
            schema=None,
            relationship_metadata=None,
            quality=None,
            rag_index=None,
            insights=None,
            visualizations=None,
            completed=[],
            errors=[]
        )

        try:
            final_state = self.graph.invoke(initial_state)
            
            return self.aggregate_results(final_state)
        except Exception as error:
            self.handle_agent_error("workflow", error)
            raise
            
    def stream_workflow(self, database_connection):
        """
        Execute the complete analysis workflow using LangGraph, streaming updates.
        """
        if not self.agents:
            self.initialize_agents()

        initial_state = WorkflowState(
            database_connection=database_connection,
            schema=None,
            relationship_metadata=None,
            quality=None,
            rag_index=None,
            insights=None,
            visualizations=None,
            completed=[],
            errors=[]
        )

        try:
            for state in self.graph.stream(initial_state, stream_mode="values"):
                completed = state.get("completed", [])
                agent_times = self.workflow_state.get("agent_times", {})
                yield {
                    "type": "progress",
                    "completed_agents": completed,
                    "agent_times": agent_times
                }
            
            # The last state yielded from stream_mode="values" is the final state
            yield {
                "type": "complete",
                "results": self.aggregate_results(state)
            }
            
        except Exception as error:
            self.handle_agent_error("workflow", error)
            yield {
                "type": "error",
                "error": str(error)
            }
    
    def handle_agent_error(self, agent_name, error):
        """Handle errors from individual agents gracefully."""
        self.workflow_state.setdefault("errors", []).append({
            "agent": agent_name,
            "error": str(error),
        })
        self.workflow_state["status"] = "failed"
        return self.workflow_state
    
    def aggregate_results(self, state: WorkflowState):
        """Aggregate and structure results from the LangGraph execution state."""
        return {
            "status": "completed" if not state.get("errors") else "completed_with_errors",
            "completed_agents": state.get("completed", []),
            "errors": state.get("errors", []),
            "agent_times": self.workflow_state.get("agent_times", {}),
            "results": {
                "schema": state.get("schema"),
                "relationships": state.get("relationship_metadata"),
                "quality": state.get("quality"),
                "rag": {
                    "index": state.get("rag_index"),
                    "stats": self.agents["rag"].get_knowledge_base_stats(),
                },
                "insights": state.get("insights"),
                "visualizations": state.get("visualizations"),
            },
        }
