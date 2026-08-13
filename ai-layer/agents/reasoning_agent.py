"""
Reasoning Agent for DBSense AI
Responsible for generating insights and reasoning about the data.
"""

class ReasoningAgent:
    """
    Generates prototype conclusions, recommendations, and predictions.
    Phase 2 can replace the mock reasoning with LangChain and Gemini.
    """
    
    def __init__(self, llm_model=None, rag_agent=None):
        """
        Initialize the reasoning agent.
        
        Args:
            llm_model: Optional mock or future LLM for reasoning
            rag_agent: RAG agent for context retrieval
        """
        self.llm_model = llm_model
        self.rag_agent = rag_agent
        self.insights = []
        
    def analyze_data_patterns(self, data_stats):
        """
        Analyze patterns in the data.
        
        Args:
            data_stats: Statistical information about the data
            
        Returns:
            list: Identified patterns with explanations
        """
        patterns = []
        quality = data_stats.get("quality", {})
        if quality.get("overall_score", 100) < 95:
            patterns.append({
                "title": "Data quality needs attention",
                "description": f"Overall quality score is {quality.get('overall_score')}%.",
                "confidence": 0.89,
                "severity": "warning",
            })
        if data_stats.get("relationships", {}).get("relationship_count", 0) > 0:
            patterns.append({
                "title": "Connected entity graph detected",
                "description": "Foreign key relationships can support grounded cross-table reasoning.",
                "confidence": 0.94,
                "severity": "info",
            })
        return patterns
    
    def generate_anomaly_insights(self, anomalies):
        """Generate insights about detected anomalies."""
        return [
            {
                "title": f"Outlier pattern in {item['table']}.{item['column']}",
                "description": f"{item['count']} records matched {item['rule']}.",
                "confidence": 0.92,
                "severity": item.get("severity", "warning"),
            }
            for item in anomalies
        ]
    
    def reason_with_context(self, question, context):
        """
        Use LLM to reason about a question with retrieved context.
        
        Args:
            question: Question about the database
            context: Retrieved context from RAG
            
        Returns:
            str: Reasoning output with grounding
        """
        if self.llm_model and hasattr(self.llm_model, "generate"):
            return self.llm_model.generate(question=question, context=context)
        joined_context = " ".join(item.get("content", "") for item in context)
        return (
            f"Based on retrieved database context, {question.strip()} "
            f"The strongest supporting evidence is: {joined_context[:240]}"
        )
    
    def generate_recommendations(self):
        """Generate actionable recommendations based on analysis."""
        return [
            "Review high-value order outliers before financial reporting.",
            "Run customer deduplication on email and phone fields.",
            "Add monitoring for nullable status values in orders.",
        ]
    
    def identify_business_implications(self):
        """Identify business implications of discovered patterns."""
        return [
            "Cleaner customer records improve retention and segmentation.",
            "Relationship metadata enables more reliable revenue attribution.",
            "Earlier anomaly detection reduces manual audit effort.",
        ]
    
    def generate_comprehensive_report(self):
        """Generate comprehensive insights report."""
        return {
            "insights": self.insights,
            "recommendations": self.generate_recommendations(),
            "business_implications": self.identify_business_implications(),
            "summary": {
                "total_insights": len(self.insights),
                "critical": sum(1 for item in self.insights if item.get("severity") == "high"),
            },
        }
