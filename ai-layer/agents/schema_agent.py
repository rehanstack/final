"""
Schema Agent for DBSense AI
Responsible for extracting and analyzing database schema.
"""

class SchemaAgent:
    """
    Analyzes database schema structure.
    Extracts table definitions, columns, constraints, and data types.
    """
    
    def __init__(self):
        """Initialize the schema agent."""
        self.schema_data = {}
        self.database_connection = {}
        
    def extract_schema(self, database_connection):
        """
        Extract complete database schema.
        
        Args:
            database_connection: Connection to analyze
            
        Returns:
            dict: Complete schema structure
        """
        self.database_connection = database_connection or {}
        tables = self.database_connection.get("tables") or self._sample_tables()

        self.schema_data = {
            "tables": {
                table["name"]: self.analyze_table(table["name"])
                for table in tables
            },
            "table_count": len(tables),
            "column_count": sum(len(table.get("columns", [])) for table in tables),
            "constraints": self.identify_constraints(),
            "indexes": self.database_connection.get("indexes", []),
            "source": self.database_connection.get("name", "demo-database"),
        }
        return self.schema_data
    
    def analyze_table(self, table_name):
        """Analyze a specific table's schema."""
        table = self._find_table(table_name)
        columns = self.extract_column_metadata(table_name)
        return {
            "name": table_name,
            "columns": columns,
            "primary_key": table.get("primary_key"),
            "foreign_keys": table.get("foreign_keys", []),
            "row_count": table.get("row_count", 0),
            "size": table.get("size", "unknown"),
        }
    
    def extract_column_metadata(self, table_name):
        """Extract metadata for all columns in a table."""
        table = self._find_table(table_name)
        return [
            {
                "name": column.get("name"),
                "type": column.get("type", "unknown"),
                "nullable": column.get("nullable", True),
                "unique": column.get("unique", False),
            }
            for column in table.get("columns", [])
        ]
    
    def identify_constraints(self):
        """Identify all constraints in the schema."""
        constraints = []
        for table in self.database_connection.get("tables", self._sample_tables()):
            if table.get("primary_key"):
                constraints.append({
                    "table": table["name"],
                    "type": "primary_key",
                    "columns": [table["primary_key"]],
                })
            for foreign_key in table.get("foreign_keys", []):
                constraints.append({
                    "table": table["name"],
                    "type": "foreign_key",
                    **foreign_key,
                })
        return constraints
    
    def format_schema_metadata(self):
        """Format schema data for chunking and embedding."""
        if not self.schema_data:
            self.extract_schema(self.database_connection)

        chunks = []
        for table in self.schema_data["tables"].values():
            columns = ", ".join(
                f"{column['name']} {column['type']}" for column in table["columns"]
            )
            chunks.append({
                "title": f"{table['name']} table schema",
                "content": f"{table['name']}({columns})",
                "metadata": {"table": table["name"], "kind": "schema"},
            })
        return chunks

    def _find_table(self, table_name):
        for table in self.database_connection.get("tables", self._sample_tables()):
            if table.get("name") == table_name:
                return table
        return {"name": table_name, "columns": []}

    def _sample_tables(self):
        return [
            {
                "name": "customers",
                "primary_key": "id",
                "row_count": 450000,
                "size": "8.5GB",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "unique": True},
                    {"name": "email", "type": "VARCHAR", "nullable": False, "unique": True},
                    {"name": "created_at", "type": "TIMESTAMP", "nullable": False},
                ],
            },
            {
                "name": "orders",
                "primary_key": "id",
                "row_count": 2840000,
                "size": "12GB",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "unique": True},
                    {"name": "customer_id", "type": "UUID", "nullable": False},
                    {"name": "total_amount", "type": "DECIMAL", "nullable": False},
                    {"name": "status", "type": "VARCHAR", "nullable": True},
                ],
                "foreign_keys": [
                    {
                        "column": "customer_id",
                        "references_table": "customers",
                        "references_column": "id",
                    }
                ],
            },
            {
                "name": "payments",
                "primary_key": "id",
                "row_count": 2700000,
                "size": "6.8GB",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "unique": True},
                    {"name": "order_id", "type": "UUID", "nullable": False},
                    {"name": "amount", "type": "DECIMAL", "nullable": False},
                ],
                "foreign_keys": [
                    {
                        "column": "order_id",
                        "references_table": "orders",
                        "references_column": "id",
                    }
                ],
            },
        ]
