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
        Falls back to heuristic column name matching if explicit FKs are absent.
        """
        self.relationships = []
        tables = schema.get("tables", {})
        
        # 1. Exact explicit foreign keys
        for table_name, table in tables.items():
            for foreign_key in table.get("foreign_keys", []):
                self.relationships.append({
                    "from_table": table_name,
                    "from_column": foreign_key.get("column"),
                    "to_table": foreign_key.get("references_table"),
                    "to_column": foreign_key.get("references_column"),
                    "cardinality": "many-to-one",
                    "confidence": 0.98,
                })
                
        # 2. Heuristic inference if no explicit FKs
        if not self.relationships:
            for t1_name, t1 in tables.items():
                for c1 in t1.get("columns", []):
                    c1_name = c1.get("name", "").lower()
                    
                    # Look for {table}_id pattern
                    if c1_name.endswith("_id") and len(c1_name) > 3:
                        target_table_base = c1_name[:-3]
                        potential_targets = [target_table_base, target_table_base + "s", target_table_base + "es"]
                        
                        for t2_name, t2 in tables.items():
                            if t1_name == t2_name:
                                continue
                            if t2_name.lower() in potential_targets:
                                t2_cols = [c.get("name", "").lower() for c in t2.get("columns", [])]
                                target_col = "id" if "id" in t2_cols else c1.get("name")
                                if target_col in t2_cols:
                                    self.relationships.append({
                                        "from_table": t1_name,
                                        "from_column": c1.get("name"),
                                        "to_table": t2_name,
                                        "to_column": target_col,
                                        "cardinality": "many-to-one",
                                        "confidence": 0.75,
                                    })
                                    
        # Deduplicate
        seen = set()
        unique_rels = []
        for r in self.relationships:
            k = (r["from_table"], r["from_column"], r["to_table"], r["to_column"])
            if k not in seen:
                seen.add(k)
                unique_rels.append(r)
        self.relationships = unique_rels

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
