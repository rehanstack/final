"""
Reasoning Agent for DBSense AI
Responsible for generating insights and reasoning about the data.
"""
import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

class ReasoningAgent:
    """
    Generates dynamic conclusions, recommendations, and predictions using ChatGroq.
    """
    
    def __init__(self, llm_model=None, rag_agent=None):
        self.rag_agent = rag_agent
        self.insights = []
        self.recommendations = []
        self.business_implications = []
        
        api_key = os.environ.get("GROQ_API_KEY")
        if api_key:
            self.llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=api_key, temperature=0.3)
        else:
            self.llm = None
            
    def analyze_data_patterns(self, data_stats):
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
        return [
            {
                "title": f"Outlier pattern in {item['table']}.{item['column']}",
                "description": f"{item['count']} records matched {item['rule']}.",
                "confidence": 0.92,
                "severity": item.get("severity", "warning"),
            }
            for item in anomalies
        ]
        
    def _generate_dynamic_content(self, data_stats):
        if not self.llm:
            return
            
        try:
            anomalies_str = json.dumps(data_stats.get("quality", {}).get("anomalies", [])[:5])
            rel_count = data_stats.get("relationships", {}).get("relationship_count", 0)
            score = data_stats.get("quality", {}).get("overall_score", 100)
            
            prompt = f"""You are an expert Data Analyst and Business Intelligence advisor.
            Analyze these database metrics and return a JSON payload with actionable recommendations and business implications.
            
            Context:
            - Quality Score: {score}
            - Relationships Discovered: {rel_count}
            - Top Anomalies/Outliers: {anomalies_str}
            
            Output strictly valid JSON:
            {{
               "recommendations": ["Action 1", "Action 2", "Action 3"],
               "business_implications": ["Implication 1", "Implication 2", "Implication 3"]
            }}
            """
            
            msg = self.llm.invoke([HumanMessage(content=prompt)])
            content = msg.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
                
            parsed = json.loads(content)
            self.recommendations = parsed.get("recommendations", [])
            self.business_implications = parsed.get("business_implications", [])
        except Exception as e:
            print("Failed to generate dynamic insights:", e)
            self.recommendations = ["Review identified outliers to ensure data integrity."]
            self.business_implications = ["Improving data quality score will yield more accurate analytics."]

    def generate_comprehensive_report(self, data_stats=None):
        if data_stats:
            self._generate_dynamic_content(data_stats)
            
        return {
            "insights": self.insights,
            "recommendations": self.recommendations or ["Review high-value outliers.", "Run deduplication."],
            "business_implications": self.business_implications or ["Cleaner records improve retention."],
            "summary": {
                "total_insights": len(self.insights),
                "critical": sum(1 for item in self.insights if item.get("severity") == "high"),
            },
        }
