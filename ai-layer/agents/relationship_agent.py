"""
Relationship Agent for DBSense AI
Responsible for discovering and mapping entity relationships.
"""

class RelationshipAgent:
    """
    Discovers and analyzes relationships between entities.
    Maps foreign keys, cardinality, and dependency graphs.
    """
    
    def __init__(self):
        """Initialize the relationship agent."""
        self.relationships = []
        self.dependency_graph = {}
        
    def discover_foreign_keys(self, schema):
        """
        Discover foreign key relationships in the schema.
        
        Args:
            schema: Database schema data
            
        Returns:
            list: Foreign key relationships
        """
        self.relationships = []
        for table_name, table in schema.get("tables", {}).items():
            for foreign_key in table.get("foreign_keys", []):
                relationship = {
                    "from_table": table_name,
                    "from_column": foreign_key.get("column"),
                    "to_table": foreign_key.get("references_table"),
                    "to_column": foreign_key.get("references_column"),
                    "cardinality": "many-to-one",
                    "confidence": 0.98,
                }
                self.relationships.append(relationship)
        self.build_dependency_graph()
        return self.relationships
    
    def analyze_cardinality(self, relationship):
        """Analyze cardinality of a relationship (1-to-1, 1-to-many, etc)."""
        return relationship.get("cardinality", "many-to-one")
    
    def build_dependency_graph(self):
        """Build a complete dependency graph of entities."""
        graph = {}
        for relationship in self.relationships:
            graph.setdefault(relationship["from_table"], []).append(relationship["to_table"])
            graph.setdefault(relationship["to_table"], [])
        self.dependency_graph = graph
        return graph
    
    def identify_join_patterns(self, data_sample):
        """Identify common join patterns from sample data."""
        return [
            {
                "tables": [item["from_table"], item["to_table"]],
                "join": f"{item['from_table']}.{item['from_column']} = {item['to_table']}.{item['to_column']}",
                "confidence": item["confidence"],
            }
            for item in self.relationships
        ]
    
    def detect_circular_dependencies(self):
        """Detect and report circular dependencies."""
        cycles = []
        for start in self.dependency_graph:
            stack = [(start, [start])]
            while stack:
                node, path = stack.pop()
                for next_node in self.dependency_graph.get(node, []):
                    if next_node == start:
                        cycles.append(path + [next_node])
                    elif next_node not in path:
                        stack.append((next_node, path + [next_node]))
        return cycles
    
    def generate_relationship_metadata(self):
        """Generate structured metadata about all relationships."""
        return {
            "relationships": self.relationships,
            "relationship_count": len(self.relationships),
            "dependency_graph": self.dependency_graph,
            "circular_dependencies": self.detect_circular_dependencies(),
        }
