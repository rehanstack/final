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
        try:
            if os.environ.get("USE_LOCAL_LLM", "false").lower() == "true":
                from langchain_openai import ChatOpenAI
                from context import request_gateway_url
                gateway_url = os.environ.get("CUSTOM_AI_API_URL")
                user_url = request_gateway_url.get()
                if user_url and (user_url.startswith("https://") or user_url.startswith("http://localhost")):
                    gateway_url = user_url
                self.llm = ChatOpenAI(
                    base_url=gateway_url,
                    api_key=os.environ.get("CUSTOM_AI_API_KEY"),
                    model="qwen3:8b",
                    temperature=0.3, max_tokens=4000
                )
            else:
                self.llm = ChatGroq(model="openai/gpt-oss-20b", api_key=api_key, temperature=0.3, max_tokens=750)
            print("ReasoningAgent initialized with openai/gpt-oss-20b.")
        except Exception:
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
            
            # Extract basic schema overview to give LLM context for business insights
            schema_overview = []
            for table in data_stats.get("schema", {}).get("tables", []):
                t_name = table.get("name", "Unknown")
                cols = [c.get("name") for c in table.get("columns", [])[:5]] if isinstance(table.get("columns"), list) else list(table.get("columns", {}).keys())[:5]
                schema_overview.append(f"{t_name} ({', '.join(cols)})")
            schema_str = "; ".join(schema_overview)
            
            kpis_str = json.dumps(data_stats.get("kpis", []))
            
            prompt = f"""You are an expert Data Analyst and Business Intelligence advisor.
            Analyze these database metrics, schema, and EXACT numeric KPIs to return a JSON payload with actionable recommendations and business implications.
            
            Context:
            - Schema Overview: {schema_str}
            - Quality Score: {score}
            - Relationships Discovered: {rel_count}
            - Top Anomalies/Outliers: {anomalies_str}
            - Computed KPIs: {kpis_str}
            
            Analyze these EXACT numeric KPIs and anomalies. Do NOT invent data. Generate 2-3 realistic "Business Implications" grounded strictly in the provided data.
            
            Output strictly valid JSON:
            {{
               "recommendations": ["Action 1", "Action 2"],
               "business_implications": ["Business Trend 1", "Business Trend 2"]
            }}
            """
            
            import time
            start_time = time.time()
            msg = self.llm.invoke([HumanMessage(content=prompt)])
            latency = int((time.time() - start_time) * 1000)
            
            import re
            if hasattr(msg, 'content'):
                msg.content = re.sub(r'<think>.*?</think>\s*', '', msg.content, flags=re.DOTALL)
                
            provider = "GROQ" if os.environ.get("USE_LOCAL_LLM", "false").lower() != "true" else "OLLAMA (via Gateway)"
            model_name = "qwen/qwen3.6-27b" if provider == "GROQ" else "qwen3:8b"
            print(f"\n[AI PROVIDER] {provider}\n[MODEL] {model_name}\n[STATUS] SUCCESS\n[LATENCY] {latency} ms\n")
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
            
        # Convert business implications into insight objects so they appear in the UI
        business_insights = []
        for i, impl in enumerate(self.business_implications):
            # Try to extract a short title if there is a colon, or just use a generic title
            if ":" in impl:
                title, desc = impl.split(":", 1)
                title = title.strip()
                desc = desc.strip()
            else:
                title = f"Business Trend Insight #{i+1}"
                desc = impl.strip()
                
            business_insights.append({
                "title": title,
                "description": desc,
                "confidence": 90,
                "severity": "info",
                "category": "business"
            })
            
        combined_insights = self.insights + business_insights
            
        return {
            "insights": combined_insights,
            "recommendations": self.recommendations or ["Review high-value outliers.", "Run deduplication."],
            "business_implications": self.business_implications or ["Cleaner records improve retention."],
            "summary": {
                "total_insights": len(combined_insights),
                "critical": sum(1 for item in combined_insights if item.get("severity") == "high"),
            },
        }
