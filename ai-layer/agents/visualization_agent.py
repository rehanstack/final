"""
Visualization Agent for DBSense AI
Responsible for creating visualizations and dashboards.
"""

class VisualizationAgent:
    """
    Generates chart configurations and dashboard layouts.
    Creates visual representations of analysis results.
    """
    
    def __init__(self):
        """Initialize the visualization agent."""
        self.charts = []
        self.dashboard_config = {}
        
    def generate_chart_configs(self, analysis_results):
        """
        Generate chart configurations for analysis results.
        
        Args:
            analysis_results: Results from analysis
            
        Returns:
            list: Chart configurations (Recharts compatible)
        """
        quality = analysis_results.get("quality", {}).get("tables", {})
        relationships = analysis_results.get("relationships", {}).get("relationships", [])
        anomalies = analysis_results.get("quality", {}).get("anomalies", [])
        self.charts = [
            self.create_quality_chart(quality),
            self.create_relationship_diagram(relationships),
            self.create_anomaly_visualizations(anomalies),
        ]
        return self.charts
    
    def create_quality_chart(self, quality_metrics):
        """Create data quality visualization."""
        return {
            "id": "chart_quality_bar",
            "type": "bar",
            "title": "Data Quality by Table",
            "data": [
                {"name": table, "quality": metrics["score"]}
                for table, metrics in quality_metrics.items()
            ],
        }
    
    def create_relationship_diagram(self, relationships):
        """Create entity relationship diagram."""
        return {
            "id": "chart_rel_diagram",
            "type": "graph",
            "title": "Entity Relationships",
            "nodes": sorted({item["from_table"] for item in relationships} | {item["to_table"] for item in relationships}),
            "edges": relationships,
        }
    
    def create_anomaly_visualizations(self, anomalies):
        """Create visualizations for detected anomalies."""
        return {
            "id": "chart_anomalies_list",
            "type": "list",
            "title": "Detected Anomalies",
            "data": anomalies,
        }
    
    def build_dashboard_layout(self, all_charts):
        """Build optimal dashboard layout with all charts."""
        self.dashboard_config = {
            "layout": "responsive-grid",
            "columns": 2,
            "charts": all_charts,
        }
        return self.dashboard_config
    
    def optimize_for_performance(self):
        """Optimize visualizations for browser performance."""
        return {"max_points_per_chart": 500, "lazy_render": True}
    
    def generate_export_formats(self, format='json'):
        """Generate visualizations in different export formats."""
        if format != "json":
            raise ValueError("Only json export is available in the prototype")
        return {"charts": self.charts, "dashboard": self.dashboard_config}
